import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { decimal } from '../common/utils/decimal.util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  list(user: AccessTokenPayload) {
    const context = this.tenant.requireBusiness(user);
    return this.prisma.product.findMany({
      where: { businessId: context.businessId, status: 'ACTIVE' },
      include: { category: { include: { kitchenStation: true } } },
      orderBy: { name: 'asc' },
    });
  }


  async create(user: AccessTokenPayload, dto: CreateProductDto) {
    const context = this.tenant.requireBusiness(user);
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: context.businessId },
    });
    await this.assertCategory(context.businessId, dto.categoryId);
    const product = await this.prisma.product.create({
      data: {
        businessId: context.businessId,
        categoryId: dto.categoryId,
        name: dto.name,
        sku: dto.sku.toUpperCase(),
        barcode: dto.barcode,
        description: dto.description,
        currencyCode: business.currencyCode,
        sellingPrice: decimal(dto.sellingPrice, 'sellingPrice'),
        costPrice: dto.costPrice ? decimal(dto.costPrice, 'costPrice') : undefined,
        taxRate: dto.taxRate ? decimal(dto.taxRate, 'taxRate') : undefined,
      },
    });
    await this.auditLogs.create({
      businessId: context.businessId,
      userId: context.userId,
      action: 'product.created',
      entityType: 'Product',
      entityId: product.id,
      newValues: {
        name: product.name,
        sku: product.sku,
        sellingPrice: product.sellingPrice.toString(),
      },
    });
    return product;
  }

  async update(user: AccessTokenPayload, id: string, dto: UpdateProductDto) {
    const context = this.tenant.requireBusiness(user);
    const product = await this.prisma.product.findFirst({
      where: { id, businessId: context.businessId },
    });
    if (!product)
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    await this.assertCategory(context.businessId, dto.categoryId);
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        sku: dto.sku?.toUpperCase(),
        sellingPrice: dto.sellingPrice ? decimal(dto.sellingPrice, 'sellingPrice') : undefined,
        costPrice: dto.costPrice ? decimal(dto.costPrice, 'costPrice') : undefined,
        taxRate: dto.taxRate ? decimal(dto.taxRate, 'taxRate') : undefined,
      },
    });
    await this.auditLogs.create({
      businessId: context.businessId,
      userId: context.userId,
      action: 'product.updated',
      entityType: 'Product',
      entityId: id,
      previousValues: product,
      newValues: dto,
    });
    return updated;
  }

  private async assertCategory(businessId: string, categoryId?: string) {
    if (!categoryId) return;
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, businessId },
    });
    if (!category)
      throw new BadRequestException({ code: 'CATEGORY_INVALID', message: 'Category is invalid' });
  }
}
