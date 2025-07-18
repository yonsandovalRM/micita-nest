import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenant = request.tenant;

    if (!user || !tenant) {
      throw new ForbiddenException('Usuario o tenant no encontrado');
    }

    // Verificar que el usuario tiene acceso a este tenant
    const userTenant = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenant.id,
        },
      },
    });

    if (!userTenant || userTenant.status !== 'active') {
      throw new ForbiddenException('No tienes acceso a este tenant');
    }

    // Adjuntar la relación user-tenant al request
    request.userTenant = userTenant;

    return true;
  }
}
