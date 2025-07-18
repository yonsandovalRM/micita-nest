import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../common/services/prisma.service';
import { FeaturesService } from '../common/services/features.service';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PrismaService, FeaturesService],
  exports: [SubscriptionsService, FeaturesService],
})
export class SubscriptionsModule {}
