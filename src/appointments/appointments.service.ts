// src/appointments/appointments.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { FeaturesService } from '../common/services/features.service';

export interface CreateAppointmentDto {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  clientId: string;
  providerId?: string;
  serviceId?: string;
  notes?: string;
  metadata?: any;
}

export interface UpdateAppointmentDto {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  clientId?: string;
  providerId?: string;
  serviceId?: string;
  status?: string;
  notes?: string;
  metadata?: any;
}

export interface AppointmentFilters {
  month?: string;
  week?: string;
  day?: string;
  providerId?: string;
  clientId?: string;
  serviceId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface BulkCreateAppointmentDto {
  appointments: CreateAppointmentDto[];
}

export interface OnlineBookingConfig {
  isEnabled: boolean;
  availableHours: string[];
  advanceBookingDays: number;
  allowedServices: string[];
  widgetConfig: {
    primaryColor: string;
    secondaryColor: string;
    showProvider: boolean;
    showService: boolean;
    requirePhone: boolean;
  };
}

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private prisma: PrismaService,
    private featuresService: FeaturesService,
  ) {}

  async getAppointments(tenantId: string, filters: AppointmentFilters = {}) {
    // Verificar acceso a la feature
    await this.featuresService.requireFeatureAccess(
      tenantId,
      'basic_appointments',
    );

    const whereClause: any = { tenantId };

    // Aplicar filtros
    if (filters.providerId) {
      whereClause.providerId = filters.providerId;
    }

    if (filters.clientId) {
      whereClause.clientId = filters.clientId;
    }

    if (filters.serviceId) {
      whereClause.serviceId = filters.serviceId;
    }

    if (filters.status) {
      whereClause.status = filters.status;
    }

    // Filtros de fecha
    if (filters.startDate && filters.endDate) {
      whereClause.startTime = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    } else if (filters.month) {
      const [year, month] = filters.month.split('-');
      const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endOfMonth = new Date(
        parseInt(year),
        parseInt(month),
        0,
        23,
        59,
        59,
      );

      whereClause.startTime = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    } else if (filters.day) {
      const dayDate = new Date(filters.day);
      const startOfDay = new Date(
        dayDate.getFullYear(),
        dayDate.getMonth(),
        dayDate.getDate(),
      );
      const endOfDay = new Date(
        dayDate.getFullYear(),
        dayDate.getMonth(),
        dayDate.getDate(),
        23,
        59,
        59,
      );

      whereClause.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const appointments = await this.prisma.appointment.findMany({
      where: whereClause,
      orderBy: { startTime: 'asc' },
      take: 100, // Límite de resultados
    });

    return {
      appointments,
      total: appointments.length,
      filters: filters,
    };
  }

  async createAppointment(
    tenantId: string,
    userId: string,
    createDto: CreateAppointmentDto,
  ) {
    // Verificar y registrar uso de la feature
    await this.featuresService.requireFeatureAccess(
      tenantId,
      'monthly_appointments',
      1,
      'Has alcanzado el límite de citas mensuales de tu plan. Actualiza para crear más citas.',
    );

    // Validaciones básicas
    await this.validateAppointmentData(tenantId, createDto);

    // Verificar conflictos de horario
    await this.checkTimeConflicts(
      tenantId,
      createDto.startTime,
      createDto.endTime,
      createDto.providerId,
    );

    try {
      const appointment = await this.prisma.appointment.create({
        data: {
          tenantId,
          title: createDto.title,
          description: createDto.description,
          startTime: createDto.startTime,
          endTime: createDto.endTime,
          clientId: createDto.clientId,
          providerId: createDto.providerId,
          serviceId: createDto.serviceId,
          notes: createDto.notes,
          metadata: createDto.metadata,
          status: 'scheduled',
        },
      });

      this.logger.log(
        `Cita creada: ${appointment.id} para tenant: ${tenantId}`,
      );

      return appointment;
    } catch (error) {
      this.logger.error('Error creando cita:', error);
      throw new BadRequestException('Error al crear la cita');
    }
  }

  async updateAppointment(
    appointmentId: string,
    tenantId: string,
    updateDto: UpdateAppointmentDto,
  ) {
    // Verificar acceso
    await this.featuresService.requireFeatureAccess(
      tenantId,
      'basic_appointments',
    );

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId },
    });

    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    // Si se cambian horarios, verificar conflictos
    if (updateDto.startTime || updateDto.endTime) {
      const startTime = updateDto.startTime || appointment.startTime;
      const endTime = updateDto.endTime || appointment.endTime;
      const providerId = updateDto.providerId || appointment.providerId;

      await this.checkTimeConflicts(
        tenantId,
        startTime,
        endTime,
        providerId,
        appointmentId,
      );
    }

    try {
      const updatedAppointment = await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          ...updateDto,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Cita actualizada: ${appointmentId}`);

      return updatedAppointment;
    } catch (error) {
      this.logger.error('Error actualizando cita:', error);
      throw new BadRequestException('Error al actualizar la cita');
    }
  }

  async deleteAppointment(appointmentId: string, tenantId: string) {
    // Verificar acceso
    await this.featuresService.requireFeatureAccess(
      tenantId,
      'basic_appointments',
    );

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId },
    });

    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    try {
      await this.prisma.appointment.delete({
        where: { id: appointmentId },
      });

      this.logger.log(`Cita eliminada: ${appointmentId}`);

      return { message: 'Cita eliminada exitosamente' };
    } catch (error) {
      this.logger.error('Error eliminando cita:', error);
      throw new BadRequestException('Error al eliminar la cita');
    }
  }

  async bulkCreateAppointments(
    tenantId: string,
    userId: string,
    appointments: CreateAppointmentDto[],
  ) {
    const appointmentCount = appointments.length;

    // Verificar que tiene suficientes citas disponibles
    await this.featuresService.requireFeatureAccess(
      tenantId,
      'monthly_appointments',
      appointmentCount,
      `No tienes suficientes citas disponibles en tu plan para crear ${appointmentCount} citas.`,
    );

    const createdAppointments: any[] = [];
    const errors: {
      index: number;
      appointment: CreateAppointmentDto;
      error: string;
    }[] = [];

    for (let i = 0; i < appointments.length; i++) {
      try {
        // Validar cada cita
        await this.validateAppointmentData(tenantId, appointments[i]);

        // Verificar conflictos
        await this.checkTimeConflicts(
          tenantId,
          appointments[i].startTime,
          appointments[i].endTime,
          appointments[i].providerId,
        );

        const appointment = await this.prisma.appointment.create({
          data: {
            tenantId,
            title: appointments[i].title,
            description: appointments[i].description,
            startTime: appointments[i].startTime,
            endTime: appointments[i].endTime,
            clientId: appointments[i].clientId,
            providerId: appointments[i].providerId,
            serviceId: appointments[i].serviceId,
            notes: appointments[i].notes,
            metadata: appointments[i].metadata,
            status: 'scheduled',
          },
        });

        createdAppointments.push(appointment);
      } catch (error) {
        errors.push({
          index: i,
          appointment: appointments[i],
          error: error.message,
        });
      }
    }

    this.logger.log(
      `Creación masiva completada: ${createdAppointments.length} exitosas, ${errors.length} errores`,
    );

    return {
      created: createdAppointments,
      errors: errors,
      summary: {
        total: appointments.length,
        successful: createdAppointments.length,
        failed: errors.length,
      },
    };
  }

  async getAdvancedReports(
    tenantId: string,
    options: { startDate: Date; endDate: Date },
  ) {
    // Verificar acceso a reportes avanzados
    await this.featuresService.requireFeatureAccess(
      tenantId,
      'advanced_reports',
      1,
      'Los reportes avanzados están disponibles en planes Básico y superiores.',
    );

    const { startDate, endDate } = options;

    // Estadísticas básicas
    const totalAppointments = await this.prisma.appointment.count({
      where: {
        tenantId,
        startTime: { gte: startDate, lte: endDate },
      },
    });

    const appointmentsByStatus = await this.prisma.appointment.groupBy({
      by: ['status'],
      where: {
        tenantId,
        startTime: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    });

    const appointmentsByProvider = await this.prisma.appointment.groupBy({
      by: ['providerId'],
      where: {
        tenantId,
        startTime: { gte: startDate, lte: endDate },
        providerId: { not: null },
      },
      _count: { id: true },
    });

    // Tendencias por día
    const dailyStats = await this.generateDailyStats(
      tenantId,
      startDate,
      endDate,
    );

    return {
      period: { startDate, endDate },
      summary: {
        totalAppointments,
        byStatus: appointmentsByStatus,
        byProvider: appointmentsByProvider,
      },
      trends: {
        daily: dailyStats,
      },
      generatedAt: new Date(),
    };
  }

  async getOnlineBookingWidget(tenantId: string): Promise<OnlineBookingConfig> {
    // Verificar acceso a reservas online
    await this.featuresService.requireFeatureAccess(
      tenantId,
      'online_booking',
      1,
      'El widget de reservas online está disponible en planes Básico y superiores.',
    );

    // Obtener configuración del tenant
    const tenantSettings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    const services = await this.prisma.service.findMany({
      where: { tenantId, isActive: true },
      select: { id: true },
    });

    return {
      isEnabled: tenantSettings?.allowSelfBooking || false,
      availableHours: [
        '09:00',
        '10:00',
        '11:00',
        '14:00',
        '15:00',
        '16:00',
        '17:00',
      ],
      advanceBookingDays: tenantSettings?.advanceBookingDays || 30,
      allowedServices: services.map((s) => s.id),
      widgetConfig: {
        primaryColor: tenantSettings?.primaryColor || '#007bff',
        secondaryColor: tenantSettings?.secondaryColor || '#6c757d',
        showProvider: true,
        showService: true,
        requirePhone: tenantSettings?.requirePhoneVerification || false,
      },
    };
  }

  async sendAutomatedReminders(tenantId: string, appointmentIds: string[]) {
    // Verificar acceso a recordatorios automáticos
    await this.featuresService.requireFeatureAccess(
      tenantId,
      'automated_reminders',
      1,
      'Los recordatorios automáticos están disponibles en planes Básico y superiores.',
    );

    const appointments = await this.prisma.appointment.findMany({
      where: {
        id: { in: appointmentIds },
        tenantId,
        status: { in: ['scheduled', 'confirmed'] },
      },
    });

    const results: Array<{
      appointmentId: string;
      status: string;
      sentAt?: Date;
      error?: string;
    }> = [];

    for (const appointment of appointments) {
      try {
        // Aquí iría la lógica de envío real de recordatorios
        // Por ahora simulamos el envío
        const reminderSent = await this.sendReminderNotification(appointment);

        results.push({
          appointmentId: appointment.id,
          status: reminderSent ? 'sent' : 'failed',
          sentAt: new Date(),
        });
      } catch (error) {
        results.push({
          appointmentId: appointment.id,
          status: 'failed',
          error: error.message,
        });
      }
    }

    this.logger.log(
      `Recordatorios enviados para ${results.filter((r) => r.status === 'sent').length}/${results.length} citas`,
    );

    return {
      results,
      summary: {
        total: appointmentIds.length,
        sent: results.filter((r) => r.status === 'sent').length,
        failed: results.filter((r) => r.status === 'failed').length,
      },
    };
  }

  // Métodos privados

  private async validateAppointmentData(
    tenantId: string,
    data: CreateAppointmentDto,
  ) {
    // Validar que startTime sea anterior a endTime
    if (data.startTime >= data.endTime) {
      throw new BadRequestException(
        'La hora de inicio debe ser anterior a la hora de fin',
      );
    }

    // Validar que la cita no sea en el pasado
    if (data.startTime < new Date()) {
      throw new BadRequestException('No se pueden crear citas en el pasado');
    }

    // Validar que el cliente exista y pertenezca al tenant
    const clientExists = await this.prisma.userTenant.findFirst({
      where: {
        userId: data.clientId,
        tenantId,
        status: 'active',
      },
    });

    if (!clientExists) {
      throw new BadRequestException('Cliente no encontrado o inactivo');
    }

    // Validar provider si se especifica
    if (data.providerId) {
      const providerExists = await this.prisma.provider.findFirst({
        where: {
          userId: data.providerId,
          tenantId,
          isActive: true,
        },
      });

      if (!providerExists) {
        throw new BadRequestException('Proveedor no encontrado o inactivo');
      }
    }

    // Validar servicio si se especifica
    if (data.serviceId) {
      const serviceExists = await this.prisma.service.findFirst({
        where: {
          id: data.serviceId,
          tenantId,
          isActive: true,
        },
      });

      if (!serviceExists) {
        throw new BadRequestException('Servicio no encontrado o inactivo');
      }
    }
  }

  private async checkTimeConflicts(
    tenantId: string,
    startTime: Date,
    endTime: Date,
    providerId?: string,
    excludeAppointmentId?: string,
  ) {
    const whereClause: any = {
      tenantId,
      status: { in: ['scheduled', 'confirmed'] },
      OR: [
        {
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      ],
    };

    if (providerId) {
      whereClause.providerId = providerId;
    }

    if (excludeAppointmentId) {
      whereClause.id = { not: excludeAppointmentId };
    }

    const conflictingAppointments = await this.prisma.appointment.findMany({
      where: whereClause,
    });

    if (conflictingAppointments.length > 0) {
      throw new BadRequestException(
        `Conflicto de horario detectado. Ya existe una cita en el horario seleccionado.`,
      );
    }
  }

  private async generateDailyStats(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ date: string; appointments: number }[]> {
    const dailyStats: { date: string; appointments: number }[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
      );
      const dayEnd = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        23,
        59,
        59,
      );

      const appointmentsCount = await this.prisma.appointment.count({
        where: {
          tenantId,
          startTime: { gte: dayStart, lte: dayEnd },
        },
      });

      dailyStats.push({
        date: dayStart.toISOString().split('T')[0],
        appointments: appointmentsCount,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dailyStats;
  }

  private async sendReminderNotification(appointment: any): Promise<boolean> {
    // Simulación de envío de recordatorio
    // En producción, aquí iría la integración con servicio de email/SMS
    this.logger.log(`Enviando recordatorio para cita: ${appointment.id}`);

    // Simular éxito/fallo aleatorio
    return Math.random() > 0.1; // 90% de éxito
  }
}
