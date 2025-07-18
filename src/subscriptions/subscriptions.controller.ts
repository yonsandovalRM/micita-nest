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
        backUrls: createSubscriptionDto.backUrls,
      };

      const subscription = await this.subscriptionsService.createSubscription(
        tenant.id,
        request,
      );

      return {
        success: true,
        data: subscription,
        message: 'Suscripción creada exitosamente',
      };
    } catch (error) {
      this.logger.error('Error creando suscripción:', error);
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
        message: `Verificación completada. ${result.expiredCount} suscripciones expiradas`,
      };
    } catch (error) {
      this.logger.error('Error verificando suscripciones expiradas:', error);
      throw new BadRequestException(
        'Error al verificar suscripciones expiradas',
      );
    }
  }

  /**
   * Obtener estadísticas de suscripciones (endpoint admin)
   */
  @Get('stats')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('settings.read')
  @HttpCode(HttpStatus.OK)
  async getSubscriptionStats(@Query('period') period?: string) {
    try {
      // Este método se puede implementar según las necesidades de estadísticas
      return {
        success: true,
        data: {
          message: 'Estadísticas no implementadas aún',
          period: period || 'all',
        },
        message: 'Estadísticas obtenidas',
      };
    } catch (error) {
      this.logger.error('Error obteniendo estadísticas:', error);
      throw new BadRequestException('Error al obtener estadísticas');
    }
  }

  /**
   * Reactivar una suscripción cancelada (si es posible)
   */
  @Post(':subscriptionId/reactivate')
  @UseGuards(TenantGuard, AuthGuard, TenantAccessGuard, PermissionsGuard)
  @RequirePermissions('settings.update')
  @HttpCode(HttpStatus.OK)
  async reactivateSubscription(
    @CurrentTenant() tenant: any,
    @Param('subscriptionId') subscriptionId: string,
  ) {
    try {
      // Este método se puede implementar para reactivar suscripciones
      return {
        success: false,
        message: 'Reactivación de suscripciones no implementada aún',
      };
    } catch (error) {
      this.logger.error('Error reactivando suscripción:', error);
      throw new BadRequestException('Error al reactivar la suscripción');
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
      // Este método se puede implementar para obtener detalles específicos
      return {
        success: false,
        message: 'Detalles de suscripción específica no implementados aún',
      };
    } catch (error) {
      this.logger.error('Error obteniendo detalles de suscripción:', error);
      throw new BadRequestException(
        'Error al obtener detalles de la suscripción',
      );
    }
  }
}
