import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BusinessesModule } from './businesses/businesses.module';
import { BranchesModule } from './branches/branches.module';
import { PermissionsModule } from './permissions/permissions.module';
import { InvitationsModule } from './invitations/invitations.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { CountriesModule } from './countries/countries.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PlaceholderModules } from './placeholder.modules';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { KotModule } from './kot/kot.module';
import { BusinessMembersModule } from './business-members/business-members.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';
import { ServicesModule } from './services/services.module';

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    CommonModule,
    HealthModule,
    UsersModule,
    PermissionsModule,
    AuditLogsModule,
    CountriesModule,
    SubscriptionsModule,
    BusinessesModule,
    BranchesModule,
    AuthModule,
    InvitationsModule,
    CategoriesModule,
    ProductsModule,
    CustomersModule,
    SuppliersModule,
    InventoryModule,
    OrdersModule,
    PaymentsModule,
    RestaurantModule,
    KotModule,
    BusinessMembersModule,
    PlatformAdminModule,
    ServicesModule,
    ...PlaceholderModules,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
