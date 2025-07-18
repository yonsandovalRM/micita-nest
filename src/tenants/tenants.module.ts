import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantInitializationService } from './tenant-initialization.service';
import { CommonModule } from '../common/common.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [CommonModule, SubscriptionsModule],
  controllers: [TenantsController],
  providers: [TenantsService, TenantInitializationService],
  exports: [TenantsService, TenantInitializationService],
})
export class TenantsModule {}
