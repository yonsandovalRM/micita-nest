import { Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { EmailService } from './services/email.service';
import { RolesPermissionsService } from './services/roles-permissions.service';
import { FeaturesService } from './services/features.service';

@Module({
  providers: [
    PrismaService,
    EmailService,
    RolesPermissionsService,
    FeaturesService,
  ],
  exports: [
    PrismaService,
    EmailService,
    RolesPermissionsService,
    FeaturesService,
  ],
})
export class CommonModule {}
