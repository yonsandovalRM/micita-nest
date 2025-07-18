import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async getUserTenants(userId: string) {
    return this.prisma.userTenant.findMany({
      where: {
        userId,
        status: 'active',
      },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            businessType: true,
            logo: true,
            createdAt: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
            priority: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });
  }

  async getTenantPublicInfo(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        businessType: true,
        logo: true,
        settings: {
          select: {
            allowGoogleSignIn: true,
            allowEmailSignUp: true,
            primaryColor: true,
            secondaryColor: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    return tenant;
  }

  async getTenantDetailsForUser(slug: string, userId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug, isActive: true },
      include: {
        settings: true,
        subscriptions: {
          where: {
            status: { in: ['active', 'trial', 'pending'] },
          },
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                slug: true,
                allowTrial: true,
                trialDays: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    // Verificar que el usuario tiene acceso a este tenant
    const userTenant = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId: tenant.id,
        },
      },
      include: {
        role: true,
      },
    });

    if (!userTenant || userTenant.status !== 'active') {
      throw new ForbiddenException('No tienes acceso a este tenant');
    }

    return {
      ...tenant,
      userRole: userTenant.role,
      currentSubscription: tenant.subscriptions[0] || null,
    };
  }

  async getUserTenantRelation(userId: string, tenantId: string) {
    return this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
            priority: true,
          },
        },
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            isActive: true,
          },
        },
      },
    });
  }

  async getUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        createdAt: true,
      },
    });
  }

  async checkPlanExists(planId: string): Promise<boolean> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId, isActive: true },
    });
    return !!plan;
  }

  async getTenantById(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId, isActive: true },
      include: {
        settings: true,
        subscriptions: {
          where: {
            status: { in: ['active', 'trial', 'pending'] },
          },
          include: {
            plan: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    return tenant;
  }

  async getTenantBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug, isActive: true },
      include: {
        settings: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    return tenant;
  }

  async updateTenantSettings(tenantId: string, settings: any) {
    return this.prisma.tenantSettings.update({
      where: { tenantId },
      data: settings,
    });
  }

  async getTenantStats(tenantId: string) {
    const [totalUsers, activeSubscription, totalAppointments, totalServices] =
      await Promise.all([
        this.prisma.userTenant.count({
          where: { tenantId, status: 'active' },
        }),
        this.prisma.subscription.findFirst({
          where: {
            tenantId,
            status: { in: ['active', 'trial'] },
          },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.appointment.count({
          where: { tenantId },
        }),
        this.prisma.service.count({
          where: { tenantId, isActive: true },
        }),
      ]);

    return {
      totalUsers,
      activeSubscription,
      totalAppointments,
      totalServices,
      createdAt: new Date(),
    };
  }

  async searchTenants(query: string, limit: number = 10) {
    return this.prisma.tenant.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        businessType: true,
        logo: true,
        createdAt: true,
      },
      take: limit,
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getTenantsWithExpiredTrials() {
    return this.prisma.tenant.findMany({
      where: {
        isActive: true,
        subscriptions: {
          some: {
            isTrial: true,
            status: 'trial',
            trialEndDate: {
              lt: new Date(),
            },
          },
        },
      },
      include: {
        subscriptions: {
          where: {
            isTrial: true,
            status: 'trial',
            trialEndDate: {
              lt: new Date(),
            },
          },
          include: {
            plan: true,
          },
        },
      },
    });
  }

  async getTenantsRequiringUpgrade() {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    return this.prisma.tenant.findMany({
      where: {
        isActive: true,
        subscriptions: {
          some: {
            isTrial: true,
            status: 'trial',
            trialEndDate: {
              lte: threeDaysFromNow,
              gte: new Date(),
            },
          },
        },
      },
      include: {
        subscriptions: {
          where: {
            isTrial: true,
            status: 'trial',
          },
          include: {
            plan: true,
          },
        },
        userTenants: {
          where: {
            role: {
              name: 'owner',
            },
          },
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }
}
