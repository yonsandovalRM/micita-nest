import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUserInTenant(userId: string, tenantId: string) {
    const userTenant = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            phone: true,
            createdAt: true,
          },
        },
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            businessType: true,
          },
        },
      },
    });

    if (!userTenant) {
      throw new NotFoundException('Usuario no encontrado en este tenant');
    }

    return {
      ...userTenant.user,
      tenantRole: userTenant.role,
      tenantStatus: userTenant.status,
      joinedAt: userTenant.joinedAt,
      tenant: userTenant.tenant,
    };
  }

  async getUsersByTenant(tenantId: string) {
    return this.prisma.userTenant.findMany({
      where: {
        tenantId,
        status: 'active',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
    });
  }
}
