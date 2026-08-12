import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UsersService } from '../users/users.service';

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly subscriptions: SubscriptionsService,
    private readonly auditLogs: AuditLogsService,
    private readonly config: ConfigService,
    private readonly users: UsersService,
  ) {}

  async inviteStaff(user: AccessTokenPayload, dto: InviteStaffDto, meta: RequestMeta) {
    const context = this.tenant.requireBusiness(user);
    await this.subscriptions.assertUserLimit(context.businessId);
    const branchCount = await this.prisma.branch.count({
      where: { businessId: context.businessId, id: { in: dto.branchIds }, isActive: true },
    });
    if (branchCount !== new Set(dto.branchIds).size) {
      throw new ForbiddenException({
        code: 'BRANCH_FORBIDDEN',
        message: 'One or more branches are invalid',
      });
    }
    const email = this.users.normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await this.prisma.businessMember.findUnique({
        where: { userId_businessId: { userId: existingUser.id, businessId: context.businessId } },
      });
      if (existingMember?.status === 'ACTIVE') {
        throw new BadRequestException({
          code: 'STAFF_ALREADY_MEMBER',
          message: 'User is already a member',
        });
      }
    }
    const rawToken = randomBytes(32).toString('base64url');
    const invitation = await this.prisma.userInvitation.create({
      data: {
        businessId: context.businessId,
        email,
        fullName: dto.fullName,
        role: dto.role,
        tokenHash: this.sha256(rawToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdByUserId: context.userId,
        branches: { createMany: { data: dto.branchIds.map((branchId) => ({ branchId })) } },
      },
    });
    await this.auditLogs.create({
      businessId: context.businessId,
      userId: context.userId,
      action: 'staff.invited',
      entityType: 'UserInvitation',
      entityId: invitation.id,
      newValues: { email, role: dto.role, branchCount: dto.branchIds.length },
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return {
      invitationId: invitation.id,
      expiresAt: invitation.expiresAt,
      invitationUrl: `${this.config.getOrThrow<string>('app.frontendUrl')}/invitations/${rawToken}`,
    };
  }

  async accept(rawToken: string, dto: AcceptInvitationDto) {
    const tokenHash = this.sha256(rawToken);
    const email = this.users.normalizeEmail(dto.email);
    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.userInvitation.findFirst({
        where: {
          tokenHash,
          email,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: { branches: true },
      });
      if (!invitation) {
        throw new BadRequestException({
          code: 'INVITATION_INVALID',
          message: 'Invitation is invalid or expired',
        });
      }
      let user = await tx.user.findUnique({ where: { email } });
      if (!user) {
        if (!dto.password) {
          throw new BadRequestException({
            code: 'INVITATION_PASSWORD_REQUIRED',
            message: 'Password is required',
          });
        }
        user = await tx.user.create({
          data: {
            email,
            fullName: dto.fullName ?? invitation.fullName ?? email,
            passwordHash: await argon2.hash(dto.password),
          },
        });
      }
      const existingMember = await tx.businessMember.findUnique({
        where: { userId_businessId: { userId: user.id, businessId: invitation.businessId } },
      });
      if (existingMember?.status === 'ACTIVE') {
        throw new BadRequestException({
          code: 'STAFF_ALREADY_MEMBER',
          message: 'User is already a member',
        });
      }
      let member = existingMember;
      if (!member) {
        member = await tx.businessMember.create({
          data: { userId: user.id, businessId: invitation.businessId, role: invitation.role },
        });
      } else {
        await tx.businessMember.update({
          where: { id: member.id },
          data: { status: 'ACTIVE', role: invitation.role },
        });
      }
      for (const branch of invitation.branches) {
        await tx.branchMember.upsert({
          where: {
            businessMemberId_branchId: { businessMemberId: member.id, branchId: branch.branchId },
          },
          update: {},
          create: { businessMemberId: member.id, branchId: branch.branchId },
        });
      }
      await tx.userInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      await this.auditLogs.create(
        {
          businessId: invitation.businessId,
          userId: user.id,
          action: 'staff.invitation_accepted',
          entityType: 'BusinessMember',
          entityId: member.id,
          newValues: { role: invitation.role },
        },
        tx,
      );
      return { accepted: true, businessId: invitation.businessId };
    });
  }

  private sha256(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
