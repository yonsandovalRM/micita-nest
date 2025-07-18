import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';
import { TenantsService } from '../tenants/tenants.service';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class SubscriptionSchedulerService {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);

  constructor(
    private subscriptionsService: SubscriptionsService,
    private tenantsService: TenantsService,
    private emailService: EmailService,
  ) {}

  /**
   * Verificar suscripciones expiradas cada hora
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiredSubscriptions() {
    try {
      this.logger.log('Iniciando verificación de suscripciones expiradas');

      const result = await this.subscriptionsService.checkSubscriptionExpiry();

      this.logger.log(
        `Verificación completada: ${result.expiredCount} suscripciones y ${result.expiredTrialsCount} trials expirados`,
      );
    } catch (error) {
      this.logger.error('Error verificando suscripciones expiradas:', error);
    }
  }

  /**
   * Enviar recordatorios de expiración de trial cada día a las 9 AM
   */
  @Cron('0 9 * * *') // Todos los días a las 9:00 AM
  async sendTrialExpirationReminders() {
    try {
      this.logger.log('Enviando recordatorios de expiración de trial');

      const tenantsRequiringUpgrade =
        await this.tenantsService.getTenantsRequiringUpgrade();

      for (const tenant of tenantsRequiringUpgrade) {
        const subscription = tenant.subscriptions[0];
        const owner = tenant.userTenants[0]?.user;

        if (!subscription || !owner) continue;

        const daysRemaining = Math.ceil(
          (subscription.trialEndDate
            ? subscription.trialEndDate.getDate() - new Date().getTime()
            : 0) /
            (1000 * 60 * 60 * 24),
        );

        if (daysRemaining <= 3 && daysRemaining >= 0) {
          await this.sendTrialExpirationEmail(
            tenant,
            owner,
            subscription,
            daysRemaining,
          );
        }
      }

      this.logger.log(
        `Recordatorios enviados a ${tenantsRequiringUpgrade.length} tenants`,
      );
    } catch (error) {
      this.logger.error('Error enviando recordatorios de trial:', error);
    }
  }

  /**
   * Limpiar suscripciones canceladas antiguas cada semana
   */
  @Cron(CronExpression.EVERY_WEEK)
  async cleanupOldCancelledSubscriptions() {
    try {
      this.logger.log('Iniciando limpieza de suscripciones canceladas');

      // Implementar lógica de limpieza si es necesario
      // Por ejemplo, archivar suscripciones canceladas hace más de 6 meses

      this.logger.log('Limpieza de suscripciones completada');
    } catch (error) {
      this.logger.error('Error en limpieza de suscripciones:', error);
    }
  }

  private async sendTrialExpirationEmail(
    tenant: any,
    owner: any,
    subscription: any,
    daysRemaining: number,
  ) {
    try {
      let subject: string;
      let message: string;

      if (daysRemaining === 0) {
        subject = `Su período de prueba expira hoy - ${tenant.name}`;
        message = `Su período de prueba de ${subscription.plan.name} expira hoy.`;
      } else if (daysRemaining === 1) {
        subject = `Su período de prueba expira mañana - ${tenant.name}`;
        message = `Su período de prueba de ${subscription.plan.name} expira mañana.`;
      } else {
        subject = `Su período de prueba expira en ${daysRemaining} días - ${tenant.name}`;
        message = `Su período de prueba de ${subscription.plan.name} expira en ${daysRemaining} días.`;
      }

      const upgradeUrl = `${process.env.FRONTEND_URL}/${tenant.slug}/billing/upgrade`;

      const emailContent = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h1 style="color: #333;">¡Hola ${owner.firstName || owner.email}!</h1>
          <p>${message}</p>
          <p>Para continuar utilizando todas las funcionalidades de ${tenant.name}, 
             actualice su plan antes de que expire el período de prueba.</p>
          <a href="${upgradeUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
            Actualizar Plan
          </a>
          <p>¿Tienes preguntas? No dudes en contactarnos.</p>
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            Este es un recordatorio automático. Si ya has actualizado tu plan, puedes ignorar este email.
          </p>
        </div>
      `;

      // Nota: Necesitarías actualizar el EmailService para incluir este método
      // await this.emailService.sendCustomEmail(owner.email, subject, emailContent);

      this.logger.log(
        `Recordatorio enviado a ${owner.email} para tenant ${tenant.slug}`,
      );
    } catch (error) {
      this.logger.error(`Error enviando recordatorio a ${owner.email}:`, error);
    }
  }
}
