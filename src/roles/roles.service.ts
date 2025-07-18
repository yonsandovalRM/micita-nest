// src/roles/roles.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { RolesPermissionsService } from '../common/services/roles-permissions.service';

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private rolesPermissionsService: RolesPermissionsService,
  ) {}

  async createRole(
    tenantId: string,
    name: string,
    displayName: string,
    description?: string,
    permissionIds?: string[],
  ) {
    // Verificar que el nombre no esté tomado
    const existingRole = await this.prisma.role.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name,
        },
      },
    });

    if (existingRole) {
      throw new BadRequestException('Ya existe un rol con ese nombre');
    }

    const role = await this.prisma.role.create({
      data: {
        tenantId,
        name,
        displayName,
        description,
        isSystemRole: false,
        priority: 30, // Roles personalizados tienen prioridad media
      },
    });

    // Asignar permisos si se especificaron
    if (permissionIds && permissionIds.length > 0) {
      await this.assignPermissionsToRole(role.id, tenantId, permissionIds);
    }

    return this.getRoleWithPermissions(role.id, tenantId);
  }

  async updateRole(
    roleId: string,
    tenantId: string,
    displayName?: string,
    description?: string,
    permissionIds?: string[],
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    if (role.isSystemRole) {
      throw new BadRequestException('No se pueden modificar roles del sistema');
    }

    const updatedRole = await this.prisma.role.update({
      where: { id: roleId },
      data: {
        displayName,
        description,
      },
    });

    // Actualizar permisos si se especificaron
    if (permissionIds !== undefined) {
      // Eliminar permisos actuales
      await this.prisma.rolePermission.deleteMany({
        where: { roleId, tenantId },
      });

      // Asignar nuevos permisos
      if (permissionIds.length > 0) {
        await this.assignPermissionsToRole(roleId, tenantId, permissionIds);
      }
    }

    return this.getRoleWithPermissions(roleId, tenantId);
  }

  async deleteRole(roleId: string, tenantId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    if (role.isSystemRole) {
      throw new BadRequestException('No se pueden eliminar roles del sistema');
    }

    // Verificar que no hay usuarios asignados a este rol
    const usersWithRole = await this.prisma.userTenant.count({
      where: { roleId, tenantId },
    });

    if (usersWithRole > 0) {
      throw new BadRequestException(
        'No se puede eliminar el rol porque tiene usuarios asignados',
      );
    }

    // Eliminar permisos asociados
    await this.prisma.rolePermission.deleteMany({
      where: { roleId, tenantId },
    });

    // Eliminar el rol
    await this.prisma.role.delete({
      where: { id: roleId },
    });

    return { message: 'Rol eliminado exitosamente' };
  }

  async getRolesByTenant(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId, isActive: true },
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
                displayName: true,
                category: true,
              },
            },
          },
        },
        _count: {
          select: {
            userTenants: true,
          },
        },
      },
      orderBy: { priority: 'desc' },
    });
  }

  async getRoleWithPermissions(roleId: string, tenantId?: string) {
    const whereClause: any = { id: roleId };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const role = await this.prisma.role.findFirst({
      where: whereClause,
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
                displayName: true,
                description: true,
                category: true,
              },
            },
          },
        },
        _count: {
          select: {
            userTenants: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    return role;
  }

  async assignPermissionsToRole(
    roleId: string,
    tenantId: string,
    permissionIds: string[],
  ) {
    // Verificar que todos los permisos existen y pertenecen al tenant
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: { in: permissionIds },
        tenantId,
      },
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException(
        'Algunos permisos no existen o no pertenecen al tenant',
      );
    }

    const rolePermissions = permissionIds.map((permissionId) => ({
      roleId,
      tenantId,
      permissionId,
    }));

    await this.prisma.rolePermission.createMany({
      data: rolePermissions,
      skipDuplicates: true,
    });
  }

  async assignRoleToUser(userId: string, tenantId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    const userTenant = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    if (!userTenant) {
      throw new NotFoundException('Usuario no encontrado en este tenant');
    }

    await this.prisma.userTenant.update({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      data: {
        roleId,
      },
    });

    return {
      message: 'Rol asignado exitosamente',
      user: {
        id: userId,
        role: {
          id: role.id,
          name: role.name,
          displayName: role.displayName,
        },
      },
    };
  }

  async getUsersByRole(tenantId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    const userTenants = await this.prisma.userTenant.findMany({
      where: { tenantId, roleId, status: 'active' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            phone: true,
            createdAt: true,
            emailVerified: true,
          },
        },
      },
      orderBy: {
        user: {
          firstName: 'asc',
        },
      },
    });

    return {
      role: {
        id: role.id,
        name: role.name,
        displayName: role.displayName,
      },
      users: userTenants.map((ut) => ({
        ...ut.user,
        joinedAt: ut.joinedAt,
        status: ut.status,
      })),
    };
  }

  async initializeTenantRoles(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    await this.rolesPermissionsService.initializeTenantRolesAndPermissions(
      tenantId,
    );

    return {
      message: 'Roles y permisos inicializados correctamente para el tenant',
      tenantId,
    };
  }

  async getRoleByName(tenantId: string, roleName: string) {
    return this.prisma.role.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name: roleName,
        },
      },
    });
  }

  async getUserRole(userId: string, tenantId: string) {
    const userTenant = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
            priority: true,
          },
        },
      },
    });

    return userTenant?.role || null;
  }

  async removeRoleFromUser(userId: string, tenantId: string) {
    const userTenant = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    if (!userTenant) {
      throw new NotFoundException('Usuario no encontrado en este tenant');
    }

    await this.prisma.userTenant.update({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      data: {
        roleId: null,
      },
    });

    return { message: 'Rol removido exitosamente del usuario' };
  }
}
