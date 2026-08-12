import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [PermissionsModule, AuditLogsModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
