import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CashMovementDto } from './dto/cash-movement.dto';
import { CashMovementType, ShiftStatus } from '@prisma/client';

@Injectable()
export class CashRegisterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  async getCurrentShift(user: AccessTokenPayload, branchId?: string) {
    const context = this.tenant.requireBusiness(user);
    const targetBranchId = branchId || context.branchId;

    return this.prisma.cashRegisterShift.findFirst({
      where: {
        businessId: context.businessId,
        userId: user.sub,
        ...(targetBranchId ? { branchId: targetBranchId } : {}),
        status: ShiftStatus.OPEN,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        branch: { select: { id: true, name: true, code: true } },
        movements: { orderBy: { createdAt: 'desc' } },
        _count: { select: { orders: true } },
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  async openShift(user: AccessTokenPayload, dto: OpenShiftDto) {
    const context = this.tenant.requireBusiness(user);
    let targetBranchId = dto.branchId || context.branchId;
    if (!targetBranchId) {
      const firstBranch = await this.prisma.branch.findFirst({
        where: { businessId: context.businessId },
      });
      targetBranchId = firstBranch?.id;
    }

    if (!targetBranchId) {
      throw new BadRequestException({ code: 'BRANCH_REQUIRED', message: 'A branch is required to open a register shift.' });
    }


    const existingOpen = await this.prisma.cashRegisterShift.findFirst({
      where: {
        businessId: context.businessId,
        branchId: targetBranchId,
        userId: user.sub,
        status: ShiftStatus.OPEN,
      },
    });

    if (existingOpen) {
      throw new BadRequestException({
        code: 'SHIFT_ALREADY_OPEN',
        message: 'You already have an open shift. Please close your current shift before opening a new one.',
        shift: existingOpen,
      });
    }

    return this.prisma.cashRegisterShift.create({
      data: {
        businessId: context.businessId,
        branchId: targetBranchId,
        userId: user.sub,
        status: ShiftStatus.OPEN,
        openingFloat: dto.openingFloat,
        openingNote: dto.openingNote,
        openedAt: new Date(),
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        branch: { select: { id: true, name: true, code: true } },
        movements: true,
      },
    });
  }

  async recordMovement(user: AccessTokenPayload, dto: CashMovementDto) {
    const context = this.tenant.requireBusiness(user);
    let shiftId = dto.shiftId;

    if (!shiftId) {
      const activeShift = await this.getCurrentShift(user);
      if (!activeShift) {
        throw new NotFoundException({ code: 'NO_ACTIVE_SHIFT', message: 'No active open shift found for cash movement.' });
      }
      shiftId = activeShift.id;
    }

    const shift = await this.prisma.cashRegisterShift.findFirst({
      where: { id: shiftId, businessId: context.businessId, status: ShiftStatus.OPEN },
    });

    if (!shift) {
      throw new NotFoundException({ code: 'OPEN_SHIFT_NOT_FOUND', message: 'Open shift not found.' });
    }

    const movement = await this.prisma.cashMovement.create({
      data: {
        shiftId: shift.id,
        type: dto.type,
        amount: dto.amount,
        reason: dto.reason,
      },
    });

    return movement;
  }

  async getShiftSummary(user: AccessTokenPayload, shiftId?: string) {
    const context = this.tenant.requireBusiness(user);

    let targetShiftId = shiftId;
    if (!targetShiftId) {
      const current = await this.getCurrentShift(user);
      if (!current) {
        throw new NotFoundException({ code: 'NO_ACTIVE_SHIFT', message: 'No active shift found.' });
      }
      targetShiftId = current.id;
    }

    const shift = await this.prisma.cashRegisterShift.findFirst({
      where: { id: targetShiftId, businessId: context.businessId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        branch: { select: { id: true, name: true, code: true } },
        movements: { orderBy: { createdAt: 'desc' } },
        orders: {
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true, categoryId: true } },
              },
            },
            payments: true,
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException({ code: 'SHIFT_NOT_FOUND', message: 'Shift not found.' });
    }

    // 1. Calculate Cash In / Cash Out
    let totalCashIn = 0;
    let totalCashOut = 0;
    for (const mov of shift.movements) {
      const amt = Number(mov.amount);
      if (mov.type === CashMovementType.CASH_IN) {
        totalCashIn += amt;
      } else if (mov.type === CashMovementType.CASH_OUT) {
        totalCashOut += amt;
      }
    }

    // 2. Calculate Payment totals from completed payments across orders
    let cashSales = 0;
    let cardSales = 0;
    let otherSales = 0;
    let totalSales = 0;
    let ordersCount = shift.orders.length;

    // Itemized map: productId -> { name, quantitySold, totalRevenue, unitPrice }
    const itemsMap = new Map<string, { productId: string; name: string; quantitySold: number; totalRevenue: number; unitPrice: number }>();

    for (const order of shift.orders) {
      if (order.status === 'CANCELLED') continue;

      // Payments breakdown
      for (const payment of order.payments) {
        if (payment.status !== 'COMPLETED') continue;
        const pAmt = Number(payment.amount);
        totalSales += pAmt;

        if (payment.method === 'CASH') {
          cashSales += pAmt;
        } else if (payment.method === 'CARD') {
          cardSales += pAmt;
        } else {
          otherSales += pAmt;
        }
      }

      // If order is paid or open, accumulate items
      for (const item of order.items) {
        const key = item.productId || item.name;
        const qty = Number(item.quantity);
        const revenue = Number(item.totalAmount);
        const price = Number(item.unitPrice);

        const existing = itemsMap.get(key);
        if (existing) {
          existing.quantitySold += qty;
          existing.totalRevenue += revenue;
        } else {
          itemsMap.set(key, {
            productId: item.productId,
            name: item.name,
            quantitySold: qty,
            totalRevenue: revenue,
            unitPrice: price,
          });
        }
      }
    }

    const openingFloat = Number(shift.openingFloat);
    const expectedCash = openingFloat + cashSales + totalCashIn - totalCashOut;

    // Sort itemized sales by quantity sold descending
    const itemizedSales = Array.from(itemsMap.values()).sort((a, b) => b.quantitySold - a.quantitySold);

    return {
      shift: {
        id: shift.id,
        status: shift.status,
        openingFloat: Number(shift.openingFloat),
        openedAt: shift.openedAt,
        openingNote: shift.openingNote,
        closedAt: shift.closedAt,
        closingNote: shift.closingNote,
        actualCash: shift.actualCash != null ? Number(shift.actualCash) : null,
        expectedCash: shift.expectedCash != null ? Number(shift.expectedCash) : expectedCash,
        difference: shift.difference != null ? Number(shift.difference) : null,
        user: shift.user,
        branch: shift.branch,
        movements: shift.movements,
        ordersCount,
      },
      financialSummary: {
        openingFloat,
        cashSales,
        cardSales,
        otherSales,
        totalSales,
        totalCashIn,
        totalCashOut,
        expectedCash,
      },
      itemizedSales,
    };
  }

  async closeShift(user: AccessTokenPayload, dto: CloseShiftDto) {
    const context = this.tenant.requireBusiness(user);
    let targetShiftId = dto.shiftId;

    if (!targetShiftId) {
      const activeShift = await this.getCurrentShift(user);
      if (!activeShift) {
        throw new NotFoundException({ code: 'NO_ACTIVE_SHIFT', message: 'No active open shift found to close.' });
      }
      targetShiftId = activeShift.id;
    }

    const summary = await this.getShiftSummary(user, targetShiftId);
    const { financialSummary } = summary;

    const actualCash = Number(dto.actualCash);
    const expectedCash = financialSummary.expectedCash;
    const difference = actualCash - expectedCash;

    const updated = await this.prisma.cashRegisterShift.update({
      where: { id: targetShiftId },
      data: {
        status: ShiftStatus.CLOSED,
        closedAt: new Date(),
        closingNote: dto.closingNote,
        actualCash,
        expectedCash,
        difference,
        totalSales: financialSummary.totalSales,
        cashSales: financialSummary.cashSales,
        cardSales: financialSummary.cardSales,
        otherSales: financialSummary.otherSales,
        totalCashIn: financialSummary.totalCashIn,
        totalCashOut: financialSummary.totalCashOut,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        branch: { select: { id: true, name: true, code: true } },
        movements: { orderBy: { createdAt: 'desc' } },
      },
    });

    return {
      ...summary,
      shift: {
        ...updated,
        openingFloat: Number(updated.openingFloat),
        actualCash: Number(updated.actualCash),
        expectedCash: Number(updated.expectedCash),
        difference: Number(updated.difference),
      },
    };
  }

  async listShifts(user: AccessTokenPayload, query: { branchId?: string; page?: number; limit?: number }) {
    const context = this.tenant.requireBusiness(user);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      businessId: context.businessId,
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };

    const [shifts, total] = await Promise.all([
      this.prisma.cashRegisterShift.findMany({
        where,
        skip,
        take: limit,
        orderBy: { openedAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          branch: { select: { id: true, name: true, code: true } },
          _count: { select: { orders: true, movements: true } },
        },
      }),
      this.prisma.cashRegisterShift.count({ where }),
    ]);

    return {
      data: shifts.map((s) => ({
        ...s,
        openingFloat: Number(s.openingFloat),
        actualCash: s.actualCash != null ? Number(s.actualCash) : null,
        expectedCash: s.expectedCash != null ? Number(s.expectedCash) : null,
        difference: s.difference != null ? Number(s.difference) : null,
        totalSales: s.totalSales != null ? Number(s.totalSales) : null,
        cashSales: s.cashSales != null ? Number(s.cashSales) : null,
        cardSales: s.cardSales != null ? Number(s.cardSales) : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getShiftById(user: AccessTokenPayload, id: string) {
    return this.getShiftSummary(user, id);
  }
}
