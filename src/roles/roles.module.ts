import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PrismaService } from '../common/services/prisma.service';
import { RolesPermissionsService } from '../common/services/roles-permissions.service';

@Module({
  controllers: [RolesController],
  providers: [RolesService, PrismaService, RolesPermissionsService],
  exports: [RolesService, RolesPermissionsService],
})
export class RolesModule {}
