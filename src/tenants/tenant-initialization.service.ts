import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { RolesPermissionsService } from '../common/services/roles-permissions.service';

@Injectable()
export class TenantInitializationService {
  constructor(
    private prisma: PrismaService,
    private rolesPermissionsService: RolesPermissionsService,
  ) {}

  async createTenantWithDefaults(
    slug: string,
    name: string,
    description?: string,
    businessType?: string,
    ownerEmail?: string,
  ) {
    // Crear tenant
    const tenant = await this.prisma.tenant.create({
      data: {
        slug,
        name,
        description,
        businessType,
      },
    });

    // Crear configuración por defecto
    await this.prisma.tenantSettings.create({
      data: {
        tenantId: tenant.id,
      },
    });

    // Inicializar roles y permisos
    await this.rolesPermissionsService.initializeTenantRolesAndPermissions(
      tenant.id,
    );

    // Si se especifica un owner, crearlo y asignarlo
    if (ownerEmail) {
      let owner = await this.prisma.user.findUnique({
        where: { email: ownerEmail },
      });

      if (!owner) {
        owner = await this.prisma.user.create({
          data: {
            email: ownerEmail,
            emailVerified: new Date(),
          },
        });
      }

      // Obtener el rol de owner
      const ownerRole = await this.prisma.role.findUnique({
        where: {
          tenantId_name: {
            tenantId: tenant.id,
            name: 'owner',
          },
        },
      });

      // Crear relación usuario-tenant con rol de owner
      await this.prisma.userTenant.create({
        data: {
          userId: owner.id,
          tenantId: tenant.id,
          roleId: ownerRole?.id,
          status: 'active',
        },
      });
    }

    return {
      tenant,
      message: 'Tenant creado exitosamente con roles y permisos por defecto',
    };
  }

  async initializeExistingTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant no encontrado');
    }

    await this.rolesPermissionsService.initializeTenantRolesAndPermissions(
      tenantId,
    );

    return {
      message: 'Roles y permisos inicializados para el tenant',
    };
  }
}
