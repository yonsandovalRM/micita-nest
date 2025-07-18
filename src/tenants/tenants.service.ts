import { Injectable, NotFoundException } from '@nestjs/common';
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
          },
        },
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
}
