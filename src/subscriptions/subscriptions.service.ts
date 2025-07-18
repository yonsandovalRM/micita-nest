import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { ConfigService } from '@nestjs/config';

// Interfaces para MercadoPago
interface MercadoPagoPreApproval {
  id: string;
  status: string;
  init_point: string;
  sandbox_init_point: string;
  payer_id?: string;
}

interface MercadoPagoPayment {
  id: string;
  status: string;
  status_detail: string;
  transaction_amount: number;
  currency_id: string;
  payment_method_id?: string;
  external_reference?: string;
  date_created: string;
  date_approved?: string;
}

export interface CreateSubscriptionRequest {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  payerEmail: string;
  startTrial?: boolean;
  backUrls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
}

export interface SubscriptionResponse {
  id: string;
  status: string;
  plan: {
    id: string;
    name: string;
    description: string;
    allowTrial: boolean;
    trialDays: number;
  };
  amount: number;
  currency: string;
  billingCycle: string;
  startDate: Date;
  endDate?: Date | null;
  nextBillingDate?: Date | null;
  autoRenew: boolean;
  // Trial info
  isTrial: boolean;
  trialStartDate?: Date | null;
  trialEndDate?: Date | null;
  trialDaysRemaining?: number;
  mercadoPago?: {
    preapprovalId: string;
    initPoint: string;
    sandboxInitPoint?: string;
  };
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createSubscription(
    tenantId: string,
    request: CreateSubscriptionRequest,
  ): Promise<SubscriptionResponse> {
    const {
      planId,
      billingCycle,
      payerEmail,
      startTrial = false,
      backUrls,
    } = request;

    // Validar tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId, isActive: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    // Validar plan
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId, isActive: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan no encontrado');
    }

    // Cancelar suscripciones activas existentes
    await this.cancelExistingActiveSubscriptions(tenantId);

    const startDate = new Date();
    let endDate: Date;
    let nextBillingDate: Date | null = null;
    let isTrial = false;
    let trialStartDate: Date | null = null;
    let trialEndDate: Date | null = null;
    let status = 'pending';

    // Verificar si debe iniciar trial
    if (startTrial && plan.allowTrial && plan.trialDays > 0) {
      isTrial = true;
      trialStartDate = startDate;
      trialEndDate = new Date(startDate);
      trialEndDate.setDate(trialEndDate.getDate() + plan.trialDays);
      endDate = trialEndDate;
      status = 'trial';
    } else {
      endDate = this.calculateEndDate(startDate, billingCycle);
      nextBillingDate = new Date(endDate);
    }

    // Obtener precio según ciclo de facturación
    const amount =
      billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;

    if (!isTrial && (!amount || Number(amount) <= 0)) {
      throw new BadRequestException(
        `El plan ${plan.name} no tiene precio configurado para facturación ${billingCycle}`,
      );
    }

