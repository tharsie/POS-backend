import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { CreateRestaurantTableDto, UpdateRestaurantTableDto } from './dto/restaurant-table.dto';
import { CreateKitchenStationDto, UpdateKitchenStationDto } from './dto/kitchen-station.dto';

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

  // --- KITCHEN STATIONS & PRINTERS ---

  listKitchenStations(user: AccessTokenPayload) {
    const context = this.tenant.requireBusiness(user);
    return this.prisma.kitchenStation.findMany({
      where: { businessId: context.businessId, isActive: true },
      include: {
        _count: {
          select: { categories: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async createKitchenStation(user: AccessTokenPayload, dto: CreateKitchenStationDto) {
    const context = this.tenant.requireBusiness(user);

    if (dto.isDefault) {
      await this.prisma.kitchenStation.updateMany({
        where: { businessId: context.businessId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.kitchenStation.create({
      data: {
        businessId: context.businessId,
        branchId: context.branchId || undefined,
        name: dto.name,
        code: dto.code.toUpperCase(),
        printerIp: dto.printerIp?.trim() || undefined,
        printerPort: dto.printerPort || 9100,
        description: dto.description?.trim() || undefined,
        isDefault: dto.isDefault || false,
      },
    });
  }

  async updateKitchenStation(user: AccessTokenPayload, id: string, dto: UpdateKitchenStationDto) {
    const context = this.tenant.requireBusiness(user);
    const station = await this.prisma.kitchenStation.findFirst({
      where: { id, businessId: context.businessId },
    });
    if (!station) {
      throw new NotFoundException({ code: 'STATION_NOT_FOUND', message: 'Kitchen station not found' });
    }

    if (dto.isDefault) {
      await this.prisma.kitchenStation.updateMany({
        where: { businessId: context.businessId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.kitchenStation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code.toUpperCase() } : {}),
        ...(dto.printerIp !== undefined ? { printerIp: dto.printerIp.trim() || null } : {}),
        ...(dto.printerPort !== undefined ? { printerPort: dto.printerPort } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteKitchenStation(user: AccessTokenPayload, id: string) {
    const context = this.tenant.requireBusiness(user);
    const station = await this.prisma.kitchenStation.findFirst({
      where: { id, businessId: context.businessId },
    });
    if (!station) {
      throw new NotFoundException({ code: 'STATION_NOT_FOUND', message: 'Kitchen station not found' });
    }

    return this.prisma.kitchenStation.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

