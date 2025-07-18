import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface FeatureAccess {
  hasAccess: boolean;
  isUnlimited: boolean;
  limit?: number | null;
  currentUsage?: number;
  remainingUsage?: number;
}

export interface SystemFeature {
  key: string;
  name: string;
  description: string;
  category: string;
  isCore: boolean;
  defaultLimit?: number | null;
  defaultIsUnlimited: boolean;
}

@Injectable()
export class FeaturesService {
  constructor(private prisma: PrismaService) {}

  // Features del sistema por defecto
  private readonly systemFeatures: SystemFeature[] = [
    // Features Core (disponibles en todos los planes)
    {
      key: 'basic_appointments',
      name: 'Gestión Básica de Citas',
      description: 'Crear, editar y gestionar citas básicas',
      category: 'core',
      isCore: true,
      defaultIsUnlimited: true,
    },
    {
      key: 'basic_clients',
      name: 'Gestión Básica de Clientes',
      description: 'Crear y gestionar información de clientes',
      category: 'core',
      isCore: true,
      defaultIsUnlimited: true,
    },
    {
      key: 'basic_services',
      name: 'Gestión Básica de Servicios',
      description: 'Crear y gestionar servicios básicos',
      category: 'core',
      isCore: true,
      defaultLimit: 10,
      defaultIsUnlimited: false,
    },

    // Features de Capacidad
    {
      key: 'monthly_appointments',
      name: 'Citas Mensuales',
      description: 'Límite de citas que se pueden crear por mes',
      category: 'capacity',
      isCore: false,
      defaultLimit: 50,
      defaultIsUnlimited: false,
    },
    {
      key: 'total_clients',
      name: 'Total de Clientes',
      description: 'Límite total de clientes registrados',
      category: 'capacity',
      isCore: false,
      defaultLimit: 100,
      defaultIsUnlimited: false,
    },
    {
      key: 'providers',
      name: 'Profesionales',
      description: 'Número de profesionales que pueden ser registrados',
      category: 'capacity',
      isCore: false,
      defaultLimit: 1,
      defaultIsUnlimited: false,
    },

    // Features Avanzadas
    {
      key: 'advanced_reports',
      name: 'Reportes Avanzados',
      description: 'Acceso a reportes detallados y analytics',
      category: 'advanced',
      isCore: false,
      defaultIsUnlimited: false,
    },
    {
      key: 'custom_fields',
      name: 'Campos Personalizados',
      description: 'Crear campos personalizados para clientes y citas',
      category: 'advanced',
      isCore: false,
      defaultLimit: 5,
      defaultIsUnlimited: false,
    },
    {
      key: 'automated_reminders',
      name: 'Recordatorios Automáticos',
      description: 'Envío automático de recordatorios por email/SMS',
      category: 'advanced',
      isCore: false,
      defaultIsUnlimited: false,
    },
    {
      key: 'online_booking',
      name: 'Reservas Online',
      description: 'Widget de reservas online para sitio web',
      category: 'advanced',
      isCore: false,
      defaultIsUnlimited: false,
    },
    {
      key: 'multi_location',
      name: 'Múltiples Ubicaciones',
      description: 'Gestionar múltiples sucursales o ubicaciones',
      category: 'advanced',
      isCore: false,
      defaultLimit: 1,
      defaultIsUnlimited: false,
    },

    // Features de Integración
    {
      key: 'api_access',
      name: 'Acceso API',
      description: 'Acceso a la API REST para integraciones',
      category: 'integrations',
      isCore: false,
      defaultIsUnlimited: false,
    },
    {
      key: 'webhook_notifications',
      name: 'Webhooks',
      description: 'Notificaciones webhook para eventos',
      category: 'integrations',
      isCore: false,
      defaultLimit: 5,
      defaultIsUnlimited: false,
    },
    {
      key: 'third_party_integrations',
      name: 'Integraciones Terceros',
      description: 'Conectar con calendarios externos y otros sistemas',
      category: 'integrations',
      isCore: false,
      defaultIsUnlimited: false,
    },

    // Features Premium
    {
      key: 'white_label',
      name: 'Marca Blanca',
      description: 'Personalización completa de marca y dominio',
      category: 'premium',
      isCore: false,
      defaultIsUnlimited: false,
    },
    {
      key: 'priority_support',
      name: 'Soporte Prioritario',
      description: 'Soporte técnico prioritario 24/7',
      category: 'premium',
      isCore: false,
      defaultIsUnlimited: false,
    },
    {
      key: 'advanced_security',
      name: 'Seguridad Avanzada',
      description: 'Features de seguridad adicionales como 2FA, audit logs',
      category: 'premium',
      isCore: false,
      defaultIsUnlimited: false,
    },
  ];

  async initializeSystemFeatures() {
    for (const feature of this.systemFeatures) {
      await this.prisma.feature.upsert({
        where: { key: feature.key },
        update: {},
        create: {
          key: feature.key,
          name: feature.name,
          description: feature.description,
          category: feature.category,
          isCore: feature.isCore,
          defaultLimit: feature.defaultLimit,
          defaultIsUnlimited: feature.defaultIsUnlimited,
        },
      });
    }
  }

