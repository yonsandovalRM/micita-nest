import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/common/services/prisma.service';
import { RolesPermissionsService } from '../src/common/services/roles-permissions.service';

async function initializeRoles() {
  const prisma = new PrismaClient();

  // Crear instancia de PrismaService que extiende PrismaClient
  const prismaService = new PrismaService();
  await prismaService.onModuleInit();

  // Crear una instancia del servicio con PrismaService
  const rolesService = new RolesPermissionsService(prismaService);

  try {
    // Obtener todos los tenants activos
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
    });

    console.log(`Encontrados ${tenants.length} tenants para inicializar`);

    for (const tenant of tenants) {
      console.log(
        `Inicializando roles para tenant: ${tenant.name} (${tenant.slug})`,
      );

      try {
        await rolesService.initializeTenantRolesAndPermissions(tenant.id);
        console.log(`✅ Tenant ${tenant.slug} inicializado correctamente`);
      } catch (error) {
        console.error(`❌ Error inicializando tenant ${tenant.slug}:`, error);
      }
    }

    console.log('\n🎉 Migración completada!');
  } catch (error) {
    console.error('Error durante la migración:', error);
  } finally {
    await prisma.$disconnect();
    await prismaService.onModuleDestroy();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  initializeRoles();
}

export { initializeRoles };
