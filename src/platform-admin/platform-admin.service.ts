import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PlatformRole } from '@prisma/client';
import argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UsersService } from '../users/users.service';
import {
  CreateSubscriptionPlanDto,
  CreateSuperAdminDto,
  PlatformListQueryDto,
  UpdateCountryConfigDto,
  UpdatePlatformUserDto,
  UpdateSubscriptionPlanDto,
} from './dto/platform-admin.dto';
import { decimal } from '../common/utils/decimal.util';

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  async createInitialSuperAdmin(dto: CreateSuperAdminDto) {
    if (!this.config.get<boolean>('platform.bootstrapEnabled')) {
      throw new ForbiddenException({
        code: 'PLATFORM_BOOTSTRAP_DISABLED',
        message: 'Super admin bootstrap endpoint is disabled',
      });
    }
    const existingSuperAdmin = await this.prisma.user.count({
      where: { platformRole: PlatformRole.SUPER_ADMIN, isActive: true },
    });
    if (existingSuperAdmin > 0) {
      throw new ForbiddenException({
        code: 'SUPER_ADMIN_BOOTSTRAP_CLOSED',
        message: 'A super admin already exists',
      });
    }
    const email = this.users.normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException({
        code: 'AUTH_EMAIL_REGISTERED',
        message: 'Email is already registered',
      });
    }
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email,
        passwordHash: await argon2.hash(dto.password),
        platformRole: PlatformRole.SUPER_ADMIN,
      },
    });
    await this.auditLogs.create({
      userId: user.id,
      action: 'platform.super_admin_created',
      entityType: 'User',
      entityId: user.id,
      newValues: { email: user.email, platformRole: user.platformRole },
    });
    return this.users.toSafeUser(user);
  }

  async listBusinesses(query: PlatformListQueryDto) {
    const where: Prisma.BusinessWhereInput = query.search
      ? { name: { contains: query.search, mode: 'insensitive' } }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.business.findMany({
        where,
        include: {
          _count: { select: { members: true, branches: true } },
          subscriptions: {
            include: { subscriptionPlan: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: this.skip(query),
        take: query.limit,
      }),
      this.prisma.business.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async getBusiness(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        branches: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                platformRole: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        subscriptions: { include: { subscriptionPlan: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!business)
      throw new NotFoundException({ code: 'BUSINESS_NOT_FOUND', message: 'Business not found' });
    return business;
  }

  async setBusinessActive(actorUserId: string, businessId: string, isActive: boolean) {
    const previous = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!previous)
      throw new NotFoundException({ code: 'BUSINESS_NOT_FOUND', message: 'Business not found' });
    const business = await this.prisma.business.update({
      where: { id: businessId },
      data: { isActive },
    });
    await this.auditLogs.create({
      businessId,
      userId: actorUserId,
      action: isActive ? 'platform.business_reactivated' : 'platform.business_suspended',
      entityType: 'Business',
      entityId: businessId,
      previousValues: { isActive: previous.isActive },
      newValues: { isActive },
    });
    return business;
  }

  async listUsers(query: PlatformListQueryDto) {
    const where: Prisma.UserWhereInput = query.search
      ? {
          OR: [
            { email: { contains: query.search, mode: 'insensitive' } },
            { fullName: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          platformRole: true,
          isActive: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { memberships: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: this.skip(query),
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async updateUser(actorUserId: string, userId: string, dto: UpdatePlatformUserDto) {
    if (actorUserId === userId && dto.isActive === false) {
      throw new ForbiddenException({
        code: 'PLATFORM_SELF_DISABLE_FORBIDDEN',
        message: 'Super admin cannot disable their own account',
      });
    }
    const previous = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!previous)
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    const user = await this.prisma.user.update({ where: { id: userId }, data: dto });
    await this.auditLogs.create({
      userId: actorUserId,
      action: 'platform.user_updated',
      entityType: 'User',
      entityId: userId,
      previousValues: { platformRole: previous.platformRole, isActive: previous.isActive },
      newValues: dto,
    });
    return this.users.toSafeUser(user);
  }

  listSubscriptionPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: [{ currencyCode: 'asc' }, { monthlyPrice: 'asc' }],
    });
  }

  async createSubscriptionPlan(actorUserId: string, dto: CreateSubscriptionPlanDto) {
    const plan = await this.prisma.subscriptionPlan.create({
      data: this.createPlanData(dto),
    });
    await this.auditLogs.create({
      userId: actorUserId,
      action: 'platform.subscription_plan_created',
      entityType: 'SubscriptionPlan',
      entityId: plan.id,
      newValues: { code: plan.code, currencyCode: plan.currencyCode },
    });
    return plan;
  }

  async updateSubscriptionPlan(actorUserId: string, id: string, dto: UpdateSubscriptionPlanDto) {
    const previous = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!previous) {
      throw new NotFoundException({
        code: 'SUBSCRIPTION_PLAN_NOT_FOUND',
        message: 'Subscription plan not found',
      });
    }
    const plan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: this.updatePlanData(dto),
    });
    await this.auditLogs.create({
      userId: actorUserId,
      action: 'platform.subscription_plan_updated',
      entityType: 'SubscriptionPlan',
      entityId: id,
      previousValues: previous,
      newValues: dto,
    });
    return plan;
  }

  listCountries() {
    return this.prisma.countryConfig.findMany({ orderBy: { countryCode: 'asc' } });
  }

  async updateCountry(actorUserId: string, id: string, dto: UpdateCountryConfigDto) {
    const previous = await this.prisma.countryConfig.findUnique({ where: { id } });
    if (!previous)
      throw new NotFoundException({
        code: 'COUNTRY_NOT_FOUND',
        message: 'Country config not found',
      });
    const country = await this.prisma.countryConfig.update({ where: { id }, data: dto });
    await this.auditLogs.create({
      userId: actorUserId,
      action: 'platform.country_updated',
      entityType: 'CountryConfig',
      entityId: id,
      previousValues: previous,
      newValues: dto,
    });
    return country;
  }

  async listAuditLogs(query: PlatformListQueryDto) {
    const where: Prisma.AuditLogWhereInput = query.search
      ? {
          OR: [
            { action: { contains: query.search, mode: 'insensitive' } },
            { entityType: { contains: query.search, mode: 'insensitive' } },
            { entityId: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true, platformRole: true } },
          business: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: this.skip(query),
        take: query.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  private createPlanData(dto: CreateSubscriptionPlanDto) {
    return {
      ...dto,
      code: dto.code.toUpperCase(),
      currencyCode: dto.currencyCode.toUpperCase(),
      monthlyPrice: decimal(dto.monthlyPrice, 'monthlyPrice'),
      yearlyPrice: decimal(dto.yearlyPrice, 'yearlyPrice'),
    };
  }

  private updatePlanData(dto: UpdateSubscriptionPlanDto) {
    return {
      ...dto,
      code: dto.code?.toUpperCase(),
      currencyCode: dto.currencyCode?.toUpperCase(),
      monthlyPrice: dto.monthlyPrice ? decimal(dto.monthlyPrice, 'monthlyPrice') : undefined,
      yearlyPrice: dto.yearlyPrice ? decimal(dto.yearlyPrice, 'yearlyPrice') : undefined,
    };
  }

  private skip(query: PlatformListQueryDto) {
    return (query.page - 1) * query.limit;
  }
}
