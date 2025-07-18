import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantAccessGuard } from '../common/guards/tenant-access.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { FeatureAccessGuard } from '../common/guards/feature-access.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { RequireFeature } from '../common/decorators/feature-access.decorator';
import {
  CurrentTenant,
  CurrentUser,
} from '../common/decorators/tenant.decorator';

@Controller('appointments')
@UseGuards(
  TenantGuard,
  AuthGuard,
  TenantAccessGuard,
  PermissionsGuard,
  FeatureAccessGuard,
)
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Get()
  @RequirePermissions('appointments.read')
  @RequireFeature('basic_appointments')
  async getAppointments(
    @CurrentTenant() tenant: any,
    @Query('month') month?: string,
    @Query('providerId') providerId?: string,
  ) {
    return this.appointmentsService.getAppointments(tenant.id, {
      month,
      providerId,
    });
  }

  @Post()
  @RequirePermissions('appointments.create')
  @RequireFeature({
    feature: 'monthly_appointments',
    usage: 1,
    message:
      'Has alcanzado el límite de citas mensuales de tu plan. Actualiza para crear más citas.',
  })
  async createAppointment(
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
    @Body() createAppointmentDto: any,
  ) {
    return this.appointmentsService.createAppointment(
      tenant.id,
      user.id,
      createAppointmentDto,
    );
  }

  @Put(':id')
  @RequirePermissions('appointments.update')
  @RequireFeature('basic_appointments')
  async updateAppointment(
    @Param('id') id: string,
    @CurrentTenant() tenant: any,
    @Body() updateAppointmentDto: any,
  ) {
    return this.appointmentsService.updateAppointment(
      id,
      tenant.id,
      updateAppointmentDto,
    );
  }

  @Delete(':id')
  @RequirePermissions('appointments.delete')
  @RequireFeature('basic_appointments')
  async deleteAppointment(
    @Param('id') id: string,
    @CurrentTenant() tenant: any,
  ) {
    return this.appointmentsService.deleteAppointment(id, tenant.id);
  }

  @Get('reports/advanced')
  @RequirePermissions('reports.read')
  @RequireFeature({
    feature: 'advanced_reports',
    message:
      'Los reportes avanzados están disponibles en planes Básico y superiores.',
  })
  async getAdvancedReports(
    @CurrentTenant() tenant: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.appointmentsService.getAdvancedReports(tenant.id, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  }

  @Post('bulk-create')
  @RequirePermissions('appointments.create')
  @RequireFeature({
    feature: 'monthly_appointments',
    usage: 10, // Requiere 10 citas disponibles
    message:
      'No tienes suficientes citas disponibles en tu plan para crear múltiples citas.',
  })
  async bulkCreateAppointments(
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
    @Body() bulkCreateDto: { appointments: any[] },
  ) {
    return this.appointmentsService.bulkCreateAppointments(
      tenant.id,
      user.id,
      bulkCreateDto.appointments,
    );
  }

  @Get('online-booking/widget')
  @RequireFeature({
    feature: 'online_booking',
    message:
      'El widget de reservas online está disponible en planes Básico y superiores.',
  })
  async getOnlineBookingWidget(@CurrentTenant() tenant: any) {
    return this.appointmentsService.getOnlineBookingWidget(tenant.id);
  }

  @Post('send-reminders')
  @RequirePermissions('appointments.update')
  @RequireFeature({
    feature: 'automated_reminders',
    message:
      'Los recordatorios automáticos están disponibles en planes Básico y superiores.',
  })
  async sendAutomatedReminders(
    @CurrentTenant() tenant: any,
    @Body() reminderDto: { appointmentIds: string[] },
  ) {
    return this.appointmentsService.sendAutomatedReminders(
      tenant.id,
      reminderDto.appointmentIds,
    );
  }
}
