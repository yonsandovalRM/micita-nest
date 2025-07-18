import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface SystemRole {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  priority: number;
}

export interface SystemPermission {
  name: string;
  displayName: string;
  description: string;
  category: string;
}

@Injectable()
export class RolesPermissionsService {
  constructor(private prisma: PrismaService) {}

  // Roles del sistema por defecto
  private readonly systemRoles: SystemRole[] = [
    {
      name: 'owner',
      displayName: 'Propietario',
      description: 'Acceso completo al sistema',
      priority: 100,
      permissions: ['*'], // Todos los permisos
    },
    {
      name: 'admin',
      displayName: 'Administrador',
      description: 'Gestión completa excepto configuración de propietario',
      priority: 90,
      permissions: [
        'users.read',
        'users.create',
        'users.update',
        'users.delete',
        'roles.read',
        'roles.create',
        'roles.update',
        'roles.delete',
        'appointments.read',
        'appointments.create',
        'appointments.update',
        'appointments.delete',
        'services.read',
        'services.create',
        'services.update',
        'services.delete',
        'providers.read',
        'providers.create',
        'providers.update',
        'providers.delete',
        'reports.read',
        'settings.read',
        'settings.update',
      ],
    },
    {
      name: 'provider',
      displayName: 'Profesional',
      description: 'Gestión de citas y clientes asignados',
      priority: 50,
      permissions: [
        'appointments.read',
        'appointments.create',
        'appointments.update',
        'clients.read',
        'services.read',
        'schedule.read',
        'schedule.update',
      ],
    },
    {
      name: 'receptionist',
      displayName: 'Recepcionista',
      description: 'Gestión de citas y clientes',
      priority: 40,
      permissions: [
        'appointments.read',
        'appointments.create',
        'appointments.update',
        'clients.read',
        'clients.create',
        'clients.update',
        'services.read',
        'providers.read',
      ],
    },
    {
      name: 'client',
      displayName: 'Cliente',
      description: 'Acceso básico como cliente',
      priority: 10,
      permissions: [
        'appointments.read_own',
        'appointments.create_own',
        'appointments.update_own',
        'services.read',
        'providers.read',
        'profile.read',
        'profile.update',
      ],
    },
  ];

  // Permisos del sistema
  private readonly systemPermissions: SystemPermission[] = [
    // Usuarios
    {
      name: 'users.read',
      displayName: 'Ver usuarios',
      description: 'Ver lista de usuarios',
      category: 'users',
    },
    {
      name: 'users.create',
      displayName: 'Crear usuarios',
      description: 'Crear nuevos usuarios',
      category: 'users',
    },
    {
      name: 'users.update',
      displayName: 'Editar usuarios',
      description: 'Modificar información de usuarios',
      category: 'users',
    },
    {
      name: 'users.delete',
      displayName: 'Eliminar usuarios',
      description: 'Eliminar usuarios del sistema',
      category: 'users',
    },

    // Roles
    {
      name: 'roles.read',
      displayName: 'Ver roles',
      description: 'Ver roles y permisos',
      category: 'roles',
    },
    {
      name: 'roles.create',
      displayName: 'Crear roles',
      description: 'Crear nuevos roles',
      category: 'roles',
    },
    {
      name: 'roles.update',
      displayName: 'Editar roles',
      description: 'Modificar roles y permisos',
      category: 'roles',
    },
    {
      name: 'roles.delete',
      displayName: 'Eliminar roles',
      description: 'Eliminar roles personalizados',
      category: 'roles',
    },

    // Citas
    {
      name: 'appointments.read',
      displayName: 'Ver todas las citas',
      description: 'Ver todas las citas del sistema',
      category: 'appointments',
    },
    {
      name: 'appointments.read_own',
      displayName: 'Ver mis citas',
      description: 'Ver solo las citas propias',
      category: 'appointments',
    },
    {
      name: 'appointments.create',
      displayName: 'Crear citas',
      description: 'Crear nuevas citas',
      category: 'appointments',
    },
    {
      name: 'appointments.create_own',
      displayName: 'Crear mis citas',
      description: 'Crear citas para sí mismo',
      category: 'appointments',
    },
    {
      name: 'appointments.update',
      displayName: 'Editar citas',
      description: 'Modificar cualquier cita',
      category: 'appointments',
    },
    {
      name: 'appointments.update_own',
      displayName: 'Editar mis citas',
      description: 'Modificar solo las citas propias',
      category: 'appointments',
    },
    {
      name: 'appointments.delete',
      displayName: 'Eliminar citas',
      description: 'Eliminar cualquier cita',
      category: 'appointments',
    },

    // Servicios
    {
      name: 'services.read',
      displayName: 'Ver servicios',
      description: 'Ver lista de servicios',
      category: 'services',
    },
    {
      name: 'services.create',
      displayName: 'Crear servicios',
      description: 'Crear nuevos servicios',
      category: 'services',
    },
    {
      name: 'services.update',
      displayName: 'Editar servicios',
      description: 'Modificar servicios',
      category: 'services',
    },
    {
      name: 'services.delete',
      displayName: 'Eliminar servicios',
      description: 'Eliminar servicios',
      category: 'services',
    },

    // Profesionales
    {
      name: 'providers.read',
      displayName: 'Ver profesionales',
      description: 'Ver lista de profesionales',
      category: 'providers',
    },
    {
      name: 'providers.create',
      displayName: 'Crear profesionales',
      description: 'Registrar nuevos profesionales',
      category: 'providers',
    },
    {
      name: 'providers.update',
      displayName: 'Editar profesionales',
      description: 'Modificar información de profesionales',
      category: 'providers',
    },
    {
      name: 'providers.delete',
      displayName: 'Eliminar profesionales',
      description: 'Eliminar profesionales',
      category: 'providers',
    },

    // Clientes
    {
      name: 'clients.read',
      displayName: 'Ver clientes',
      description: 'Ver lista de clientes',
      category: 'clients',
    },
    {
      name: 'clients.create',
      displayName: 'Crear clientes',
      description: 'Registrar nuevos clientes',
      category: 'clients',
    },
    {
      name: 'clients.update',
      displayName: 'Editar clientes',
      description: 'Modificar información de clientes',
      category: 'clients',
    },

    // Horarios
    {
      name: 'schedule.read',
      displayName: 'Ver horarios',
      description: 'Ver horarios de trabajo',
      category: 'schedule',
    },
    {
      name: 'schedule.update',
      displayName: 'Editar horarios',
      description: 'Modificar horarios de trabajo',
      category: 'schedule',
    },

    // Reportes
    {
      name: 'reports.read',
      displayName: 'Ver reportes',
      description: 'Acceso a reportes y estadísticas',
      category: 'reports',
    },

    // Configuración
    {
      name: 'settings.read',
      displayName: 'Ver configuración',
      description: 'Ver configuración del sistema',
      category: 'settings',
    },
    {
      name: 'settings.update',
      displayName: 'Editar configuración',
      description: 'Modificar configuración del sistema',
      category: 'settings',
    },

    // Perfil
    {
      name: 'profile.read',
      displayName: 'Ver perfil',
      description: 'Ver información del perfil',
      category: 'profile',
    },
    {
      name: 'profile.update',
      displayName: 'Editar perfil',
      description: 'Modificar información del perfil',
      category: 'profile',
    },
  ];

