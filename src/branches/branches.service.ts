import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantContext, TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listForContext(context: TenantContext) {
    return this.prisma.branch.findMany({
      where: {
        businessId: context.businessId,
        isActive: true,
        branchMembers: { some: { businessMemberId: context.businessMemberId } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async list(user: AccessTokenPayload) {
    const context = this.tenant.requireBusiness(user);
    return this.listForContext(context);
  }

  async create(user: AccessTokenPayload, dto: CreateBranchDto) {
    const context = this.tenant.requireBusiness(user);
    const subscription = await this.prisma.businessSubscription.findFirst({
      where: { businessId: context.businessId, status: { in: ['TRIALING', 'ACTIVE'] } },
      include: { subscriptionPlan: true },
      orderBy: { createdAt: 'desc' },
    });
    const branchCount = await this.prisma.branch.count({
      where: { businessId: context.businessId, isActive: true },
    });
    if (subscription && branchCount >= subscription.subscriptionPlan.maximumBranches) {
      throw new BadRequestException({
        code: 'SUBSCRIPTION_BRANCH_LIMIT_REACHED',
        message: 'Subscription branch limit reached',
      });
    }
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: context.businessId },
    });
    const branch = await this.prisma.branch.create({
      data: {
        businessId: context.businessId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        phone: dto.phone,
        email: dto.email,
        countryCode: business.countryCode,
        timezone: business.timezone,
      },
    });
    await this.prisma.branchMember.create({
      data: { businessMemberId: context.businessMemberId, branchId: branch.id },
    });
    await this.auditLogs.create({
      businessId: context.businessId,
      branchId: branch.id,
      userId: context.userId,
      action: 'branch.created',
      entityType: 'Branch',
      entityId: branch.id,
      newValues: { name: branch.name, code: branch.code },
    });
    return branch;
  }

  async update(user: AccessTokenPayload, id: string, dto: UpdateBranchDto) {
    const context = this.tenant.requireBusiness(user);
    const previous = await this.prisma.branch.findFirst({
      where: { id, businessId: context.businessId },
    });
    if (!previous)
      throw new NotFoundException({ code: 'BRANCH_NOT_FOUND', message: 'Branch not found' });
    const branch = await this.prisma.branch.update({
      where: { id },
      data: { ...dto, code: dto.code?.toUpperCase() },
    });
    await this.auditLogs.create({
      businessId: context.businessId,
      branchId: branch.id,
      userId: context.userId,
      action: 'branch.updated',
      entityType: 'Branch',
      entityId: branch.id,
      previousValues: previous,
      newValues: dto,
    });
    return branch;
  }
}
