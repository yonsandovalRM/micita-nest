import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  SubscriptionsService,
  CreateSubscriptionRequest,
} from './subscriptions.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantAccessGuard } from '../common/guards/tenant-access.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import {
  CurrentTenant,
  CurrentUser,
} from '../common/decorators/tenant.decorator';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsEmail,
  IsOptional,
  IsObject,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

class BackUrlsDto {
  @IsOptional()
  @IsString()
  success?: string;

  @IsOptional()
  @IsString()
  failure?: string;

  @IsOptional()
  @IsString()
  pending?: string;
}

class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsEnum(['monthly', 'yearly'])
  billingCycle: 'monthly' | 'yearly';

  @IsEmail()
  payerEmail: string;

  @IsOptional()
  @IsBoolean()
  startTrial?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => BackUrlsDto)
  backUrls?: BackUrlsDto;
}

class CreateTrialDto {
  @IsString()
  @IsNotEmpty()
  planId: string;
}

class ConvertTrialDto {
  @IsEnum(['monthly', 'yearly'])
  billingCycle: 'monthly' | 'yearly';

  @IsEmail()
  payerEmail: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BackUrlsDto)
  backUrls?: BackUrlsDto;
}

class CancelSubscriptionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

class WebhookMercadoPagoDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  data?: any;
}

