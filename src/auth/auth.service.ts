import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BusinessRole, User } from '@prisma/client';
import argon2 from 'argon2';
import { randomBytes, randomUUID, createHash } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { CountriesService } from '../countries/countries.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BusinessesService } from '../businesses/businesses.service';
import { UsersService } from '../users/users.service';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { LoginDto } from './dto/login.dto';
import { AccessTokenPayload } from '../common/types/authenticated-request';

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly countries: CountriesService,
    private readonly subscriptions: SubscriptionsService,
    private readonly auditLogs: AuditLogsService,
    private readonly businesses: BusinessesService,
    private readonly users: UsersService,
  ) {}

  async registerBusiness(dto: RegisterBusinessDto, meta: RequestMeta) {
    const email = this.users.normalizeEmail(dto.email);
    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing) {
        throw new BadRequestException({
          code: 'AUTH_EMAIL_REGISTERED',
          message: 'Email is already registered',
        });
      }
      const country = await tx.countryConfig.findUnique({
        where: { countryCode: dto.countryCode },
      });
      if (!country?.isActive) {
        throw new BadRequestException({
          code: 'COUNTRY_UNSUPPORTED',
          message: 'Unsupported country',
        });
      }
      const plan = await this.subscriptions.getDefaultPlan(country.currencyCode, tx);
      const passwordHash = await argon2.hash(dto.password);
      const user = await tx.user.create({
        data: { fullName: dto.ownerName, email, phone: dto.phone, passwordHash },
      });
      const business = await tx.business.create({
        data: {
          name: dto.businessName,
          businessType: dto.businessType,
          countryCode: country.countryCode,
          currencyCode: country.currencyCode,
          timezone: country.timezone,
          subscriptionPlanId: plan.id,
        },
      });
      const branch = await tx.branch.create({
        data: {
          businessId: business.id,
          name: dto.branchName,
          code: dto.branchCode.toUpperCase(),
          countryCode: country.countryCode,
          timezone: country.timezone,
        },
      });
      const member = await tx.businessMember.create({
        data: { userId: user.id, businessId: business.id, role: 'OWNER' },
      });
      await tx.branchMember.create({ data: { businessMemberId: member.id, branchId: branch.id } });
      const now = new Date();
      await tx.businessSubscription.create({
        data: {
          businessId: business.id,
          subscriptionPlanId: plan.id,
          status: 'TRIALING',
          startsAt: now,
          trialEndsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
          currentPeriodStartsAt: now,
          currentPeriodEndsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      await this.auditLogs.create(
        {
          businessId: business.id,
          branchId: branch.id,
          userId: user.id,
          action: 'business.registered',
          entityType: 'Business',
          entityId: business.id,
          newValues: { businessName: business.name, role: 'OWNER' },
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
        },
        tx,
      );
      return {
        user,
        tenant: {
          businessMemberId: member.id,
          businessId: business.id,
          branchId: branch.id,
          businessRole: member.role,
        },
      };
    });
    return this.issueAuthResponse(result.user, meta, result.tenant);
  }

  async login(dto: LoginDto, meta: RequestMeta) {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueAuthResponse(user, meta);
  }

  async refresh(rawToken: string, meta: RequestMeta) {
    const tokenHash = this.sha256(rawToken);
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });
    if (!existing || existing.expiresAt <= new Date()) {
      throw new UnauthorizedException({
        code: 'AUTH_REFRESH_INVALID',
        message: 'Invalid refresh token',
      });
    }
    if (existing.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date(), revokedByIp: meta.ip },
      });
      throw new UnauthorizedException({
        code: 'AUTH_REFRESH_REUSED',
        message: 'Refresh token reuse detected',
      });
    }
    const replacement = this.generateRawToken();
    const created = await this.prisma.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: this.sha256(replacement),
        familyId: existing.familyId,
        expiresAt: this.refreshExpiry(),
        createdByIp: meta.ip,
        userAgent: meta.userAgent,
      },
    });
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), revokedByIp: meta.ip, replacedByTokenId: created.id },
    });
    return {
      accessToken: this.signAccessToken(existing.user),
      refreshToken: replacement,
    };
  }

  async logout(rawToken: string, meta: RequestMeta) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.sha256(rawToken), revokedAt: null },
      data: { revokedAt: new Date(), revokedByIp: meta.ip },
    });
    return { loggedOut: true };
  }

  async logoutAll(userId: string, meta: RequestMeta) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedByIp: meta.ip },
    });
    return { loggedOut: true };
  }

  async me(userId: string) {
    return this.users.findSafeById(userId);
  }

  async listBusinesses(userId: string) {
    return this.businesses.listForUser(userId);
  }

  async selectBusiness(userId: string, businessId: string) {
    const member = await this.prisma.businessMember.findFirst({
      where: { userId, businessId, status: 'ACTIVE', business: { isActive: true } },
      include: { user: true },
    });
    if (!member)
      throw new ForbiddenException({
        code: 'BUSINESS_FORBIDDEN',
        message: 'Business is not available',
      });
    return {
      accessToken: this.signAccessToken(member.user, {
        businessMemberId: member.id,
        businessId: member.businessId,
        businessRole: member.role,
      }),
    };
  }

  async selectBranch(user: AccessTokenPayload, branchId: string) {
    if (!user.businessId || !user.businessMemberId) {
      throw new ForbiddenException({
        code: 'TENANT_CONTEXT_REQUIRED',
        message: 'Select an active business first',
      });
    }
    const branchMember = await this.prisma.branchMember.findFirst({
      where: {
        branchId,
        businessMemberId: user.businessMemberId,
        branch: { businessId: user.businessId, isActive: true },
      },
      include: { businessMember: { include: { user: true } } },
    });
    if (!branchMember)
      throw new ForbiddenException({
        code: 'BRANCH_FORBIDDEN',
        message: 'Branch is not available',
      });
    return {
      accessToken: this.signAccessToken(branchMember.businessMember.user, {
        businessMemberId: user.businessMemberId,
        businessId: user.businessId,
        branchId,
        businessRole: user.businessRole as BusinessRole,
      }),
    };
  }

  private async issueAuthResponse(
    user: User,
    meta: RequestMeta,
    tenant?: Partial<
      Pick<AccessTokenPayload, 'businessMemberId' | 'businessId' | 'branchId' | 'businessRole'>
    >,
  ) {
    const rawRefreshToken = this.generateRawToken();
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.sha256(rawRefreshToken),
        familyId: randomUUID(),
        expiresAt: this.refreshExpiry(),
        createdByIp: meta.ip,
        userAgent: meta.userAgent,
      },
    });
    return {
      user: this.users.toSafeUser(user),
      accessToken: this.signAccessToken(user, tenant),
      refreshToken: rawRefreshToken,
    };
  }

  private signAccessToken(user: User, tenant?: Partial<AccessTokenPayload>) {
    const payload: AccessTokenPayload = {
      sub: user.id,
      platformRole: user.platformRole,
      ...tenant,
    };
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: this.config.getOrThrow<string>('jwt.accessExpiresIn'),
    });
  }

  private generateRawToken() {
    return randomBytes(48).toString('base64url');
  }

  private sha256(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private refreshExpiry() {
    const days = Number.parseInt(this.config.getOrThrow<string>('jwt.refreshExpiresIn'), 10);
    const fallbackDays = Number.isFinite(days) ? days : 30;
    return new Date(Date.now() + fallbackDays * 24 * 60 * 60 * 1000);
  }
}
