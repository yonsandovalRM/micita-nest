import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendVerificationEmail(
    to: string,
    tenantName: string,
    verificationUrl: string,
  ) {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: `Verifica tu cuenta en ${tenantName}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h1 style="color: #333;">¡Bienvenido a ${tenantName}!</h1>
          <p>Para completar tu registro, por favor verifica tu dirección de email haciendo clic en el siguiente enlace:</p>
          <a href="${verificationUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
            Verificar Email
          </a>
          <p>Este enlace expirará en 24 horas.</p>
          <p>Si no solicitaste esta cuenta, puedes ignorar este email.</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(
    to: string,
    tenantName: string,
    resetUrl: string,
  ) {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: `Restablecer contraseña - ${tenantName}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h1 style="color: #333;">Restablecer contraseña</h1>
          <p>Recibimos una solicitud para restablecer tu contraseña en ${tenantName}.</p>
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
            Restablecer Contraseña
          </a>
          <p>Este enlace expirará en 1 hora.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este email.</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendWelcomeEmail(to: string, userName: string, tenantName: string) {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: `¡Bienvenido a ${tenantName}!`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h1 style="color: #333;">¡Hola ${userName}!</h1>
          <p>Tu cuenta ha sido verificada exitosamente. ¡Bienvenido a ${tenantName}!</p>
          <p>Ya puedes comenzar a usar todos nuestros servicios.</p>
          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
