import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantInitializationService } from './tenant-initialization.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/tenant.decorator';
import {
  PublicTenantRegistrationDto,
  CheckSlugAvailabilityDto,
} from './dto/public-registration.dto';

@Controller('tenants')
export class TenantsController {
  private readonly logger = new Logger(TenantsController.name);

  constructor(
    private tenantsService: TenantsService,
    private tenantInitializationService: TenantInitializationService,
  ) {}

  /**
   * Obtener configuración para registro público
   * Ruta pública - no requiere autenticación
   */
  @Get('public/registration-settings')
  @HttpCode(HttpStatus.OK)
  async getPublicRegistrationSettings() {
    try {
      const settings =
        await this.tenantInitializationService.getPublicRegistrationSettings();

      return {
        success: true,
        data: settings,
        message: 'Configuración de registro obtenida',
      };
    } catch (error) {
      this.logger.error('Error obteniendo configuración de registro:', error);
      throw new BadRequestException(
        'Error al obtener configuración de registro',
      );
    }
  }

  /**
   * Verificar disponibilidad de slug
   * Ruta pública - no requiere autenticación
   */
  @Post('public/check-slug')
  @HttpCode(HttpStatus.OK)
  async checkSlugAvailability(@Body() checkSlugDto: CheckSlugAvailabilityDto) {
    try {
      const result =
        await this.tenantInitializationService.checkSlugAvailability(
          checkSlugDto.slug,
        );

      return {
        success: true,
        data: result,
        message: result.available ? 'Slug disponible' : 'Slug no disponible',
      };
    } catch (error) {
      this.logger.error('Error verificando disponibilidad de slug:', error);
      throw new BadRequestException(
        'Error al verificar disponibilidad del slug',
      );
    }
  }

  /**
   * Registro público de tenant
   * Ruta pública - no requiere autenticación
   */
  @Post('public/register')
  @HttpCode(HttpStatus.CREATED)
  async registerPublicTenant(
    @Body() registrationDto: PublicTenantRegistrationDto,
  ) {
    try {
      this.logger.log(
        `Iniciando registro público de tenant: ${registrationDto.tenantSlug}`,
      );

      // Validaciones adicionales
      if (
        registrationDto.acceptTerms !== undefined &&
        !registrationDto.acceptTerms
      ) {
        throw new BadRequestException(
          'Debes aceptar los términos y condiciones',
        );
      }
      this.logger.log(`Iniciando registro público de tenant:2`);

      const result = await this.tenantInitializationService.createPublicTenant({
        slug: registrationDto.tenantSlug,
        name: registrationDto.tenantName,
        description: registrationDto.description,
        businessType: registrationDto.businessType,
        ownerEmail: registrationDto.ownerEmail,
        ownerFirstName: registrationDto.ownerFirstName,
        ownerLastName: registrationDto.ownerLastName,
        password: registrationDto.password,
        planId: registrationDto.planId,
        billingCycle: registrationDto.billingCycle || 'monthly',
        autoStartTrial: true,
      });

      this.logger.log(
        `Tenant registrado exitosamente: ${registrationDto.tenantSlug}`,
      );

      return {
        success: true,
        data: {
          tenant: {
            id: result.tenant.id,
            slug: result.tenant.slug,
            name: result.tenant.name,
            description: result.tenant.description,
            businessType: result.tenant.businessType,
          },
          user: result.user,
          subscription: result.subscription,
          emailVerificationRequired: result.emailVerificationRequired,
          redirectUrl: result.subscription?.mercadoPago?.initPoint || null,
        },
        message: result.message,
      };
    } catch (error) {
      this.logger.error('Error en registro público:', error);
      throw error;
    }
  }

  /**
   * Obtener tenants del usuario autenticado
   */
  @Get('my-tenants')
  @UseGuards(AuthGuard)
  async getMyTenants(@CurrentUser() user: any) {
    try {
      const tenants = await this.tenantsService.getUserTenants(user.id);

      return {
        success: true,
        data: tenants,
        message: 'Tenants obtenidos exitosamente',
      };
    } catch (error) {
      this.logger.error('Error obteniendo tenants del usuario:', error);
      throw new BadRequestException('Error al obtener tus tenants');
    }
  }

  /**
   * Obtener información pública de un tenant
   * Ruta pública - no requiere autenticación
   */
  @Get(':slug/info')
  @HttpCode(HttpStatus.OK)
  async getTenantInfo(@Param('slug') slug: string) {
    try {
      const tenant = await this.tenantsService.getTenantPublicInfo(slug);

      return {
        success: true,
        data: tenant,
        message: 'Información del tenant obtenida',
      };
    } catch (error) {
      this.logger.error(`Error obteniendo info del tenant ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Obtener información detallada de un tenant específico
   */
  @Get(':slug/details')
  @UseGuards(AuthGuard)
  async getTenantDetails(
    @Param('slug') slug: string,
    @CurrentUser() user: any,
  ) {
    try {
      const tenant = await this.tenantsService.getTenantDetailsForUser(
        slug,
        user.id,
      );

      return {
        success: true,
        data: tenant,
        message: 'Detalles del tenant obtenidos',
      };
    } catch (error) {
      this.logger.error(`Error obteniendo detalles del tenant ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Inicializar roles y permisos de un tenant existente (admin)
   */
  @Post(':tenantId/initialize')
  @UseGuards(AuthGuard)
  async initializeTenant(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: any,
  ) {
    try {
      // Verificar que el usuario tiene permisos (debería ser owner del tenant)
      const userTenant = await this.tenantsService.getUserTenantRelation(
        user.id,
        tenantId,
      );

      if (!userTenant || userTenant.role?.name !== 'owner') {
        throw new BadRequestException(
          'No tienes permisos para inicializar este tenant',
        );
      }

      const result =
        await this.tenantInitializationService.initializeExistingTenant(
          tenantId,
        );

      return {
        success: true,
        data: result,
        message: 'Tenant inicializado exitosamente',
      };
    } catch (error) {
      this.logger.error(`Error inicializando tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Validar datos de registro (endpoint de validación previa)
   */
  @Post('public/validate-registration')
  @HttpCode(HttpStatus.OK)
  async validateRegistrationData(
    @Body() registrationDto: PublicTenantRegistrationDto,
  ) {
    try {
      const validations = {
        slugAvailable: false,
        emailAvailable: false,
        planExists: false,
        errors: [] as string[],
      };

      // Verificar slug
      const slugCheck =
        await this.tenantInitializationService.checkSlugAvailability(
          registrationDto.tenantSlug,
        );
      validations.slugAvailable = slugCheck.available;

      if (!slugCheck.available) {
        validations.errors.push('El slug no está disponible');
      }

      // Verificar email
      const existingUser = await this.tenantsService.getUserByEmail(
        registrationDto.ownerEmail,
      );
      validations.emailAvailable = !existingUser;

      if (existingUser) {
        validations.errors.push('El email ya está registrado');
      }

      // Verificar plan
      const planExists = await this.tenantsService.checkPlanExists(
        registrationDto.planId,
      );
      validations.planExists = planExists;

      if (!planExists) {
        validations.errors.push('El plan seleccionado no existe');
      }

      const isValid =
        validations.slugAvailable &&
        validations.emailAvailable &&
        validations.planExists;

      return {
        success: true,
        data: {
          isValid,
          validations,
        },
        message: isValid ? 'Datos válidos' : 'Hay errores en los datos',
      };
    } catch (error) {
      this.logger.error('Error validando datos de registro:', error);
      throw new BadRequestException('Error al validar los datos');
    }
  }
}
