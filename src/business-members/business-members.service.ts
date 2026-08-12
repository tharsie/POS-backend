import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { UpdateStaffRoleDto } from './dto/staff.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class BusinessMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  list(user: AccessTokenPayload) {
    const context = this.tenant.requireBusiness(user);
    return this.prisma.businessMember.findMany({
      where: { businessId: context.businessId },
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
        branchMembers: { include: { branch: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(user: AccessTokenPayload, memberId: string, dto: UpdateStaffRoleDto) {
    const context = this.tenant.requireBusiness(user);
    if (memberId === context.businessMemberId && dto.role !== BusinessRole.OWNER) {
      throw new ForbiddenException({
        code: 'STAFF_SELF_DEMOTE_FORBIDDEN',
        message: 'Owner cannot self-demote',
      });
    }
    const member = await this.prisma.businessMember.findFirst({
      where: { id: memberId, businessId: context.businessId },
    });
    if (!member)
      throw new NotFoundException({ code: 'STAFF_NOT_FOUND', message: 'Staff member not found' });
    if (dto.branchIds?.length) {
      const branchCount = await this.prisma.branch.count({
        where: { id: { in: dto.branchIds }, businessId: context.businessId, isActive: true },
      });
      if (branchCount !== new Set(dto.branchIds).size) {
        throw new BadRequestException({
          code: 'BRANCH_INVALID',
          message: 'One or more branches are invalid',
        });
      }
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.businessMember.update({
        where: { id: memberId },
        data: { role: dto.role },
      });
      if (dto.branchIds) {
        await tx.branchMember.deleteMany({ where: { businessMemberId: memberId } });
        await tx.branchMember.createMany({
          data: dto.branchIds.map((branchId) => ({ businessMemberId: memberId, branchId })),
          skipDuplicates: true,
        });
      }
      await this.auditLogs.create(
        {
          businessId: context.businessId,
          userId: context.userId,
          action: 'staff.updated',
          entityType: 'BusinessMember',
          entityId: memberId,
          previousValues: { role: member.role },
          newValues: dto,
        },
        tx,
      );
      return updated;
    });
  }

  async suspend(user: AccessTokenPayload, memberId: string) {
    const context = this.tenant.requireBusiness(user);
    if (memberId === context.businessMemberId) {
      throw new ForbiddenException({
        code: 'STAFF_SELF_SUSPEND_FORBIDDEN',
        message: 'Cannot suspend yourself',
      });
    }
    const member = await this.prisma.businessMember.findFirst({
      where: { id: memberId, businessId: context.businessId },
    });
    if (!member)
      throw new NotFoundException({ code: 'STAFF_NOT_FOUND', message: 'Staff member not found' });
    const updated = await this.prisma.businessMember.update({
      where: { id: memberId },
      data: { status: 'SUSPENDED' },
    });
    await this.auditLogs.create({
      businessId: context.businessId,
      userId: context.userId,
      action: 'staff.suspended',
      entityType: 'BusinessMember',
      entityId: memberId,
      previousValues: { status: member.status },
      newValues: { status: 'SUSPENDED' },
    });
    return updated;
  }
}
