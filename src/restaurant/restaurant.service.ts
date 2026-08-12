import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { CreateRestaurantTableDto, UpdateRestaurantTableDto } from './dto/restaurant-table.dto';

@Injectable()
export class RestaurantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  listTables(user: AccessTokenPayload) {
    const context = this.tenant.requireBranch(user);
    return this.prisma.restaurantTable.findMany({
      where: { businessId: context.businessId, branchId: context.branchId, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  createTable(user: AccessTokenPayload, dto: CreateRestaurantTableDto) {
    const context = this.tenant.requireBranch(user);
    return this.prisma.restaurantTable.create({
      data: {
        businessId: context.businessId,
        branchId: context.branchId!,
        name: dto.name,
        code: dto.code.toUpperCase(),
        seats: dto.seats,
      },
    });
  }

  async updateTable(user: AccessTokenPayload, id: string, dto: UpdateRestaurantTableDto) {
    const context = this.tenant.requireBranch(user);
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id, businessId: context.businessId, branchId: context.branchId },
    });
    if (!table)
      throw new NotFoundException({ code: 'TABLE_NOT_FOUND', message: 'Table not found' });
    return this.prisma.restaurantTable.update({
      where: { id },
      data: { ...dto, code: dto.code?.toUpperCase() },
    });
  }
}
