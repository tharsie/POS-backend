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
      include: { order: { include: { items: true } } },
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
      })
      .catch(() => null);

    if (!order)
      throw new BadRequestException({ code: 'ORDER_INVALID', message: 'Order is invalid' });

    return this.prisma.kitchenOrderTicket.create({
      data: {
        businessId: context.businessId,
        branchId: context.branchId || order.branchId,
        orderId: order.id,
        ticketNumber: `KOT-${Date.now()}`,
        notes: dto.notes || 'POS Order Note',
      },
    });
  }

  async updateStatus(user: AccessTokenPayload, id: string, dto: UpdateKotStatusDto) {
    const context = this.tenant.requireBranch(user);
    const ticket = await this.prisma.kitchenOrderTicket.findFirst({
      where: { id, businessId: context.businessId, branchId: context.branchId },
    });
    if (!ticket) throw new NotFoundException({ code: 'KOT_NOT_FOUND', message: 'KOT not found' });
    return this.prisma.kitchenOrderTicket.update({ where: { id }, data: { status: dto.status } });
  }
}
