import { Module } from '@nestjs/common';
import { KotController } from './kot.controller';
import { KotService } from './kot.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({ imports: [PermissionsModule], controllers: [KotController], providers: [KotService] })
export class KotModule {}
