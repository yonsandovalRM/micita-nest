import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeaturesService } from '../services/features.service';
import { FeatureAccessConfig } from '../decorators/feature-access.decorator';

@Injectable()
export class FeatureAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featuresService: FeaturesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureConfig = this.reflector.get<FeatureAccessConfig>(
      'featureAccess',
      context.getHandler(),
    );

    if (!featureConfig) {
      return true; // No hay restricción de feature
    }

    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;

    if (!tenant) {
      throw new ForbiddenException('Tenant no encontrado');
    }

    try {
      await this.featuresService.requireFeatureAccess(
        tenant.id,
        featureConfig.feature,
        featureConfig.usage || 1,
        featureConfig.message,
      );
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException(
        `Error verificando acceso a feature: ${featureConfig.feature}`,
      );
    }
  }
}
