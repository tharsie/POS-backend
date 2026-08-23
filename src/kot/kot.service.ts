import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { CreateKotDto, UpdateKotStatusDto } from './dto/kot.dto';

@Injectable()
export class KotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  list(user: AccessTokenPayload) {
    const context = this.tenant.requireBusiness(user);
    const where: any = { businessId: context.businessId };
    if (context.branchId) {
      where.branchId = context.branchId;
    }
    return this.prisma.kitchenOrderTicket.findMany({
      where,
      include: {
        items: true,
        order: { include: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async create(user: AccessTokenPayload, dto: CreateKotDto) {
    const context = this.tenant.requireBusiness(user);
    if (!dto.orderId || typeof dto.orderId !== 'string') {
      throw new BadRequestException({ code: 'ORDER_INVALID', message: 'Order ID is required' });
    }
    const order = await this.prisma.order
      .findFirst({
        where: { id: dto.orderId, businessId: context.businessId },
        include: { items: true },
      })
      .catch(() => null);

    if (!order)
      throw new BadRequestException({ code: 'ORDER_INVALID', message: 'Order is invalid' });

    // Fetch existing tickets for this order to determine version & previous dispatched state
    const existingTickets = await this.prisma.kitchenOrderTicket.findMany({
      where: { orderId: order.id, businessId: context.businessId },
      include: { items: true },
      orderBy: { version: 'asc' },
    });

    const version = existingTickets.length + 1;
    const isUpdate = version > 1;

    // Calculate last dispatched quantity per product ID across all previous tickets
    const lastDispatchedMap = new Map<string, { quantity: number; name: string }>();

    for (const ticket of existingTickets) {
      for (const item of ticket.items) {
        const qty = Number(item.quantity);
        if (item.changeType === 'CANCELLED') {
          lastDispatchedMap.set(item.productId, { quantity: 0, name: item.name });
        } else {
          lastDispatchedMap.set(item.productId, { quantity: qty, name: item.name });
        }
      }
    }

    // Determine diff for current order items
    const kotItemsData: {
      productId: string;
      name: string;
      quantity: number;
      previousQuantity: number | null;
      changeType: 'NEW' | 'MODIFIED' | 'CANCELLED' | 'UNCHANGED';
    }[] = [];

    const currentProductIds = new Set<string>();

    for (const orderItem of order.items) {
      currentProductIds.add(orderItem.productId);
      const currQty = Number(orderItem.quantity);
      const prevData = lastDispatchedMap.get(orderItem.productId);
      const prevQty = prevData ? prevData.quantity : 0;

      if (!prevData || prevQty === 0) {
        kotItemsData.push({
          productId: orderItem.productId,
          name: orderItem.name,
          quantity: currQty,
          previousQuantity: null,
          changeType: 'NEW',
        });
      } else if (currQty !== prevQty) {
        kotItemsData.push({
          productId: orderItem.productId,
          name: orderItem.name,
          quantity: currQty,
          previousQuantity: prevQty,
          changeType: 'MODIFIED',
        });
      } else {
        kotItemsData.push({
          productId: orderItem.productId,
          name: orderItem.name,
          quantity: currQty,
          previousQuantity: prevQty,
          changeType: 'UNCHANGED',
        });
      }
    }

    // Check for cancelled items (items present in previous tickets but missing in current order)
    lastDispatchedMap.forEach((data, productId) => {
      if (!currentProductIds.has(productId) && data.quantity > 0) {
        kotItemsData.push({
          productId,
          name: data.name,
          quantity: 0,
          previousQuantity: data.quantity,
          changeType: 'CANCELLED',
        });
      }
    });

    const numCode = order.orderNumber.replace(/[^0-9]/g, '') || String(Date.now());
    const ticketNumber = isUpdate ? `KOT-${numCode}-V${version}` : `KOT-${numCode}`;

    return this.prisma.kitchenOrderTicket.create({
      data: {
        businessId: context.businessId,
        branchId: context.branchId || order.branchId,
        orderId: order.id,
        ticketNumber,
        version,
        isUpdate,
        notes: dto.notes || (isUpdate ? `KOT Update v${version}` : 'POS Order Note'),
        items: {
          create: kotItemsData.map((i) => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            previousQuantity: i.previousQuantity,
            changeType: i.changeType,
          })),
        },
      },
      include: {
        items: true,
        order: { include: { items: true } },
      },
    });
  }

  async updateStatus(user: AccessTokenPayload, id: string, dto: UpdateKotStatusDto) {
    const context = this.tenant.requireBranch(user);
    const ticket = await this.prisma.kitchenOrderTicket.findFirst({
      where: { id, businessId: context.businessId, branchId: context.branchId },
    });
    if (!ticket) throw new NotFoundException({ code: 'KOT_NOT_FOUND', message: 'KOT not found' });
    return this.prisma.kitchenOrderTicket.update({
      where: { id },
      data: { status: dto.status },
      include: {
        items: true,
        order: { include: { items: true } },
      },
    });
  }
}
