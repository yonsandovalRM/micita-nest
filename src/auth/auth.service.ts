import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/services/prisma.service';
import { EmailService } from '../common/services/email.service';
import { RolesPermissionsService } from '../common/services/roles-permissions.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private rolesPermissionsService: RolesPermissionsService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async registerWithEmail(
    email: string,
    password: string,
    tenantSlug: string,
    firstName?: string,
    lastName?: string,
    phone?: string,
  ) {
    // Verificar tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug, isActive: true },
      include: { settings: true },
    });

    if (!tenant || !tenant.settings?.allowEmailSignUp) {
      throw new BadRequestException('Registro por email no permitido');
    }

    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Verificar si ya tiene acceso a este tenant
      const existingUserTenant = await this.prisma.userTenant.findUnique({
        where: {
          userId_tenantId: {
            userId: existingUser.id,
            tenantId: tenant.id,
          },
        },
      });

      if (existingUserTenant) {
        throw new ConflictException('Ya tienes una cuenta en este tenant');
      }
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generar token de verificación
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    let user = existingUser;

    // Crear o actualizar usuario
    if (!existingUser) {
      user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          emailVerificationToken: verificationToken,
          emailVerificationExpires: verificationExpires,
          emailVerified: tenant.settings.requireEmailVerification
            ? null
            : new Date(),
        },
      });
    } else if (!existingUser.password) {
      // Usuario existente sin contraseña (solo OAuth)
      user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          firstName: firstName || existingUser.firstName,
          lastName: lastName || existingUser.lastName,
          phone: phone || existingUser.phone,
          emailVerificationToken: verificationToken,
          emailVerificationExpires: verificationExpires,
        },
      });
    }

    // Obtener el rol por defecto
    const defaultRole = await this.prisma.role.findUnique({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: 'client',
        },
      },
    });

    // Crear relación con tenant
    const userTenant = await this.prisma.userTenant.create({
      data: {
        userId: user!.id,
        tenantId: tenant.id,
        roleId: defaultRole?.id,
        status: tenant.settings.requireApproval ? 'pending_approval' : 'active',
      },
    });

    // Enviar email de verificación si es requerido
    if (tenant.settings.requireEmailVerification) {
      const verificationUrl = `${process.env.FRONTEND_URL}/${tenantSlug}/verify-email?token=${verificationToken}`;
      await this.emailService.sendVerificationEmail(
        email,
        tenant.name,
        verificationUrl,
      );

      return {
        message: 'Registro exitoso. Revisa tu email para verificar tu cuenta.',
        requiresVerification: true,
      };
    }

    // Si no requiere verificación, crear sesión directamente
    if (userTenant.status === 'active') {
      return this.createSession(user!, tenant);
    }

    return {
      message: 'Registro exitoso. Tu cuenta está pendiente de aprobación.',
      requiresApproval: true,
    };
  }

  async verifyEmail(token: string, tenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug, isActive: true },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant no encontrado');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Token de verificación inválido o expirado',
      );
    }

    // Marcar email como verificado
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    // Enviar email de bienvenida
    await this.emailService.sendWelcomeEmail(
      user.email,
      user.firstName || 'Usuario',
      tenant.name,
    );

    return {
      message: 'Email verificado exitosamente',
    };
  }

  async forgotPassword(email: string, tenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug, isActive: true },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant no encontrado');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // No revelar si el email existe o no
      return {
        message:
          'Si el email existe, recibirás instrucciones para restablecer tu contraseña.',
      };
    }

    // Verificar que el usuario tiene acceso a este tenant
    const userTenant = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenant.id,
        },
      },
    });

    if (!userTenant) {
      return {
        message:
          'Si el email existe, recibirás instrucciones para restablecer tu contraseña.',
      };
    }

    // Generar token de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // Enviar email
    const resetUrl = `${process.env.FRONTEND_URL}/${tenantSlug}/reset-password?token=${resetToken}`;
    await this.emailService.sendPasswordResetEmail(
      email,
      tenant.name,
      resetUrl,
    );

    return {
      message:
        'Si el email existe, recibirás instrucciones para restablecer tu contraseña.',
    };
  }

  async resetPassword(token: string, newPassword: string, tenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug, isActive: true },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant no encontrado');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Token de reset inválido o expirado');
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Invalidar todas las sesiones existentes
    await this.prisma.session.deleteMany({
      where: { userId: user.id },
    });

    return {
      message: 'Contraseña restablecida exitosamente',
    };
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

    // Verificar si el email está verificado (si es requerido)
    const tenantSettings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });

    if (tenantSettings?.requireEmailVerification && !user.emailVerified) {
      throw new UnauthorizedException(
        'Debes verificar tu email antes de iniciar sesión',
      );
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

    if (!userTenant) {
      throw new UnauthorizedException('No tienes acceso a este tenant');
    }

    if (userTenant.status === 'pending_approval') {
      throw new UnauthorizedException('Tu cuenta está pendiente de aprobación');
    }

    if (userTenant.status !== 'active') {
      throw new UnauthorizedException('Tu cuenta está suspendida');
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
          data: {
            googleId: payload.sub,
            emailVerified: user.emailVerified || new Date(),
          },
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
        // Obtener el rol por defecto
        const defaultRole = await this.prisma.role.findUnique({
          where: {
            tenantId_name: {
              tenantId: tenant.id,
              name: 'client',
            },
          },
        });

        // Crear relación con tenant
        userTenant = await this.prisma.userTenant.create({
          data: {
            userId: user.id,
            tenantId: tenant.id,
            roleId: defaultRole?.id,
            status: tenant.settings?.requireApproval
              ? 'pending_approval'
              : 'active',
          },
        });
      }

      if (userTenant.status === 'pending_approval') {
        throw new UnauthorizedException(
          'Tu cuenta está pendiente de aprobación',
        );
      }

      if (userTenant.status !== 'active') {
        throw new UnauthorizedException('Tu cuenta está suspendida');
      }

      return this.createSession(user, tenant);
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
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

    // Obtener información del rol del usuario
    const userTenant = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenant.id,
        },
      },
      include: {
        role: true,
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
        role: userTenant?.role,
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
