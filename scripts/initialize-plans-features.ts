import { PrismaClient } from '@prisma/client';
import { SYSTEM_FEATURES } from './config/system-features';
import { PLANS_CONFIGURATION } from './config/plans-configuration';
import { InitializationUtils } from './utils/initialization-utils';

async function initializePlansAndFeatures() {
  const prisma = new PrismaClient();
  const utils = new InitializationUtils(prisma);

  try {
    console.log('🚀 Iniciando configuración de planes y features...\n');

    // 1. Inicializar features del sistema
    const featureResults = await utils.initializeFeatures(SYSTEM_FEATURES);
    console.log('');

    // 2. Inicializar planes
    await utils.initializePlans(PLANS_CONFIGURATION);
    console.log('');

    // 3. Generar y mostrar estadísticas
    console.log('🎉 Configuración completada exitosamente!\n');
    const stats = await utils.generateStats();
    utils.displaySummary(stats);

    // 4. Mostrar detalles de los planes
    await utils.displayPlanDetails();

    // 5. Validar configuración
    const validation = await utils.validateConfiguration();

    if (!validation.isValid) {
      console.log('\n❌ Se encontraron errores en la configuración');
      process.exit(1);
    }

    // 6. Limpieza opcional
    await utils.cleanup();

    console.log('\n✨ Proceso completado exitosamente');
    console.log('\n📝 Próximos pasos:');
    console.log(
      '   1. Verificar que los planes se muestran correctamente en el frontend',
    );
    console.log('   2. Probar la creación de suscripciones');
    console.log('   3. Validar las restricciones de features');
    console.log('   4. Configurar las credenciales de MercadoPago');
  } catch (error) {
    console.error('💥 Error durante la inicialización:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para inicializar solo features
async function initializeFeaturesOnly() {
  const prisma = new PrismaClient();
  const utils = new InitializationUtils(prisma);

  try {
    console.log('🔧 Inicializando solo features...\n');

    const results = await utils.initializeFeatures(SYSTEM_FEATURES);

    console.log('\n✅ Features inicializadas exitosamente');
    console.log(`   • Creadas: ${results.created}`);
    console.log(`   • Actualizadas: ${results.updated}`);
  } catch (error) {
    console.error('❌ Error inicializando features:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para inicializar solo planes
async function initializePlansOnly() {
  const prisma = new PrismaClient();
  const utils = new InitializationUtils(prisma);

  try {
    console.log('📋 Inicializando solo planes...\n');

    await utils.initializePlans(PLANS_CONFIGURATION);

    console.log('\n✅ Planes inicializados exitosamente');

    const stats = await utils.generateStats();
    console.log(`   • Total planes: ${stats.totalPlans}`);
    console.log(`   • Total configuraciones: ${stats.totalPlanFeatures}`);
  } catch (error) {
    console.error('❌ Error inicializando planes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para validar configuración actual
async function validateCurrentConfiguration() {
  const prisma = new PrismaClient();
  const utils = new InitializationUtils(prisma);

  try {
    console.log('🔍 Validando configuración actual...\n');

    const validation = await utils.validateConfiguration();

    if (validation.isValid) {
      console.log('\n✅ Configuración válida');
    } else {
      console.log('\n❌ Configuración inválida');
      console.log('Errores:');
      validation.errors.forEach((error) => console.log(`   • ${error}`));
    }

    if (validation.warnings.length > 0) {
      console.log('\nAdvertencias:');
      validation.warnings.forEach((warning) => console.log(`   • ${warning}`));
    }
  } catch (error) {
    console.error('❌ Error validando configuración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para mostrar estadísticas actuales
async function showCurrentStats() {
  const prisma = new PrismaClient();
  const utils = new InitializationUtils(prisma);

  try {
    console.log('📊 Estadísticas actuales...\n');

    const stats = await utils.generateStats();
    utils.displaySummary(stats);

    await utils.displayPlanDetails();
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Manejo de argumentos de línea de comandos
const command = process.argv[2];

switch (command) {
  case 'features':
    initializeFeaturesOnly()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    break;

  case 'plans':
    initializePlansOnly()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    break;

  case 'validate':
    validateCurrentConfiguration()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    break;

  case 'stats':
    showCurrentStats()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    break;

  default:
    // Si no hay comando o comando inválido, ejecutar inicialización completa
    initializePlansAndFeatures()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
}

// Exportar funciones para uso en otros módulos
export {
  initializePlansAndFeatures,
  initializeFeaturesOnly,
  initializePlansOnly,
  validateCurrentConfiguration,
  showCurrentStats,
};
