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
  };
  amount: number;
  currency: string;
  billingCycle: string;
  startDate: Date;
  endDate?: Date;
  nextBillingDate?: Date;
  autoRenew: boolean;
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
    const { planId, billingCycle, payerEmail, backUrls } = request;

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

    // Obtener precio según ciclo de facturación
    const amount =
      billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;

    if (!amount || Number(amount) <= 0) {
      throw new BadRequestException(
        `El plan ${plan.name} no tiene precio configurado para facturación ${billingCycle}`,
      );
    }

    // Cancelar suscripciones activas existentes
    await this.cancelExistingActiveSubscriptions(tenantId);

    // Calcular fechas
    const startDate = new Date();
    const endDate = this.calculateEndDate(startDate, billingCycle);
    const nextBillingDate = new Date(endDate);

    try {
      // Crear preapproval en MercadoPago
      const mercadoPagoResponse = await this.createMercadoPagoPreApproval({
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

      // Crear suscripción en base de datos
      const subscription = await this.prisma.subscription.create({
        data: {
          tenantId,
          planId,
          status: 'pending',
          billingCycle,
          startDate,
          endDate,
          nextBillingDate,
          amount,
          currency: 'CLP',
          mercadoPagoSubscriptionId: mercadoPagoResponse.id,
          mercadoPagoPreapprovalId: mercadoPagoResponse.id,
          autoRenew: true,
        },
        include: {
          plan: true,
        },
      });

      this.logger.log(
        `Suscripción creada: ${subscription.id} para tenant: ${tenantId}`,
      );

      return {
        id: subscription.id,
        status: subscription.status,
        plan: {
          id: subscription.plan.id,
          name: subscription.plan.name,
          description: subscription.plan.description || '',
        },
        amount: Number(subscription.amount),
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        startDate: subscription.startDate,
        endDate: subscription.endDate ?? undefined,
        nextBillingDate: subscription.nextBillingDate,
        autoRenew: subscription.autoRenew,
        mercadoPago: {
          preapprovalId: mercadoPagoResponse.id,
          initPoint: mercadoPagoResponse.init_point,
          sandboxInitPoint: mercadoPagoResponse.sandbox_init_point,
        },
      };
    } catch (error) {
      this.logger.error('Error creando suscripción:', error);
      throw new BadRequestException('Error al procesar la suscripción');
    }
  }

  async getTenantSubscription(
    tenantId: string,
  ): Promise<SubscriptionResponse | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['active', 'pending', 'suspended'] },
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

    return {
      id: subscription.id,
      status: subscription.status,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        description: subscription.plan.description || '',
      },
      amount: Number(subscription.amount),
      currency: subscription.currency,
      billingCycle: subscription.billingCycle,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      nextBillingDate: subscription.nextBillingDate,
      autoRenew: subscription.autoRenew,
    };
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
        status: { in: ['active', 'pending'] },
      },
    });

    if (!subscription) {
      throw new NotFoundException(
        'Suscripción no encontrada o ya está cancelada',
      );
    }

    try {
      // Cancelar en MercadoPago si existe preapproval
      if (subscription.mercadoPagoPreapprovalId) {
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

      this.logger.log(
        `Suscripción cancelada: ${subscriptionId} para tenant: ${tenantId}`,
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
    const expiredSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'active',
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

    return { expiredCount: expiredSubscriptions.length };
  }

  // Métodos privados

  private async cancelExistingActiveSubscriptions(tenantId: string) {
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        tenantId,
        status: { in: ['active', 'pending'] },
      },
    });

    for (const subscription of activeSubscriptions) {
      try {
        if (subscription.mercadoPagoPreapprovalId) {
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

  private async createMercadoPagoPreApproval(params: {
    planName: string;
    tenantName: string;
    amount: number;
    billingCycle: string;
    payerEmail: string;
    startDate: Date;
    endDate: Date;
    backUrls?: any;
    externalReference: string;
  }): Promise<MercadoPagoPreApproval> {
    // Simulación de la API de MercadoPago
    // En producción, usar la SDK real de MercadoPago

    const mockResponse: MercadoPagoPreApproval = {
      id: `MP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      init_point: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=mock-${Date.now()}`,
      sandbox_init_point: `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=mock-${Date.now()}`,
    };

    // Aquí iría la integración real con MercadoPago:
    /*
    const mercadoPago = new MercadoPagoConfig({
      accessToken: this.configService.get('MERCADOPAGO_ACCESS_TOKEN'),
    });

    const preApproval = new PreApproval(mercadoPago);
    
    const response = await preApproval.create({
      body: {
        reason: `${params.planName} - ${params.tenantName}`,
        auto_recurring: {
          frequency: params.billingCycle === 'monthly' ? 1 : 12,
          frequency_type: 'months',
          transaction_amount: params.amount,
          currency_id: 'CLP',
          start_date: params.startDate.toISOString(),
          end_date: params.endDate.toISOString(),
        },
        payer_email: params.payerEmail,
        back_url: params.backUrls?.success || `${process.env.FRONTEND_URL}/subscription/success`,
        external_reference: params.externalReference,
      },
    });

    return response;
    */

    return mockResponse;
  }

  private async cancelMercadoPagoPreApproval(preapprovalId: string) {
    // Simulación - en producción usar SDK real
    this.logger.log(`Cancelando preapproval en MercadoPago: ${preapprovalId}`);

    // Aquí iría la cancelación real:
    /*
    const preApproval = new PreApproval(this.mercadoPago);
    await preApproval.update({
      id: preapprovalId,
      body: { status: 'cancelled' },
    });
    */
  }

  private async handlePreApprovalUpdate(preapprovalId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { mercadoPagoPreapprovalId: preapprovalId },
    });

    if (!subscription) {
      this.logger.warn(
        `Suscripción no encontrada para preapproval: ${preapprovalId}`,
      );
      return;
    }

    // Simular obtención de estado de MercadoPago
    const mockStatus = 'authorized'; // En producción obtener de la API

    let newStatus = subscription.status;
    /*  switch (mockStatus) {
      case 'authorized':
        newStatus = 'active';
        break;
      case 'paused':
        newStatus = 'suspended';
        break;
      case 'cancelled':
        newStatus = 'cancelled';
        break;
      case 'pending':
        newStatus = 'pending';
        break;
    } */

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
    let subscription = null;
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
    /*  await this.prisma.payment.upsert({
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
 */
    // Si fue aprobado, extender suscripción
    /*  if (mockPayment.status === 'approved') {
      await this.extendSubscription(subscription.id);
    }
 */
    /* this.logger.log(
      `Pago procesado: ${paymentId} para suscripción: ${subscription.id}`,
    ); */
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
