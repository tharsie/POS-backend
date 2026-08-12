import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { CreateStockMovementDto } from './dto/stock-movement.dto';
import { decimal } from '../common/utils/decimal.util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  listMovements(user: AccessTokenPayload) {
    const context = this.tenant.requireBranch(user);
    return this.prisma.stockMovement.findMany({
      where: { businessId: context.businessId, branchId: context.branchId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createMovement(user: AccessTokenPayload, dto: CreateStockMovementDto) {
    const context = this.tenant.requireBranch(user);
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, businessId: context.businessId, status: 'ACTIVE' },
    });
    if (!product)
      throw new BadRequestException({ code: 'PRODUCT_INVALID', message: 'Product is invalid' });
    const movement = await this.prisma.stockMovement.create({
      data: {
        businessId: context.businessId,
        branchId: context.branchId!,
        productId: product.id,
        type: dto.type,
        quantity: decimal(dto.quantity, 'quantity'),
        reason: dto.reason,
        reference: dto.reference,
        createdById: context.userId,
      },
    });
    await this.auditLogs.create({
      businessId: context.businessId,
      branchId: context.branchId,
      userId: context.userId,
      action: 'inventory.movement_created',
      entityType: 'StockMovement',
      entityId: movement.id,
      newValues: { productId: product.id, type: dto.type, quantity: dto.quantity },
    });
    return movement;
  }

  async stockOnHand(user: AccessTokenPayload, productId: string) {
    const context = this.tenant.requireBranch(user);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId: context.businessId, status: 'ACTIVE' },
    });
    if (!product)
      throw new BadRequestException({ code: 'PRODUCT_INVALID', message: 'Product is invalid' });
    const aggregate = await this.prisma.stockMovement.aggregate({
      where: { businessId: context.businessId, branchId: context.branchId, productId },
      _sum: { quantity: true },
    });
    return {
      productId,
      branchId: context.branchId,
      quantityOnHand: aggregate._sum.quantity?.toString() ?? '0',
    };
  }
}
