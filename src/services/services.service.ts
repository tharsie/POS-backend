import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { CreateOrderServiceDto, UpdateOrderServiceDto } from './dto/service.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  async listServices(user: AccessTokenPayload) {
    const context = this.tenant.requireBranch(user);
    let services = await this.prisma.orderService.findMany({
      where: { businessId: context.businessId, branchId: context.branchId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    // Auto-seed default services if none exist for branch
    if (services.length === 0) {
      const defaultServices = [
        { name: 'Dine-In Table', code: 'DINEIN', feeType: 'PERCENTAGE', feeValue: new Prisma.Decimal(0) },
        { name: 'Takeaway / Parcel', code: 'TAKEAWAY', feeType: 'FIXED', feeValue: new Prisma.Decimal(0) },
        { name: 'Home Delivery', code: 'DELIVERY', feeType: 'FIXED', feeValue: new Prisma.Decimal(150) },
      ];

      for (const s of defaultServices) {
        await this.prisma.orderService.create({
          data: {
            businessId: context.businessId,
            branchId: context.branchId!,
            name: s.name,
            code: s.code,
            feeType: s.feeType as any,
            feeValue: s.feeValue,
            isActive: true,
          },
        }).catch(() => null);
      }

      services = await this.prisma.orderService.findMany({
        where: { businessId: context.businessId, branchId: context.branchId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    return services;
  }

  async createService(user: AccessTokenPayload, dto: CreateOrderServiceDto) {
    const context = this.tenant.requireBranch(user);
    return this.prisma.orderService.create({
      data: {
        businessId: context.businessId,
        branchId: context.branchId!,
        name: dto.name,
        code: dto.code.toUpperCase(),
        feeType: dto.feeType as any,
        feeValue: new Prisma.Decimal(dto.feeValue || 0),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async updateService(user: AccessTokenPayload, id: string, dto: UpdateOrderServiceDto) {
    const context = this.tenant.requireBranch(user);
    const service = await this.prisma.orderService.findFirst({
      where: { id, businessId: context.businessId, branchId: context.branchId },
    });
    if (!service) {
      throw new NotFoundException({ code: 'SERVICE_NOT_FOUND', message: 'Order service not found' });
    }

    return this.prisma.orderService.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.code ? { code: dto.code.toUpperCase() } : {}),
        ...(dto.feeType ? { feeType: dto.feeType as any } : {}),
        ...(dto.feeValue !== undefined ? { feeValue: new Prisma.Decimal(dto.feeValue) } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteService(user: AccessTokenPayload, id: string) {
    const context = this.tenant.requireBranch(user);
    const service = await this.prisma.orderService.findFirst({
      where: { id, businessId: context.businessId, branchId: context.branchId },
    });
    if (!service) {
      throw new NotFoundException({ code: 'SERVICE_NOT_FOUND', message: 'Order service not found' });
    }

    return this.prisma.orderService.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
