import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  list(user: AccessTokenPayload) {
    const context = this.tenant.requireBusiness(user);
    return this.prisma.supplier.findMany({
      where: { businessId: context.businessId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(user: AccessTokenPayload, dto: CreateSupplierDto) {
    const context = this.tenant.requireBusiness(user);
    const supplier = await this.prisma.supplier.create({
      data: { businessId: context.businessId, ...dto },
    });
    await this.auditLogs.create({
      businessId: context.businessId,
      userId: context.userId,
      action: 'supplier.created',
      entityType: 'Supplier',
      entityId: supplier.id,
      newValues: dto,
    });
    return supplier;
  }

  async update(user: AccessTokenPayload, id: string, dto: UpdateSupplierDto) {
    const context = this.tenant.requireBusiness(user);
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, businessId: context.businessId },
    });
    if (!supplier)
      throw new NotFoundException({ code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found' });
    const updated = await this.prisma.supplier.update({ where: { id }, data: dto });
    await this.auditLogs.create({
      businessId: context.businessId,
      userId: context.userId,
      action: 'supplier.updated',
      entityType: 'Supplier',
      entityId: id,
      previousValues: supplier,
      newValues: dto,
    });
    return updated;
  }
}
