import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { UpdateBusinessDto } from './dto/business.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class BusinessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listForUser(userId: string) {
    return this.prisma.businessMember.findMany({
      where: { userId, status: 'ACTIVE', business: { isActive: true } },
      include: { business: true, branchMembers: { include: { branch: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getActive(user: AccessTokenPayload) {
    const context = this.tenant.requireBusiness(user);
    const business = await this.prisma.business.findFirst({
      where: { id: context.businessId, isActive: true },
    });
    if (!business)
      throw new NotFoundException({ code: 'BUSINESS_NOT_FOUND', message: 'Business not found' });
    return business;
  }

  async updateActive(user: AccessTokenPayload, dto: UpdateBusinessDto) {
    const context = this.tenant.requireBusiness(user);
    const previous = await this.prisma.business.findFirst({
      where: { id: context.businessId, isActive: true },
    });
    if (!previous)
      throw new NotFoundException({ code: 'BUSINESS_NOT_FOUND', message: 'Business not found' });
    const business = await this.prisma.business.update({
      where: { id: context.businessId },
      data: dto,
    });
    await this.auditLogs.create({
      businessId: context.businessId,
      userId: context.userId,
      action: 'business.updated',
      entityType: 'Business',
      entityId: business.id,
      previousValues: previous,
      newValues: dto,
    });
    return business;
  }
}
