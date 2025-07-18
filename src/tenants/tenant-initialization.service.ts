import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { RolesPermissionsService } from '../common/services/roles-permissions.service';
import { FeaturesService } from '../common/services/features.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EmailService } from '../common/services/email.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

export interface CreateTenantRequest {
  slug: string;
  name: string;
  description?: string;
  businessType?: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName?: string;
  password: string;
  planId: string;
  billingCycle?: 'monthly' | 'yearly';
  autoStartTrial?: boolean;
}

export interface TenantCreationResult {
  tenant: any;
  user: any;
  subscription?: any;
  emailVerificationRequired: boolean;
  message: string;
}

@Injectable()
export class TenantInitializationService {
  private readonly logger = new Logger(TenantInitializationService.name);
  constructor(
    private prisma: PrismaService,
    private rolesPermissionsService: RolesPermissionsService,
    private featuresService: FeaturesService,
    private subscriptionsService: SubscriptionsService,
    private emailService: EmailService,
  ) {}

  async createTenantWithDefaults(
    slug: string,
    name: string,
    description?: string,
    businessType?: string,
    ownerEmail?: string,
  ) {
    // Crear tenant
    const tenant = await this.prisma.tenant.create({
      data: {
        slug,
        name,
        description,
        businessType,
      },
    });

    // Crear configuración por defecto
    await this.prisma.tenantSettings.create({
      data: {
        tenantId: tenant.id,
      },
    });

    // Inicializar roles y permisos
    await this.rolesPermissionsService.initializeTenantRolesAndPermissions(
      tenant.id,
    );

    // Inicializar features del sistema
    await this.featuresService.initializeSystemFeatures();

    // Si se especifica un owner, crearlo y asignarlo
    if (ownerEmail) {
      let owner = await this.prisma.user.findUnique({
        where: { email: ownerEmail },
      });

      if (!owner) {
        owner = await this.prisma.user.create({
          data: {
            email: ownerEmail,
            emailVerified: new Date(),
          },
        });
      }

      // Obtener el rol de owner
      const ownerRole = await this.prisma.role.findUnique({
        where: {
          tenantId_name: {
            tenantId: tenant.id,
            name: 'owner',
          },
        },
      });

      // Crear relación usuario-tenant con rol de owner
      await this.prisma.userTenant.create({
        data: {
          userId: owner.id,
          tenantId: tenant.id,
          roleId: ownerRole?.id,
          status: 'active',
        },
      });
    }

    return {
      tenant,
      message: 'Tenant creado exitosamente con roles y permisos por defecto',
    };
  }

  async createPublicTenant(
    request: CreateTenantRequest,
  ): Promise<TenantCreationResult> {
    const {
      slug,
      name,
      description,
      businessType,
      ownerEmail,
      ownerFirstName,
      ownerLastName,
      password,
      planId,
      billingCycle = 'monthly',
      autoStartTrial = true,
    } = request;

    // Validar que el slug no esté tomado
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      throw new ConflictException('El slug ya está en uso');
    }