  async checkFeatureAccess(
    tenantId: string,
    featureKey: string,
    requiredUsage: number = 1,
  ): Promise<FeatureAccess> {
    // Obtener la suscripción activa del tenant
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'active',
        endDate: {
          gte: new Date(),
        },
      },
      include: {
        plan: {
          include: {
            features: {
              include: {
                feature: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      // Sin suscripción activa, solo acceso a features core
      const feature = await this.prisma.feature.findUnique({
        where: { key: featureKey },
      });

      if (!feature || !feature.isCore) {
        return {
          hasAccess: false,
          isUnlimited: false,
        };
      }

      return {
        hasAccess: true,
        isUnlimited: feature.defaultIsUnlimited,
        limit: feature.defaultLimit,
      };
    }

    // Buscar la feature en el plan
    const planFeature = subscription.plan.features.find(
      (pf) => pf.feature.key === featureKey,
    );

    if (!planFeature || !planFeature.isIncluded) {
      // Feature no incluida en el plan
      return {
        hasAccess: false,
        isUnlimited: false,
      };
    }

    // Si es ilimitada, acceso completo
    if (planFeature.isUnlimited) {
      return {
        hasAccess: true,
        isUnlimited: true,
      };
    }

    // Verificar límites si los hay
    if (planFeature.limit) {
      const currentPeriod = this.getCurrentPeriod();
      const usageRecord = await this.prisma.usageRecord.findUnique({
        where: {
          subscriptionId_featureKey_period: {
            subscriptionId: subscription.id,
            featureKey,
            period: currentPeriod,
          },
        },
      });

      const currentUsage = usageRecord?.usage || 0;
      const remainingUsage = planFeature.limit - currentUsage;

      return {
        hasAccess: remainingUsage >= requiredUsage,
        isUnlimited: false,
        limit: planFeature.limit,
        currentUsage,
        remainingUsage,
      };
    }

    // Sin límites específicos, acceso permitido
    return {
      hasAccess: true,
      isUnlimited: false,
    };
  }

  async recordFeatureUsage(
    tenantId: string,
    featureKey: string,
    usage: number = 1,
  ) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'active',
        endDate: {
          gte: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      return; // Sin suscripción, no registramos uso
    }

    const currentPeriod = this.getCurrentPeriod();

    await this.prisma.usageRecord.upsert({
      where: {
        subscriptionId_featureKey_period: {
          subscriptionId: subscription.id,
          featureKey,
          period: currentPeriod,
        },
      },
      update: {
        usage: {
          increment: usage,
        },
      },
      create: {
        subscriptionId: subscription.id,
        featureKey,
        period: currentPeriod,
        usage,
      },
    });
  }

  async requireFeatureAccess(
    tenantId: string,
    featureKey: string,
    requiredUsage: number = 1,
    customMessage?: string,
  ) {
    const access = await this.checkFeatureAccess(
      tenantId,
      featureKey,
      requiredUsage,
    );

    if (!access.hasAccess) {
      const feature = await this.prisma.feature.findUnique({
        where: { key: featureKey },
      });

      const message =
        customMessage ||
        `Tu plan actual no incluye acceso a: ${feature?.name || featureKey}. Actualiza tu plan para continuar.`;

      throw new ForbiddenException(message);
    }

    // Registrar el uso si hay acceso
    if (access.hasAccess && !access.isUnlimited && access.limit) {
      await this.recordFeatureUsage(tenantId, featureKey, requiredUsage);
    }

    return access;
  }

  async getTenantFeatures(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'active',
        endDate: {
          gte: new Date(),
        },
      },
      include: {
        plan: {
          include: {
            features: {
              include: {
                feature: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const currentPeriod = this.getCurrentPeriod();
    const features: Array<{
      key: string;
      name: string;
      description: string | null;
      category: string | null;
      hasAccess: boolean;
      isUnlimited: boolean;
      limit?: number | null;
      currentUsage: number;
    }> = [];

    if (!subscription) {
      // Sin suscripción, solo features core
      const coreFeatures = await this.prisma.feature.findMany({
        where: { isCore: true, isActive: true },
      });

      for (const feature of coreFeatures) {
        features.push({
          key: feature.key,
          name: feature.name,
          description: feature.description,
          category: feature.category,
          hasAccess: true,
          isUnlimited: feature.defaultIsUnlimited,
          limit: feature.defaultLimit,
          currentUsage: 0,
        });
      }
    } else {
      // Con suscripción, features del plan
      for (const planFeature of subscription.plan.features) {
        if (!planFeature.isIncluded) continue;

        let currentUsage = 0;
        if (planFeature.limit && !planFeature.isUnlimited) {
          const usageRecord = await this.prisma.usageRecord.findUnique({
            where: {
              subscriptionId_featureKey_period: {
                subscriptionId: subscription.id,
                featureKey: planFeature.feature.key,
                period: currentPeriod,
              },
            },
          });
          currentUsage = usageRecord?.usage || 0;
        }

        features.push({
          key: planFeature.feature.key,
          name: planFeature.feature.name,
          description: planFeature.feature.description,
          category: planFeature.feature.category,
          hasAccess: true,
          isUnlimited: planFeature.isUnlimited,
          limit: planFeature.limit,
          currentUsage,
        });
      }
    }

    return features;
  }

  async getUsageStats(tenantId: string, period?: string) {
    const targetPeriod = period || this.getCurrentPeriod();

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'active',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      return [];
    }

    return this.prisma.usageRecord.findMany({
      where: {
        subscriptionId: subscription.id,
        period: targetPeriod,
      },
      orderBy: {
        featureKey: 'asc',
      },
    });
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async resetUsageForPeriod(subscriptionId: string, period: string) {
    await this.prisma.usageRecord.deleteMany({
      where: {
        subscriptionId,
        period,
      },
    });
  }

  async getFeatureByKey(featureKey: string) {
    return this.prisma.feature.findUnique({
      where: { key: featureKey },
    });
  }

  async getAllFeatures() {
    return this.prisma.feature.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }
}