  async initializeTenantRolesAndPermissions(tenantId: string) {
    // Crear permisos del sistema
    for (const permission of this.systemPermissions) {
      await this.prisma.permission.upsert({
        where: {
          tenantId_name: {
            tenantId,
            name: permission.name,
          },
        },
        update: {},
        create: {
          tenantId,
          name: permission.name,
          displayName: permission.displayName,
          description: permission.description,
          category: permission.category,
          isSystemPermission: true,
        },
      });
    }

    // Crear roles del sistema
    for (const role of this.systemRoles) {
      const createdRole = await this.prisma.role.upsert({
        where: {
          tenantId_name: {
            tenantId,
            name: role.name,
          },
        },
        update: {},
        create: {
          tenantId,
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          priority: role.priority,
          isSystemRole: true,
        },
      });

      // Asignar permisos al rol
      if (role.permissions.includes('*')) {
        // Asignar todos los permisos
        const allPermissions = await this.prisma.permission.findMany({
          where: { tenantId },
        });

        for (const permission of allPermissions) {
          await this.prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: createdRole.id,
                permissionId: permission.id,
              },
            },
            update: {},
            create: {
              tenantId,
              roleId: createdRole.id,
              permissionId: permission.id,
            },
          });
        }
      } else {
        // Asignar permisos específicos
        for (const permissionName of role.permissions) {
          const permission = await this.prisma.permission.findUnique({
            where: {
              tenantId_name: {
                tenantId,
                name: permissionName,
              },
            },
          });

          if (permission) {
            await this.prisma.rolePermission.upsert({
              where: {
                roleId_permissionId: {
                  roleId: createdRole.id,
                  permissionId: permission.id,
                },
              },
              update: {},
              create: {
                tenantId,
                roleId: createdRole.id,
                permissionId: permission.id,
              },
            });
          }
        }
      }
    }
  }

  async getUserPermissions(
    userId: string,
    tenantId: string,
  ): Promise<string[]> {
    const userTenant = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!userTenant || !userTenant.role) {
      return [];
    }

    return userTenant.role.rolePermissions.map((rp) => rp.permission.name);
  }

  async hasPermission(
    userId: string,
    tenantId: string,
    permission: string,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, tenantId);

    // El rol owner tiene todos los permisos
    if (permissions.includes('*')) {
      return true;
    }

    return permissions.includes(permission);
  }

  async assignRoleToUser(userId: string, tenantId: string, roleName: string) {
    const role = await this.prisma.role.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name: roleName,
        },
      },
    });

    if (!role) {
      throw new Error(`Rol ${roleName} no encontrado`);
    }

    await this.prisma.userTenant.update({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      data: {
        roleId: role.id,
      },
    });
  }

  async getRolesByTenant(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId, isActive: true },
      orderBy: { priority: 'desc' },
    });
  }

  async getPermissionsByTenant(tenantId: string) {
    return this.prisma.permission.findMany({
      where: { tenantId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }
}
