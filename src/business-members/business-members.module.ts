import { Module } from '@nestjs/common';
import { BusinessMembersController } from './business-members.controller';
import { BusinessMembersService } from './business-members.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [PermissionsModule, SubscriptionsModule, AuditLogsModule],
  controllers: [BusinessMembersController],
  providers: [BusinessMembersService],
})
export class BusinessMembersModule {}
