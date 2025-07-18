import { PrismaClient } from '@prisma/client';
import { SystemFeature } from '../config/system-features';
import { PlanConfiguration } from '../config/plans-configuration';

export interface InitializationStats {
  totalFeatures: number;
  totalPlans: number;
  totalPlanFeatures: number;
  featuresByCategory: Array<{
    category: string | null;
    _count: { id: number };
  }>;
}

export class InitializationUtils {
  constructor(private prisma: PrismaClient) {}

  async initializeFeatures(features: SystemFeature[]): Promise<{
    created: number;
    updated: number;
  }> {
    let created = 0;
    let updated = 0;

    console.log('🔧 Inicializando features del sistema...');

    for (const feature of features) {
      const existingFeature = await this.prisma.feature.findUnique({
        where: { key: feature.key },
      });

      if (existingFeature) {
        await this.prisma.feature.update({
          where: { key: feature.key },
          data: {
            name: feature.name,
            description: feature.description,
            category: feature.category,
            isCore: feature.isCore,
            defaultLimit: feature.defaultLimit,
            defaultIsUnlimited: feature.defaultIsUnlimited,
            isActive: true,
          },
        });
        updated++;
      } else {
        await this.prisma.feature.create({
          data: {
            key: feature.key,
            name: feature.name,
            description: feature.description,
            category: feature.category,
            isCore: feature.isCore,
            defaultLimit: feature.defaultLimit,
            defaultIsUnlimited: feature.defaultIsUnlimited,
            isActive: true,
          },
        });
        created++;
      }
    }

    console.log(
      `   ✅ Features procesadas: ${created} creadas, ${updated} actualizadas`,
    );
    return { created, updated };
  }

  async initializePlans(plans: PlanConfiguration[]): Promise<void> {
    console.log('📋 Configurando planes...');

    for (const planConfig of plans) {
      console.log(`   📦 Procesando plan: ${planConfig.name}`);

      // Crear o actualizar el plan
      const plan = await this.prisma.plan.upsert({
        where: { slug: planConfig.slug },
        update: {
          name: planConfig.name,
          description: planConfig.description,
          monthlyPrice: planConfig.monthlyPrice,
          yearlyPrice: planConfig.yearlyPrice,
          isPopular: planConfig.isPopular || false,
          maxTenants: planConfig.maxTenants,
          maxUsers: planConfig.maxUsers,
          sortOrder: planConfig.sortOrder,
          isActive: true,
        },
        create: {
          name: planConfig.name,
          slug: planConfig.slug,
          description: planConfig.description,
          monthlyPrice: planConfig.monthlyPrice,
          yearlyPrice: planConfig.yearlyPrice,
          isPopular: planConfig.isPopular || false,
          maxTenants: planConfig.maxTenants,
          maxUsers: planConfig.maxUsers,
          sortOrder: planConfig.sortOrder,
          isActive: true,
        },
      });

      // Limpiar configuraciones de features existentes
      await this.prisma.planFeature.deleteMany({
        where: { planId: plan.id },
      });

      // Configurar features del plan
      const featuresConfigured = await this.configurePlanFeatures(
        plan.id,
        planConfig.features,
      );

      console.log(`      ✅ ${featuresConfigured} features configuradas`);
    }
  }

  private async configurePlanFeatures(
    planId: string,
    featuresConfig: Record<string, any>,
  ): Promise<number> {
    let configured = 0;

    for (const [featureKey, featureConfig] of Object.entries(featuresConfig)) {
      const feature = await this.prisma.feature.findUnique({
        where: { key: featureKey },
      });

      if (!feature) {
        console.warn(`      ⚠️  Feature no encontrada: ${featureKey}`);
        continue;
      }

      await this.prisma.planFeature.create({
        data: {
          planId,
          featureId: feature.id,
          isIncluded: featureConfig.isIncluded,
          isUnlimited: featureConfig.isUnlimited || false,
          limit: featureConfig.limit,
        },
      });

      configured++;
    }

    return configured;
  }

