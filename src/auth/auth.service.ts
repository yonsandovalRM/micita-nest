import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/services/prisma.service';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async loginWithEmail(email: string, password: string, tenantSlug: string) {
    // Verificar tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug, isActive: true },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant no encontrado');
    }

    // Buscar usuario
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar acceso al tenant
    const userTenant = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenant.id,
        },
      },
    });

    if (!userTenant || userTenant.status !== 'active') {
      throw new UnauthorizedException('No tienes acceso a este tenant');
    }

    return this.createSession(user, tenant);
  }

  async loginWithGoogle(googleToken: string, tenantSlug: string) {
    try {
      // Verificar tenant
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: tenantSlug, isActive: true },
        include: { settings: true },
      });

      if (!tenant || !tenant.settings?.allowGoogleSignIn) {
        throw new BadRequestException('Autenticación con Google no permitida');
      }

      // Verificar token de Google
      const ticket = await this.googleClient.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Token de Google inválido');
      }

      // Buscar o crear usuario
      let user = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: payload.email }, { googleId: payload.sub }],
        },
      });

      if (!user) {
        // Crear nuevo usuario
        user = await this.prisma.user.create({
          data: {
            email: payload.email!,
            googleId: payload.sub,
            firstName: payload.given_name,
            lastName: payload.family_name,
            avatar: payload.picture,
            emailVerified: new Date(),
          },
        });
      } else if (!user.googleId) {
        // Vincular cuenta existente con Google
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: payload.sub },
        });
      }

      // Verificar o crear relación con tenant
      let userTenant = await this.prisma.userTenant.findUnique({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId: tenant.id,
          },
        },
      });

      if (!userTenant) {
        // Crear relación con tenant
        userTenant = await this.prisma.userTenant.create({
          data: {
            userId: user.id,
            tenantId: tenant.id,
            role: 'client',
            status: tenant.settings?.requireApproval
              ? 'pending_approval'
              : 'active',
          },
        });
      }

      if (userTenant.status !== 'active') {
        throw new UnauthorizedException(
          'Tu cuenta está pendiente de aprobación',
        );
      }

      return this.createSession(user, tenant);
    } catch (error) {
      throw new UnauthorizedException('Error al autenticar con Google');
    }
  }

  private async createSession(user: any, tenant: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '24h',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });

    // Crear sesión en DB
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      },
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);

      const session = await this.prisma.session.findUnique({
        where: { refreshToken },
        include: { user: true },
      });

      if (!session) {
        throw new UnauthorizedException('Sesión no encontrada');
      }

      const tenant = await this.prisma.tenant.findUnique({
        where: { id: session.tenantId! },
      });

      return this.createSession(session.user, tenant);
    } catch {
      throw new UnauthorizedException('Token de refresh inválido');
    }
  }

  async logout(token: string) {
    await this.prisma.session.delete({
      where: { token },
    });
  }
}
