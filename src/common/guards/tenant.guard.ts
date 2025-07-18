import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];

    if (!tenantId) {
      throw new BadRequestException(
        'Tenant ID requerido en header x-tenant-id',
      );
    }

    // Verificar que el tenant existe y está activo
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ id: tenantId }, { slug: tenantId }],
        isActive: true,
      },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant no encontrado o inactivo');
    }

    // Adjuntar tenant al request
    request.tenant = tenant;

    return true;
  }
}