  async generateStats(): Promise<InitializationStats> {
    const [totalFeatures, totalPlans, totalPlanFeatures] = await Promise.all([
      this.prisma.feature.count({ where: { isActive: true } }),
      this.prisma.plan.count({ where: { isActive: true } }),
      this.prisma.planFeature.count(),
    ]);

    const featuresByCategory = await this.prisma.feature.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { id: true },
    });

    return {
      totalFeatures,
      totalPlans,
      totalPlanFeatures,
      featuresByCategory,
    };
  }

  displaySummary(stats: InitializationStats): void {
    console.log('\n📊 Resumen de la configuración:');
    console.log(`   • Total de features: ${stats.totalFeatures}`);
    console.log(`   • Total de planes: ${stats.totalPlans}`);
    console.log(
      `   • Configuraciones plan-feature: ${stats.totalPlanFeatures}`,
    );

    console.log('\n📈 Features por categoría:');
    stats.featuresByCategory.forEach((category) => {
      const categoryName = this.getCategoryDisplayName(category.category);
      console.log(`   • ${categoryName}: ${category._count.id} features`);
    });
  }

  async displayPlanDetails(): Promise<void> {
    console.log('\n📋 Planes configurados:\n');

    const plans = await this.prisma.plan.findMany({
      include: {
        features: {
          include: {
            feature: true,
          },
          where: {
            isIncluded: true,
          },
        },
      },
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    for (const plan of plans) {
      const monthlyPrice = plan.monthlyPrice
        ? `${plan.monthlyPrice?.toLocaleString()} CLP`
        : 'Gratis';
      const yearlyPrice = plan.yearlyPrice
        ? `${plan.yearlyPrice?.toLocaleString()} CLP`
        : 'Gratis';

      console.log(`🏷️  ${plan.name} ${plan.isPopular ? '⭐ POPULAR' : ''}`);
      console.log(`   📄 ${plan.description}`);
      console.log(`   💰 Precios: ${monthlyPrice}/mes • ${yearlyPrice}/año`);
      console.log(`   👥 Usuarios: ${plan.maxUsers || 'Ilimitados'}`);
      console.log(`   🏢 Tenants: ${plan.maxTenants || 'Ilimitados'}`);

      // Agrupar features por categoría
      const featuresByCategory = this.groupFeaturesByCategory(plan.features);

      console.log(`   🔧 Features incluidas (${plan.features.length} total):`);

      Object.entries(featuresByCategory).forEach(([category, features]) => {
        const categoryName = this.getCategoryDisplayName(category);
        console.log(`      📦 ${categoryName}: ${features.length} features`);
      });

      console.log(''); // Línea en blanco entre planes
    }
  }

  private groupFeaturesByCategory(planFeatures: any[]): Record<string, any[]> {
    return planFeatures.reduce((acc, pf) => {
      const category = pf.feature.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(pf);
      return acc;
    }, {});
  }

  private getCategoryDisplayName(category: string | null): string {
    if (!category) {
      return 'Sin Categoría';
    }

    const categoryNames: Record<string, string> = {
      core: 'CORE',
      capacity: 'CAPACIDAD',
      advanced: 'AVANZADAS',
      marketing: 'MARKETING',
      integrations: 'INTEGRACIONES',
      premium: 'PREMIUM',
    };

    return categoryNames[category] || category.toUpperCase();
  }

  async validateConfiguration(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('🔍 Validando configuración...');

    // Validar que todos los planes tienen al menos una feature core
    const plans = await this.prisma.plan.findMany({
      include: {
        features: {
          include: {
            feature: true,
          },
          where: {
            isIncluded: true,
            feature: {
              isCore: true,
            },
          },
        },
      },
      where: { isActive: true },
    });

    for (const plan of plans) {
      if (plan.features.length === 0) {
        errors.push(`Plan ${plan.name} no tiene features core incluidas`);
      }
    }

    // Validar que todas las features referenciadas en planes existen
    const allPlanFeatures = await this.prisma.planFeature.findMany({
      include: {
        feature: true,
        plan: true,
      },
    });

    for (const planFeature of allPlanFeatures) {
      if (!planFeature.feature) {
        errors.push(
          `Plan ${planFeature.plan?.name} referencia feature inexistente`,
        );
      }
    }

    // Validar precios
    const plansWithPricing = await this.prisma.plan.findMany({
      where: {
        isActive: true,
        OR: [{ monthlyPrice: { gt: 0 } }, { yearlyPrice: { gt: 0 } }],
      },
    });

    for (const plan of plansWithPricing) {
      if (plan.monthlyPrice && plan.yearlyPrice) {
        const expectedYearlyPrice = Number(plan.monthlyPrice) * 10; // 2 meses gratis
        const actualYearlyPrice = Number(plan.yearlyPrice);

        if (Math.abs(actualYearlyPrice - expectedYearlyPrice) > 100) {
          warnings.push(
            `Plan ${plan.name}: precio anual no coincide con descuento esperado de 2 meses`,
          );
        }
      }
    }

    const isValid = errors.length === 0;

    if (errors.length > 0) {
      console.log('\n❌ Errores encontrados:');
      errors.forEach((error) => console.log(`   • ${error}`));
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  Advertencias:');
      warnings.forEach((warning) => console.log(`   • ${warning}`));
    }

    if (isValid && warnings.length === 0) {
      console.log('   ✅ Configuración válida');
    }

    return { isValid, errors, warnings };
  }

  async cleanup(): Promise<void> {
    // Limpiar features inactivas
    await this.prisma.feature.deleteMany({
      where: { isActive: false },
    });

    // Limpiar planes inactivos
    await this.prisma.plan.deleteMany({
      where: { isActive: false },
    });

    console.log('🧹 Limpieza completada');
  }
}
