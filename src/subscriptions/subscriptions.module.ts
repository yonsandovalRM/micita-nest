import { forwardRef, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionSchedulerService } from './subscription-scheduler.service';
import { CommonModule } from '../common/common.module';
import { TenantsModule } from 'src/tenants/tenants.module';

@Module({
  imports: [
    CommonModule,
    forwardRef(() => TenantsModule), // Use forwardRef here
    ScheduleModule.forRoot(), // Agregar esto para habilitar cron jobs
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionSchedulerService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
