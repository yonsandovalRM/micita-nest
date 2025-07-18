import { PrismaClient } from '@prisma/client';
import { RolesPermissionsService } from '../src/common/services/roles-permissions.service';

async function initializeRoles() {
  const prisma = new PrismaClient();

  // Crear una instancia temporal del servicio
  const rolesService = new RolesPermissionsService(prisma);

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
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  initializeRoles();
}

export { initializeRoles };