@Controller('subscriptions')
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(private subscriptionsService: SubscriptionsService) {}

  /**
   * Obtener todos los planes disponibles con sus features
   */
  @Get('plans')
  @HttpCode(HttpStatus.OK)
  async getAvailablePlans() {
    try {
      const plans = await this.subscriptionsService.getPlansWithFeatures();
      return {
        success: true,
        data: plans,
        message: 'Planes obtenidos exitosamente',
      };
    } catch (error) {
      this.logger.error('Error obteniendo planes:', error);
      throw new BadRequestException('Error al obtener los planes disponibles');
    }
  }

  /**
   * Crear una nueva suscripción
   */
  @Post()
  @UseGuards(TenantGuard, AuthGuard, TenantAccessGuard, PermissionsGuard)
  @RequirePermissions('settings.update')
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ) {
    try {
      this.logger.log(
        `Creando suscripción para tenant: ${tenant.id}, plan: ${createSubscriptionDto.planId}`,
      );

      const request: CreateSubscriptionRequest = {
        planId: createSubscriptionDto.planId,
        billingCycle: createSubscriptionDto.billingCycle,
        payerEmail: createSubscriptionDto.payerEmail,
        startTrial: createSubscriptionDto.startTrial || false,
        backUrls: createSubscriptionDto.backUrls,
      };

      const subscription = await this.subscriptionsService.createSubscription(
        tenant.id,
        request,
      );

      return {
        success: true,
        data: subscription,
        message: subscription.isTrial
          ? 'Período de prueba iniciado exitosamente'
          : 'Suscripción creada exitosamente',
      };
    } catch (error) {
      this.logger.error('Error creando suscripción:', error);
      throw error;
    }
  }

  /**
   * Crear una suscripción trial específica
   */
  @Post('trial')
  @UseGuards(TenantGuard, AuthGuard, TenantAccessGuard, PermissionsGuard)
  @RequirePermissions('settings.update')
  @HttpCode(HttpStatus.CREATED)
  async createTrialSubscription(
    @CurrentTenant() tenant: any,
    @Body() createTrialDto: CreateTrialDto,
  ) {
    try {
      this.logger.log(
        `Creando suscripción trial para tenant: ${tenant.id}, plan: ${createTrialDto.planId}`,
      );

      const subscription =
        await this.subscriptionsService.createTrialSubscription(
          tenant.id,
          createTrialDto.planId,
        );

      return {
        success: true,
        data: subscription,
        message: 'Período de prueba iniciado exitosamente',
      };
    } catch (error) {
      this.logger.error('Error creando suscripción trial:', error);
      throw error;
    }
  }

  /**
   * Convertir trial a suscripción de pago
   */
  @Post(':subscriptionId/convert-trial')
  @UseGuards(TenantGuard, AuthGuard, TenantAccessGuard, PermissionsGuard)
  @RequirePermissions('settings.update')
  @HttpCode(HttpStatus.OK)
  async convertTrialToSubscription(
    @CurrentTenant() tenant: any,
    @Param('subscriptionId') subscriptionId: string,
    @Body() convertTrialDto: ConvertTrialDto,
  ) {
    try {
      this.logger.log(
        `Convirtiendo trial a suscripción: ${subscriptionId} para tenant: ${tenant.id}`,
      );

      const subscription =
        await this.subscriptionsService.convertTrialToPatrSubscription(
          tenant.id,
          subscriptionId,
          convertTrialDto.billingCycle,
          convertTrialDto.payerEmail,
          convertTrialDto.backUrls,
        );

      return {
        success: true,
        data: subscription,
        message: 'Trial convertido a suscripción de pago exitosamente',
      };
    } catch (error) {
      this.logger.error('Error convirtiendo trial:', error);
      throw error;
    }
  }

  /**
   * Obtener la suscripción actual del tenant
   */
  @Get('current')
  @UseGuards(TenantGuard, AuthGuard, TenantAccessGuard)
  @HttpCode(HttpStatus.OK)
  async getCurrentSubscription(@CurrentTenant() tenant: any) {
    try {
      const subscription =
        await this.subscriptionsService.getTenantSubscription(tenant.id);

      return {
        success: true,
        data: subscription,
        message: subscription
          ? 'Suscripción actual obtenida'
          : 'No hay suscripción activa',
      };
    } catch (error) {
      this.logger.error('Error obteniendo suscripción actual:', error);
      throw new BadRequestException('Error al obtener la suscripción actual');
    }
  }

  /**
   * Cancelar una suscripción específica
   */
  @Delete(':subscriptionId')
  @UseGuards(TenantGuard, AuthGuard, TenantAccessGuard, PermissionsGuard)
  @RequirePermissions('settings.update')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @CurrentTenant() tenant: any,
    @Param('subscriptionId') subscriptionId: string,
    @Body() cancelDto: CancelSubscriptionDto,
  ) {
    try {
      this.logger.log(
        `Cancelando suscripción: ${subscriptionId} para tenant: ${tenant.id}`,
      );

      const result = await this.subscriptionsService.cancelSubscription(
        tenant.id,
        subscriptionId,
        cancelDto.reason,
      );

      return {
        success: true,
        data: result,
        message: 'Suscripción cancelada exitosamente',
      };
    } catch (error) {
      this.logger.error('Error cancelando suscripción:', error);
      throw error;
    }
  }

  /**
   * Obtener historial de pagos de una suscripción
   */
  @Get(':subscriptionId/payments')
  @UseGuards(TenantGuard, AuthGuard, TenantAccessGuard, PermissionsGuard)
  @RequirePermissions('settings.read')
  @HttpCode(HttpStatus.OK)
  async getSubscriptionPayments(
    @Param('subscriptionId') subscriptionId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const payments =
        await this.subscriptionsService.getSubscriptionPayments(subscriptionId);

      // Aplicar paginación si se proporciona
      const limitNum = limit ? parseInt(limit, 10) : undefined;
      const offsetNum = offset ? parseInt(offset, 10) : 0;

      const paginatedPayments = limitNum
        ? payments.slice(offsetNum, offsetNum + limitNum)
        : payments.slice(offsetNum);

      return {
        success: true,
        data: {
          payments: paginatedPayments,
          total: payments.length,
          limit: limitNum,
          offset: offsetNum,
        },
        message: 'Historial de pagos obtenido exitosamente',
      };
    } catch (error) {
      this.logger.error('Error obteniendo pagos:', error);
      throw new BadRequestException('Error al obtener el historial de pagos');
    }
  }

  /**
   * Webhook para recibir notificaciones de MercadoPago
   */
  @Post('webhooks/mercadopago')
  @HttpCode(HttpStatus.OK)
  async handleMercadoPagoWebhook(@Body() webhookData: WebhookMercadoPagoDto) {
    try {
      this.logger.log(
        `Webhook recibido de MercadoPago: ${JSON.stringify(webhookData)}`,
      );

      await this.subscriptionsService.handleMercadoPagoWebhook(webhookData);

      return {
        success: true,
        message: 'Webhook procesado exitosamente',
      };
    } catch (error) {
      this.logger.error('Error procesando webhook de MercadoPago:', error);
      // Retornar 200 para evitar reintentos innecesarios de MercadoPago
      return {
        success: false,
        message: 'Error procesando webhook',
        error: error.message,
      };
    }
  }

  /**
   * Verificar suscripciones expiradas (endpoint interno/admin)
   */
  @Post('check-expired')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('settings.update')
  @HttpCode(HttpStatus.OK)
  async checkExpiredSubscriptions() {
    try {
      const result = await this.subscriptionsService.checkSubscriptionExpiry();

      return {
        success: true,
        data: result,
        message: `Verificación completada. ${result.expiredCount} suscripciones y ${result.expiredTrialsCount} trials expirados`,
      };
    } catch (error) {
      this.logger.error('Error verificando suscripciones expiradas:', error);
      throw new BadRequestException(
        'Error al verificar suscripciones expiradas',
      );
    }
  }

  /**
   * Verificar solo trials expirados
   */
  @Post('check-expired-trials')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('settings.update')
  @HttpCode(HttpStatus.OK)
  async checkExpiredTrials() {
    try {
      const result = await this.subscriptionsService.checkTrialExpiry();

      return {
        success: true,
        data: result,
        message: `${result.expiredTrialsCount} trials expirados`,
      };
    } catch (error) {
      this.logger.error('Error verificando trials expirados:', error);
      throw new BadRequestException('Error al verificar trials expirados');
    }
  }

  /**
   * Obtener detalles de una suscripción específica
   */
  @Get(':subscriptionId')
  @UseGuards(TenantGuard, AuthGuard, TenantAccessGuard, PermissionsGuard)
  @RequirePermissions('settings.read')
  @HttpCode(HttpStatus.OK)
  async getSubscriptionDetails(
    @CurrentTenant() tenant: any,
    @Param('subscriptionId') subscriptionId: string,
  ) {
    try {
      const subscription =
        await this.subscriptionsService.getTenantSubscription(tenant.id);

      if (!subscription || subscription.id !== subscriptionId) {
        throw new BadRequestException('Suscripción no encontrada');
      }

      return {
        success: true,
        data: subscription,
        message: 'Detalles de suscripción obtenidos',
      };
    } catch (error) {
      this.logger.error('Error obteniendo detalles de suscripción:', error);
      throw error;
    }
  }
}
