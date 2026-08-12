import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDefaultPlan(currencyCode: string, tx?: Prisma.TransactionClient | PrismaClient) {
    const client = tx ?? this.prisma;
    const plan = await client.subscriptionPlan.findFirst({
      where: { currencyCode, isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    });
    if (!plan) {
      throw new BadRequestException({
        code: 'SUBSCRIPTION_PLAN_MISSING',
        message: 'No active subscription plan is configured for this currency',
      });
    }
    return plan;
  }

  async assertUserLimit(businessId: string) {
    const subscription = await this.prisma.businessSubscription.findFirst({
      where: { businessId, status: { in: ['TRIALING', 'ACTIVE'] } },
      include: { subscriptionPlan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) return;
    const activeMembers = await this.prisma.businessMember.count({
      where: { businessId, status: { not: 'SUSPENDED' } },
    });
    if (activeMembers >= subscription.subscriptionPlan.maximumUsers) {
      throw new BadRequestException({
        code: 'SUBSCRIPTION_USER_LIMIT_REACHED',
        message: 'Subscription user limit reached',
      });
    }
  }
}
