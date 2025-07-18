import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/services/prisma.service';
import { EmailService } from '../common/services/email.service';
import { RolesPermissionsService } from '../common/services/roles-permissions.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    EmailService,
    RolesPermissionsService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
