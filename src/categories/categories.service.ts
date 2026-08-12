import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  list(user: AccessTokenPayload) {
    const context = this.tenant.requireBusiness(user);
    return this.prisma.category.findMany({
      where: { businessId: context.businessId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(user: AccessTokenPayload, dto: CreateCategoryDto) {
    const context = this.tenant.requireBusiness(user);
    const category = await this.prisma.category.create({
      data: { businessId: context.businessId, name: dto.name, description: dto.description },
    });
    await this.auditLogs.create({
      businessId: context.businessId,
      userId: context.userId,
      action: 'category.created',
      entityType: 'Category',
      entityId: category.id,
      newValues: dto,
    });
    return category;
  }

  async update(user: AccessTokenPayload, id: string, dto: UpdateCategoryDto) {
    const context = this.tenant.requireBusiness(user);
    const category = await this.prisma.category.findFirst({
      where: { id, businessId: context.businessId },
    });
    if (!category)
      throw new NotFoundException({ code: 'CATEGORY_NOT_FOUND', message: 'Category not found' });
    const updated = await this.prisma.category.update({ where: { id }, data: dto });
    await this.auditLogs.create({
      businessId: context.businessId,
      userId: context.userId,
      action: 'category.updated',
      entityType: 'Category',
      entityId: id,
      previousValues: category,
      newValues: dto,
    });
    return updated;
  }
}
