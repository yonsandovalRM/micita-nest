import { SetMetadata } from '@nestjs/common';

export interface SubscriptionRequirement {
  requireActive?: boolean;
  allowTrial?: boolean;
  message?: string;
}

export const RequireSubscription = (config: SubscriptionRequirement = {}) => {
  const defaultConfig: SubscriptionRequirement = {
    requireActive: true,
    allowTrial: true,
    message:
      'Se requiere una suscripción activa para acceder a esta funcionalidad',
    ...config,
  };

  return SetMetadata('subscriptionAccess', defaultConfig);
};

// Decoradores específicos para casos comunes
export const RequireActiveSubscription = () =>
  SetMetadata('subscriptionAccess', {
    requireActive: true,
    allowTrial: false,
    message:
      'Se requiere una suscripción de pago activa para esta funcionalidad',
  });

export const RequirePaidSubscription = () =>
  SetMetadata('subscriptionAccess', {
    requireActive: true,
    allowTrial: false,
    message: 'Esta funcionalidad solo está disponible en planes de pago',
  });

export const AllowTrialAccess = () =>
  SetMetadata('subscriptionAccess', {
    requireActive: false,
    allowTrial: true,
    message: 'Se requiere una suscripción activa o período de prueba',
  });
