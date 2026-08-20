import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { CreateOrderDto } from './dto/order.dto';
import { decimal } from '../common/utils/decimal.util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(user: AccessTokenPayload) {
    const context = this.tenant.requireBusiness(user);
    const where: Prisma.OrderWhereInput = { businessId: context.businessId };
    if (context.branchId) {
      where.branchId = context.branchId;
    }
    const orders = await this.prisma.order.findMany({
      where,
      include: { customer: true, items: true, payments: true, kitchenTickets: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return orders.map((o) => ({
      ...o,
      notes: o.notes || o.kitchenTickets?.find((k) => k.notes)?.notes || null,
      items: (o.items || []).map((i) => ({
        ...i,
        productName: i.name,
      })),
    }));
  }

  async get(user: AccessTokenPayload, id: string) {
    const context = this.tenant.requireBusiness(user);
    const where: Prisma.OrderWhereInput = { id, businessId: context.businessId };
    if (context.branchId) {
      where.branchId = context.branchId;
    }
    const order = await this.prisma.order.findFirst({
      where,
      include: { customer: true, items: true, payments: true, kitchenTickets: true },
    });
    if (!order)
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    return {
      ...order,
      notes: order.notes || order.kitchenTickets?.find((k) => k.notes)?.notes || null,
      items: (order.items || []).map((i) => ({
        ...i,
        productName: i.name,
      })),
    };
  }

  async create(user: AccessTokenPayload, dto: CreateOrderDto) {
    const context = this.tenant.requireBusiness(user);
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: context.businessId },
    });
    let branchId = context.branchId;
    if (!branchId) {
      const firstBranch = await this.prisma.branch.findFirst({
        where: { businessId: context.businessId },
      });
      if (!firstBranch) {
        throw new BadRequestException({ code: 'BRANCH_REQUIRED', message: 'No active branch found' });
      }
      branchId = firstBranch.id;
    }
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, businessId: context.businessId },
      });
      if (!customer)
        throw new BadRequestException({ code: 'CUSTOMER_INVALID', message: 'Customer is invalid' });
    }
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, businessId: context.businessId, status: 'ACTIVE' },
    });
    if (products.length !== new Set(productIds).size) {
      throw new BadRequestException({
        code: 'PRODUCT_INVALID',
        message: 'One or more products are invalid',
      });
    }
    const productMap = new Map(products.map((product) => [product.id, product]));
    const items = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const quantity = decimal(item.quantity, 'quantity');
      const unitPrice = item.unitPrice
        ? decimal(item.unitPrice, 'unitPrice')
        : product.sellingPrice;
      const totalAmount = quantity.mul(unitPrice);
      return { product, quantity, unitPrice, totalAmount };
    });
    const subtotal = items.reduce((sum, item) => sum.add(item.totalAmount), new Prisma.Decimal(0));
    const serviceFee = dto.serviceFee ? decimal(dto.serviceFee, 'serviceFee') : new Prisma.Decimal(0);
    const grandTotal = subtotal.add(serviceFee);
    const orderNumber = `ORD-${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          businessId: context.businessId,
          branchId,
          customerId: dto.customerId,
          orderNumber,
          notes: dto.notes,
          tableName: dto.tableName,
          serviceName: dto.serviceName,
          serviceFee,
          currencyCode: business.currencyCode,
          subtotal,
          grandTotal,
          createdById: context.userId,
          items: {
            create: items.map((item) => ({
              productId: item.product.id,
              name: item.product.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
            })),
          },
        },
        include: { items: true },
      });
      await tx.stockMovement.createMany({
        data: items.map((item) => ({
          businessId: context.businessId,
          branchId,
          productId: item.product.id,
          type: 'SALE',
          quantity: item.quantity.neg(),
          reference: order.orderNumber,
          createdById: context.userId,
        })),
      });
      await this.auditLogs.create(
        {
          businessId: context.businessId,
          branchId,
          userId: context.userId,
          action: 'order.created',
          entityType: 'Order',
          entityId: order.id,
          newValues: { orderNumber: order.orderNumber, grandTotal: order.grandTotal.toString() },
        },
        tx,
      );
      return {
        ...order,
        notes: order.notes || (order as any).kitchenTickets?.find((k: any) => k.notes)?.notes || null,
        items: (order.items || []).map((i) => ({
          ...i,
          productName: i.name,
        })),
      };
    });
  }

  async update(user: AccessTokenPayload, id: string, dto: CreateOrderDto) {
    const context = this.tenant.requireBusiness(user);
    const existingOrder = await this.prisma.order.findFirst({
      where: { id, businessId: context.businessId },
    });
    if (!existingOrder) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }
    if (existingOrder.status !== 'OPEN') {
      throw new BadRequestException({ code: 'ORDER_CLOSED', message: 'Only open orders can be edited' });
    }

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, businessId: context.businessId },
      });
      if (!customer)
        throw new BadRequestException({ code: 'CUSTOMER_INVALID', message: 'Customer is invalid' });
    }
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, businessId: context.businessId, status: 'ACTIVE' },
    });
    if (products.length !== new Set(productIds).size) {
      throw new BadRequestException({
        code: 'PRODUCT_INVALID',
        message: 'One or more products are invalid',
      });
    }
    const productMap = new Map(products.map((product) => [product.id, product]));
    const items = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const quantity = decimal(item.quantity, 'quantity');
      const unitPrice = item.unitPrice
        ? decimal(item.unitPrice, 'unitPrice')
        : product.sellingPrice;
      const totalAmount = quantity.mul(unitPrice);
      return { product, quantity, unitPrice, totalAmount };
    });
    const subtotal = items.reduce((sum, item) => sum.add(item.totalAmount), new Prisma.Decimal(0));
    const serviceFee = dto.serviceFee !== undefined ? decimal(dto.serviceFee, 'serviceFee') : (existingOrder.serviceFee || new Prisma.Decimal(0));
    const grandTotal = subtotal.add(serviceFee);

    return this.prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({
        where: { orderId: id },
      });

      const order = await tx.order.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          notes: dto.notes !== undefined ? dto.notes : existingOrder.notes,
          tableName: dto.tableName !== undefined ? dto.tableName : existingOrder.tableName,
          serviceName: dto.serviceName !== undefined ? dto.serviceName : existingOrder.serviceName,
          serviceFee,
          subtotal,
          grandTotal,
          items: {
            create: items.map((item) => ({
              productId: item.product.id,
              name: item.product.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
            })),
          },
        },
        include: { customer: true, items: true, payments: true, kitchenTickets: true },
      });

      await this.auditLogs.create(
        {
          businessId: context.businessId,
          branchId: context.branchId,
          userId: context.userId,
          action: 'order.updated',
          entityType: 'Order',
          entityId: order.id,
          newValues: { orderNumber: order.orderNumber, grandTotal: order.grandTotal.toString() },
        },
        tx,
      );

      return {
        ...order,
        notes: order.notes || order.kitchenTickets?.find((k) => k.notes)?.notes || null,
        items: (order.items || []).map((i) => ({
          ...i,
          productName: i.name,
        })),
      };
    });
  }

  async cancel(user: AccessTokenPayload, id: string) {
    const context = this.tenant.requireBranch(user);
    const order = await this.prisma.order.findFirst({
      where: { id, businessId: context.businessId, branchId: context.branchId },
      include: { items: true },
    });
    if (!order)
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    if (order.status === 'PAID') {
      throw new BadRequestException({
        code: 'ORDER_PAID_CANCEL_FORBIDDEN',
        message: 'Paid orders must be refunded',
      });
    }
    if (order.status === 'CANCELLED') return order;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { id }, data: { status: 'CANCELLED' } });
      await tx.stockMovement.createMany({
        data: order.items.map((item) => ({
          businessId: context.businessId,
          branchId: context.branchId!,
          productId: item.productId,
          type: 'RETURN_IN',
          quantity: item.quantity,
          reference: order.orderNumber,
          createdById: context.userId,
        })),
      });
      await this.auditLogs.create(
        {
          businessId: context.businessId,
          branchId: context.branchId,
          userId: context.userId,
          action: 'order.cancelled',
          entityType: 'Order',
          entityId: id,
          previousValues: { status: order.status },
          newValues: { status: 'CANCELLED' },
        },
        tx,
      );
      return updated;
    });
  }
}
