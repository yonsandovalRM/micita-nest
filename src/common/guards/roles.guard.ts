import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenant = request.tenant;

    if (!user || !tenant) {
      throw new ForbiddenException('Usuario o tenant no encontrado');
    }

    const userTenant = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenant.id,
        },
      },
      include: {
        role: true,
      },
    });

    if (!userTenant || !userTenant.role) {
      throw new ForbiddenException('No tienes un rol asignado');
    }

    const hasRole = requiredRoles.includes(userTenant.role.name);

    if (!hasRole) {
      throw new ForbiddenException(
        `Requiere uno de estos roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
