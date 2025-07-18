import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../common/services/prisma.service';
import { FeaturesService } from '../common/services/features.service';
import { RolesPermissionsService } from '../common/services/roles-permissions.service';

@Module({
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    PrismaService,
    FeaturesService,
    RolesPermissionsService,
  ],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
