import { Module } from '@nestjs/common';
import { CashRegisterService } from './cash-register.service';
import { CashRegisterController } from './cash-register.controller';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