    try {
      let mercadoPagoResponse: MercadoPagoPreApproval | null = null;

      // Solo crear preapproval en MercadoPago si no es trial
      if (!isTrial) {
        mercadoPagoResponse = await this.createMercadoPagoPreApproval({
          planName: plan.name,
          tenantName: tenant.name,
          amount: Number(amount),
          billingCycle,
          payerEmail,
          startDate,
          endDate,
          backUrls,
          externalReference: `${tenantId}-${Date.now()}`,
        });
      }

      // Crear suscripción en base de datos
      const subscription = await this.prisma.subscription.create({
        data: {
          tenantId,
          planId,
          status,
          billingCycle,
          startDate,
          endDate,
          nextBillingDate,
          amount: Number(amount || 0),
          currency: 'CLP',
          isTrial,
          trialEndDate,
          mercadoPagoSubscriptionId: mercadoPagoResponse?.id,
          mercadoPagoPreapprovalId: mercadoPagoResponse?.id,
          autoRenew: !isTrial, // No auto-renovar trials
        },
        include: {
          plan: true,
        },
      });

      this.logger.log(
        `Suscripción ${isTrial ? 'trial' : 'de pago'} creada: ${subscription.id} para tenant: ${tenantId}`,
      );

      const trialDaysRemaining =
        isTrial && trialEndDate
          ? Math.max(
              0,
              Math.ceil(
                (trialEndDate.getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
          : undefined;

      return {
        id: subscription.id,
        status: subscription.status,
        plan: {
          id: subscription.plan.id,
          name: subscription.plan.name,
          description: subscription.plan.description || '',
          allowTrial: subscription.plan.allowTrial,
          trialDays: subscription.plan.trialDays,
        },
        amount: Number(subscription.amount),
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        nextBillingDate: subscription.nextBillingDate,
        autoRenew: subscription.autoRenew,
        isTrial: subscription.isTrial,
        trialEndDate: subscription.trialEndDate,
        trialDaysRemaining,
        mercadoPago: mercadoPagoResponse
          ? {
              preapprovalId: mercadoPagoResponse.id,
              initPoint: mercadoPagoResponse.init_point,
              sandboxInitPoint: mercadoPagoResponse.sandbox_init_point,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error('Error creando suscripción:', error);
      throw new BadRequestException('Error al procesar la suscripción');
    }
  }

  private async createMercadoPagoPreApproval({
    planName,
    tenantName,
    amount,
    billingCycle,
    payerEmail,
    startDate,
    endDate,
    backUrls,
    externalReference,
  }: {
    planName: string;
    tenantName: string;
    amount: number;
    billingCycle: 'monthly' | 'yearly';
    payerEmail: string;
    startDate: Date;
    endDate: Date;
    backUrls?: {
      success?: string;
      failure?: string;
      pending?: string;
    };
    externalReference: string;
  }): Promise<MercadoPagoPreApproval> {
    // Aquí se implementaría la lógica para crear el preapproval en MercadoPago
    // Simulación de respuesta
    return {
      id: `preapproval-${Date.now()}`,
      status: 'authorized',
      init_point: 'https://www.mercadopago.com/checkout/preapproval/init',
      sandbox_init_point:
        'https://sandbox.mercadopago.com/checkout/preapproval/init',
      payer_id: 'payer-12345',
    };
  }

  async createTrialSubscription(
    tenantId: string,
    planId: string,
  ): Promise<SubscriptionResponse> {
    return this.createSubscription(tenantId, {
      planId,
      billingCycle: 'monthly',
      payerEmail: '', // No necesario para trial
      startTrial: true,
    });
  }

  async getTenantSubscription(
    tenantId: string,
  ): Promise<SubscriptionResponse | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['active', 'pending', 'suspended', 'trial'] },
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      return null;
    }

    const trialDaysRemaining =
      subscription.isTrial && subscription.trialEndDate
        ? Math.max(
            0,
            Math.ceil(
              (subscription.trialEndDate.getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : undefined;

    return {
      id: subscription.id,
      status: subscription.status,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        description: subscription.plan.description || '',
        allowTrial: subscription.plan.allowTrial,
        trialDays: subscription.plan.trialDays,
      },
      amount: Number(subscription.amount),
      currency: subscription.currency,
      billingCycle: subscription.billingCycle,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      nextBillingDate: subscription.nextBillingDate,
      autoRenew: subscription.autoRenew,
      isTrial: subscription.isTrial,
      trialEndDate: subscription.trialEndDate,
      trialDaysRemaining,
    };
  }

  async checkTrialExpiry() {
    const expiredTrials = await this.prisma.subscription.findMany({
      where: {
        isTrial: true,
        status: 'trial',
        trialEndDate: {
          lt: new Date(),
        },
      },
    });

    for (const subscription of expiredTrials) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'expired',
          autoRenew: false,
        },
      });

      this.logger.log(`Trial expirado: ${subscription.id}`);
    }

