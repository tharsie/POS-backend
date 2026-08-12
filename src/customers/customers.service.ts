import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  list(user: AccessTokenPayload) {
    const context = this.tenant.requireBusiness(user);
    return this.prisma.customer.findMany({
      where: { businessId: context.businessId, isActive: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async create(user: AccessTokenPayload, dto: CreateCustomerDto) {
    const context = this.tenant.requireBusiness(user);
    const customer = await this.prisma.customer.create({
      data: { businessId: context.businessId, ...dto },
    });
    await this.auditLogs.create({
      businessId: context.businessId,
      userId: context.userId,
      action: 'customer.created',
      entityType: 'Customer',
      entityId: customer.id,
      newValues: dto,
    });
    return customer;
  }

  async update(user: AccessTokenPayload, id: string, dto: UpdateCustomerDto) {
    const context = this.tenant.requireBusiness(user);
    const customer = await this.prisma.customer.findFirst({
      where: { id, businessId: context.businessId },
    });
    if (!customer)
      throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' });
    const updated = await this.prisma.customer.update({ where: { id }, data: dto });
    await this.auditLogs.create({
      businessId: context.businessId,
      userId: context.userId,
      action: 'customer.updated',
      entityType: 'Customer',
      entityId: id,
      previousValues: customer,
      newValues: dto,
    });
    return updated;
  }
}
