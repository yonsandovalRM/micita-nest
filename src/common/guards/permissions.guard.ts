import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesPermissionsService } from '../services/roles-permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rolesPermissionsService: RolesPermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenant = request.tenant;

    if (!user || !tenant) {
      throw new ForbiddenException('Usuario o tenant no encontrado');
    }

    // Verificar cada permiso requerido
    for (const permission of requiredPermissions) {
      const hasPermission = await this.rolesPermissionsService.hasPermission(
        user.id,
        tenant.id,
        permission,
      );

      if (!hasPermission) {
        throw new ForbiddenException(`No tienes permisos para: ${permission}`);
      }
    }

    return true;
  }
}