    return { expiredTrialsCount: expiredTrials.length };
  }

  async convertTrialToPatrSubscription(
    tenantId: string,
    subscriptionId: string,
    billingCycle: 'monthly' | 'yearly',
    payerEmail: string,
    backUrls?: any,
  ): Promise<SubscriptionResponse> {
    const trialSubscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId,
        isTrial: true,
        status: { in: ['trial', 'expired'] },
      },
      include: { plan: true },
    });

    if (!trialSubscription) {
      throw new NotFoundException('Suscripción trial no encontrada');
    }

    // Cancelar trial actual
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    // Crear nueva suscripción de pago
    return this.createSubscription(tenantId, {
      planId: trialSubscription.planId,
      billingCycle,
      payerEmail,
      startTrial: false,
      backUrls,
    });
  }

  async cancelSubscription(
    tenantId: string,
    subscriptionId: string,
    reason?: string,
  ) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId,
        status: { in: ['active', 'pending', 'trial'] },
      },
    });

    if (!subscription) {
      throw new NotFoundException(
        'Suscripción no encontrada o ya está cancelada',
      );
    }

    try {
      // Cancelar en MercadoPago si existe preapproval y no es trial
      if (subscription.mercadoPagoPreapprovalId && !subscription.isTrial) {
        await this.cancelMercadoPagoPreApproval(
          subscription.mercadoPagoPreapprovalId,
        );
      }

      // Actualizar en base de datos
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          autoRenew: false,
          metadata: reason ? { cancellationReason: reason } : undefined,
        },
      });

      const subscriptionType = subscription.isTrial ? 'trial' : 'de pago';
      this.logger.log(
        `Suscripción ${subscriptionType} cancelada: ${subscriptionId} para tenant: ${tenantId}`,
      );

      return { message: 'Suscripción cancelada exitosamente' };
    } catch (error) {
      this.logger.error('Error cancelando suscripción:', error);
      throw new BadRequestException('Error al cancelar la suscripción');
    }
  }

  async handleMercadoPagoWebhook(webhookData: any) {
    const { type, data } = webhookData;

    this.logger.log(`Webhook recibido - Tipo: ${type}, ID: ${data?.id}`);

    try {
      if (type === 'subscription_preapproval' || type === 'preapproval') {
        await this.handlePreApprovalUpdate(data.id);
      } else if (type === 'payment') {
        await this.handlePaymentUpdate(data.id);
      } else {
        this.logger.warn(`Tipo de webhook no manejado: ${type}`);
      }
    } catch (error) {
      this.logger.error('Error procesando webhook:', error);
      throw error;
    }
  }

  async getSubscriptionPayments(subscriptionId: string) {
    return this.prisma.payment.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPlansWithFeatures() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      include: {
        features: {
          include: {
            feature: true,
          },
          where: {
            isIncluded: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async checkSubscriptionExpiry() {
    // Verificar trials expirados
    const trialResult = await this.checkTrialExpiry();

    // Verificar suscripciones regulares expiradas
    const expiredSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'active',
        isTrial: false,
        endDate: {
          lt: new Date(),
        },
      },
    });

    for (const subscription of expiredSubscriptions) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'expired' },
      });

      this.logger.log(`Suscripción expirada: ${subscription.id}`);
    }

    return {
      expiredCount: expiredSubscriptions.length,
      expiredTrialsCount: trialResult.expiredTrialsCount,
    };
  }

  // Métodos privados

  private async cancelExistingActiveSubscriptions(tenantId: string) {
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        tenantId,
        status: { in: ['active', 'pending', 'trial'] },
      },
    });

    for (const subscription of activeSubscriptions) {
      try {
        if (subscription.mercadoPagoPreapprovalId && !subscription.isTrial) {
          await this.cancelMercadoPagoPreApproval(
            subscription.mercadoPagoPreapprovalId,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Error cancelando preapproval ${subscription.mercadoPagoPreapprovalId}:`,
          error,
        );
      }

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          autoRenew: false,
        },
      });
    }
  }

  private calculateEndDate(startDate: Date, billingCycle: string): Date {
    const endDate = new Date(startDate);

    if (billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    return endDate;
  }

  private async cancelMercadoPagoPreApproval(preapprovalId: string) {
    this.logger.log(`Cancelando preapproval en MercadoPago: ${preapprovalId}`);
  }

  private async handlePreApprovalUpdate(preapprovalId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { mercadoPagoPreapprovalId: preapprovalId },
    });

    if (!subscription) {
      this.logger.warn(
        `Suscripción no encontrada para preapproval: ${preapprovalId}`,
      );
      return;
    }

    const mockStatus = 'authorized';
    let newStatus = subscription.status;

    switch (mockStatus) {
      case 'authorized':
        newStatus = 'active';
        break;
      /*  case 'paused':
        newStatus = 'suspended';
        break;
      case 'cancelled':
        newStatus = 'cancelled';
        break;
      case 'pending':
        newStatus = 'pending';
        break; */
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Suscripción actualizada: ${subscription.id} -> ${newStatus}`,
    );
  }

  private async handlePaymentUpdate(paymentId: string) {
    // Simular obtención de pago de MercadoPago
    const mockPayment: MercadoPagoPayment = {
      id: paymentId,
      status: 'approved',
      status_detail: 'accredited',
      transaction_amount: 19990,
      currency_id: 'CLP',
      external_reference: 'tenant-123-1234567890',
      date_created: new Date().toISOString(),
      date_approved: new Date().toISOString(),
    };

    // Buscar suscripción
    let subscription: any = null;
    if (mockPayment.external_reference) {
      const tenantId = mockPayment.external_reference.split('-')[0];
      subscription = await this.prisma.subscription.findFirst({
        where: {
          tenantId,
          status: { in: ['active', 'pending'] },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!subscription) {
      this.logger.warn(`Suscripción no encontrada para pago: ${paymentId}`);
      return;
    }

    // Crear/actualizar registro de pago
    await this.prisma.payment.upsert({
      where: { mercadoPagoPaymentId: paymentId },
      update: {
        status: this.mapPaymentStatus(mockPayment.status),
        mercadoPagoStatus: mockPayment.status,
        paidAt: mockPayment.status === 'approved' ? new Date() : null,
        updatedAt: new Date(),
      },
      create: {
        subscriptionId: subscription.id,
        amount: mockPayment.transaction_amount,
        currency: subscription.currency,
        status: this.mapPaymentStatus(mockPayment.status),
        mercadoPagoPaymentId: paymentId,
        mercadoPagoStatus: mockPayment.status,
        paymentMethodId: mockPayment.payment_method_id,
        paidAt: mockPayment.status === 'approved' ? new Date() : null,
      },
    });

    // Si fue aprobado, extender suscripción
    if (mockPayment.status === 'approved') {
      await this.extendSubscription(subscription.id);
    }

    this.logger.log(
      `Pago procesado: ${paymentId} para suscripción: ${subscription.id}`,
    );
  }

  private mapPaymentStatus(mercadoPagoStatus: string): string {
    const statusMap: Record<string, string> = {
      approved: 'approved',
      pending: 'pending',
      rejected: 'rejected',
      cancelled: 'cancelled',
      refunded: 'refunded',
      charged_back: 'refunded',
    };

    return statusMap[mercadoPagoStatus] || 'pending';
  }

  private async extendSubscription(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) return;

    const currentEndDate =
      subscription.endDate || subscription.nextBillingDate || new Date();
    const newEndDate = this.calculateEndDate(
      currentEndDate,
      subscription.billingCycle,
    );
    const newNextBillingDate = new Date(newEndDate);

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'active',
        endDate: newEndDate,
        nextBillingDate: newNextBillingDate,
        updatedAt: new Date(),
      },
    });
  }
}
