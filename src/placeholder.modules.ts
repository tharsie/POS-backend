import { Module } from '@nestjs/common';

@Module({})
export class PurchasesModule {}
@Module({})
export class KitchenModule {}
@Module({})
export class ReportsModule {}
export class RolesModule {}
@Module({})
export class TaxesModule {}

export const PlaceholderModules = [
  PurchasesModule,
  KitchenModule,
  ReportsModule,
  RolesModule,
  TaxesModule,
];
