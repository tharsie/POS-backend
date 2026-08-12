import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { ReceivePaymentDto } from './dto/payment.dto';
import { decimal } from '../common/utils/decimal.util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  list(user: AccessTokenPayload) {
    const context = this.tenant.requireBranch(user);
    return this.prisma.payment.findMany({
      where: { businessId: context.businessId, branchId: context.branchId },
      include: { order: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async receive(user: AccessTokenPayload, dto: ReceivePaymentDto) {
    const context = this.tenant.requireBranch(user);
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, businessId: context.businessId, branchId: context.branchId },
      include: { payments: true },
    });
    if (!order)
      throw new BadRequestException({ code: 'ORDER_INVALID', message: 'Order is invalid' });
    if (order.status === 'CANCELLED') {
      throw new BadRequestException({
        code: 'ORDER_CANCELLED',
        message: 'Cannot receive payment for cancelled order',
      });
    }
    const amount = decimal(dto.amount, 'amount');
    const alreadyPaid = order.payments
      .filter((existing) => existing.status === 'COMPLETED')
      .reduce((sum, existing) => sum.add(existing.amount), new Prisma.Decimal(0));
    if (alreadyPaid.add(amount).greaterThan(order.grandTotal)) {
      throw new BadRequestException({
        code: 'PAYMENT_OVERPAYMENT',
        message: 'Payment exceeds order balance',
      });
    }
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          businessId: context.businessId,
          branchId: context.branchId!,
          orderId: order.id,
          method: dto.method,
          amount,
          currencyCode: order.currencyCode,
          providerReference: dto.providerReference,
          receivedById: context.userId,
        },
      });
      const paid = alreadyPaid.add(amount);
      if (paid.greaterThanOrEqualTo(order.grandTotal)) {
        await tx.order.update({ where: { id: order.id }, data: { status: 'PAID' } });
      }
      await this.auditLogs.create(
        {
          businessId: context.businessId,
          branchId: context.branchId,
          userId: context.userId,
          action: 'payment.received',
          entityType: 'Payment',
          entityId: payment.id,
          newValues: { orderId: order.id, amount: dto.amount, method: dto.method },
        },
        tx,
      );
      return payment;
    });
  }
}