    // Validar que el plan existe y está activo
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId, isActive: true },
    });

    if (!plan) {
      throw new BadRequestException('Plan no encontrado o inactivo');
    }

    // Verificar si el usuario ya existe
    let user = await this.prisma.user.findUnique({
      where: { email: ownerEmail },
    });

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generar token de verificación de email
      const emailVerificationToken = randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date();
      emailVerificationExpires.setHours(
        emailVerificationExpires.getHours() + 24,
      );

      user = await this.prisma.user.create({
        data: {
          email: ownerEmail,
          firstName: ownerFirstName,
          lastName: ownerLastName,
          password: hashedPassword,
          emailVerificationToken,
          emailVerificationExpires,
          isActive: true,
        },
      });
    } else {
      // Verificar que el usuario no ya tenga un tenant con el mismo email

      const existingUserTenant = await this.prisma.userTenant.findFirst({
        where: {
          userId: user.id,
          status: 'active',
        },
        include: {
          tenant: true,
        },
      });

      if (existingUserTenant) {
        throw new ConflictException(
          `El usuario ya tiene un tenant activo: ${existingUserTenant.tenant.name}`,
        );
      }
    }

    try {
      // Crear tenant
      const tenant = await this.prisma.tenant.create({
        data: {
          slug,
          name,
          description,
          businessType,
        },
      });

      // Crear configuración por defecto
      await this.prisma.tenantSettings.create({
        data: {
          tenantId: tenant.id,
        },
      });

      // Inicializar roles, permisos y features
      await this.rolesPermissionsService.initializeTenantRolesAndPermissions(
        tenant.id,
      );
      await this.featuresService.initializeSystemFeatures();

      // Obtener el rol de owner
      const ownerRole = await this.prisma.role.findUnique({
        where: {
          tenantId_name: {
            tenantId: tenant.id,
            name: 'owner',
          },
        },
      });

      // Crear relación usuario-tenant con rol de owner
      await this.prisma.userTenant.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          roleId: ownerRole?.id,
          status: 'active',
        },
      });

      // Crear suscripción
      let subscription: any = null;
      const shouldStartTrial =
        autoStartTrial && plan.allowTrial && plan.trialDays > 0;

      if (shouldStartTrial) {
        // Crear suscripción trial
        subscription = await this.subscriptionsService.createTrialSubscription(
          tenant.id,
          planId,
        );
      } else if (plan.monthlyPrice && Number(plan.monthlyPrice) > 0) {
        // Plan de pago - crear suscripción pendiente
        subscription = await this.subscriptionsService.createSubscription(
          tenant.id,
          {
            planId,
            billingCycle,
            payerEmail: ownerEmail,
            startTrial: false,
          },
        );
      }

      // Enviar email de verificación si es nuevo usuario
      /* if (isNewUser && user.emailVerificationToken) {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${user.emailVerificationToken}&tenant=${slug}`;

        await this.emailService.sendVerificationEmail(
          ownerEmail,
          tenant.name,
          verificationUrl,
        );
      } */

      return {
        tenant,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
        },
        subscription,
        emailVerificationRequired: isNewUser && !user.emailVerified,
        message: 'Tenant creado exitosamente',
      };
    } catch (error) {
      // Cleanup en caso de error
      try {
        if (isNewUser && user) {
          await this.prisma.user.delete({ where: { id: user.id } });
        }
      } catch (cleanupError) {
        // Log pero no throw el error de cleanup
        console.error('Error en cleanup:', cleanupError);
      }

      throw error;
    }
  }

  async checkSlugAvailability(
    slug: string,
  ): Promise<{ available: boolean; suggestions?: string[] }> {
    const existing = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!existing) {
      return { available: true };
    }

    // Generar sugerencias
    const suggestions: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const suggestion = `${slug}-${i}`;
      const suggestionExists = await this.prisma.tenant.findUnique({
        where: { slug: suggestion },
      });

      if (!suggestionExists) {
        suggestions.push(suggestion);
      }
    }

    // Agregar sugerencias con números aleatorios si no hay suficientes
    while (suggestions.length < 3) {
      const randomNum = Math.floor(Math.random() * 9999) + 1;
      const suggestion = `${slug}-${randomNum}`;

      if (!suggestions.includes(suggestion)) {
        const suggestionExists = await this.prisma.tenant.findUnique({
          where: { slug: suggestion },
        });

        if (!suggestionExists) {
          suggestions.push(suggestion);
        }
      }
    }

    return {
      available: false,
      suggestions: suggestions.slice(0, 3),
    };
  }

  async initializeExistingTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant no encontrado');
    }

    await this.rolesPermissionsService.initializeTenantRolesAndPermissions(
      tenantId,
    );
    await this.featuresService.initializeSystemFeatures();

    return {
      message: 'Roles, permisos y features inicializados para el tenant',
    };
  }

  async getPublicRegistrationSettings() {
    // Obtener planes disponibles para registro público
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        monthlyPrice: true,
        yearlyPrice: true,
        allowTrial: true,
        trialDays: true,
        isPopular: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      plans,
      defaultTrialDays: 14,
      allowPublicRegistration: true,
    };
  }
}
