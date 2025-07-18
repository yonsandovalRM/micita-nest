import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../services/prisma.service';

export interface SubscriptionAccessConfig {
  requireActive?: boolean;
  allowTrial?: boolean;
  message?: string;
}

export const RequireActiveSubscription = (
  config: SubscriptionAccessConfig = {},
) => {
  const defaultConfig: SubscriptionAccessConfig = {
    requireActive: true,
    allowTrial: true,
    message:
      'Se requiere una suscripción activa para acceder a esta funcionalidad',
    ...config,
  };

  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    const reflector = new Reflector();
    reflector.get('subscriptionAccess', descriptor?.value || target);
    Reflect.defineMetadata(
      'subscriptionAccess',
      defaultConfig,
      descriptor?.value || target,
    );
  };
};

@Injectable()
export class SubscriptionAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const subscriptionConfig = this.reflector.get<SubscriptionAccessConfig>(
      'subscriptionAccess',
      context.getHandler(),
    );

    if (!subscriptionConfig) {
      return true; // No hay restricción de suscripción
    }

    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;

    if (!tenant) {
      throw new ForbiddenException('Tenant no encontrado');
    }

    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          tenantId: tenant.id,
          status: { in: ['active', 'trial', 'pending'] },
        },
        include: {
          plan: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!subscription) {
        throw new ForbiddenException(
          subscriptionConfig.message || 'No se encontró una suscripción activa',
        );
      }

      // Verificar si la suscripción está activa
      if (
        subscriptionConfig.requireActive &&
        subscription.status !== 'active'
      ) {
        // Si está en trial y se permite trial
        if (subscription.status === 'trial' && subscriptionConfig.allowTrial) {
          // Verificar que el trial no haya expirado
          if (
            subscription.trialEndDate &&
            subscription.trialEndDate < new Date()
          ) {
            throw new ForbiddenException(
              'Tu período de prueba ha expirado. Actualiza tu plan para continuar.',
            );
          }
          return true;
        }

        // Si está pendiente
        if (subscription.status === 'pending') {
          throw new ForbiddenException(
            'Tu suscripción está pendiente de pago. Completa el proceso de pago para continuar.',
          );
        }

        throw new ForbiddenException(
          subscriptionConfig.message || 'Se requiere una suscripción activa',
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException(
        'Error verificando el estado de la suscripción',
      );
    }
  }
}
