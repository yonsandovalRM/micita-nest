import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './common/services/prisma.service';
import { EmailService } from './common/services/email.service';
import { RolesPermissionsService } from './common/services/roles-permissions.service';
import { FeaturesService } from './common/services/features.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { RolesModule } from './roles/roles.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    AuthModule,
    UsersModule,
    TenantsModule,
    RolesModule,
    SubscriptionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    EmailService,
    RolesPermissionsService,
    FeaturesService,
  ],
})
export class AppModule {}
