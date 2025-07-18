export interface PlanFeatureConfig {
  isIncluded: boolean;
  isUnlimited?: boolean;
  limit?: number;
}

export interface PlanConfiguration {
  name: string;
  slug: string;
  description: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  isPopular?: boolean;
  maxTenants?: number | null; // null para ilimitado
  maxUsers?: number | null; // null para ilimitado
  sortOrder: number;
  features: Record<string, PlanFeatureConfig>;
}

export const PLANS_CONFIGURATION: PlanConfiguration[] = [
  // ========================================
  // PLAN GRATUITO
  // ========================================
  {
    name: 'Gratuito',
    slug: 'free',
    description:
      'Perfecto para comenzar con lo esencial. Ideal para profesionales independientes que recién inician.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxTenants: 1,
    maxUsers: 2,
    sortOrder: 1,
    features: {
      // Features Core - Limitadas
      basic_appointments: { isIncluded: true, isUnlimited: false, limit: 50 },
      basic_clients: { isIncluded: true, isUnlimited: false, limit: 50 },
      basic_services: { isIncluded: true, isUnlimited: false, limit: 3 },
      basic_calendar: { isIncluded: true, isUnlimited: true },
      basic_dashboard: { isIncluded: true, isUnlimited: true },

      // Capacidad muy limitada
      monthly_appointments: { isIncluded: true, isUnlimited: false, limit: 30 },
      total_clients: { isIncluded: true, isUnlimited: false, limit: 50 },
      providers_limit: { isIncluded: true, isUnlimited: false, limit: 1 },
      services_limit: { isIncluded: true, isUnlimited: false, limit: 3 },
      storage_limit: { isIncluded: true, isUnlimited: false, limit: 50 },

      // Sin features avanzadas
      advanced_reports: { isIncluded: false },
      custom_fields: { isIncluded: false },
      automated_reminders: { isIncluded: false },
      online_booking: { isIncluded: false },
      multi_location: { isIncluded: false },
      advanced_calendar: { isIncluded: false },
      group_appointments: { isIncluded: false },
      recurring_appointments: { isIncluded: false },
      waitlist_management: { isIncluded: false },
      advanced_scheduling: { isIncluded: false },

      // Sin marketing
      email_marketing: { isIncluded: false },
      sms_marketing: { isIncluded: false },
      loyalty_program: { isIncluded: false },
      promotions: { isIncluded: false },
      referral_program: { isIncluded: false },
      social_media_integration: { isIncluded: false },

      // Sin integraciones
      api_access: { isIncluded: false },
      webhook_notifications: { isIncluded: false },
      calendar_sync: { isIncluded: false },
      payment_processing: { isIncluded: false },
      third_party_integrations: { isIncluded: false },
      zapier_integration: { isIncluded: false },
      csv_import_export: { isIncluded: true, isUnlimited: true }, // Básico incluido

      // Sin premium
      white_label: { isIncluded: false },
      priority_support: { isIncluded: false },
      advanced_security: { isIncluded: false },
      custom_branding: { isIncluded: false },
      advanced_analytics: { isIncluded: false },
      data_backup: { isIncluded: false },
      custom_domains: { isIncluded: false },
      audit_logs: { isIncluded: false },
    },
  },

  // ========================================
  // PLAN BÁSICO
  // ========================================
  {
    name: 'Básico',
    slug: 'basic',
    description:
      'Para pequeños negocios que necesitan funcionalidades esenciales con mayor capacidad.',
    monthlyPrice: 19990, // $19.990 CLP (~$22 USD)
    yearlyPrice: 199900, // $199.900 CLP (equivalente a 10 meses - 2 meses gratis)
    maxTenants: 1,
    maxUsers: 10,
    sortOrder: 2,
    features: {
      // Features Core ampliadas
      basic_appointments: { isIncluded: true, isUnlimited: false, limit: 500 },
      basic_clients: { isIncluded: true, isUnlimited: false, limit: 500 },
      basic_services: { isIncluded: true, isUnlimited: false, limit: 15 },
      basic_calendar: { isIncluded: true, isUnlimited: true },
      basic_dashboard: { isIncluded: true, isUnlimited: true },

      // Capacidad incrementada
      monthly_appointments: {
        isIncluded: true,
        isUnlimited: false,
        limit: 200,
      },
      total_clients: { isIncluded: true, isUnlimited: false, limit: 500 },
      providers_limit: { isIncluded: true, isUnlimited: false, limit: 3 },
      services_limit: { isIncluded: true, isUnlimited: false, limit: 15 },
      storage_limit: { isIncluded: true, isUnlimited: false, limit: 500 },

      // Algunas features avanzadas básicas
      advanced_reports: { isIncluded: true, isUnlimited: true },
      custom_fields: { isIncluded: true, isUnlimited: false, limit: 5 },
      automated_reminders: { isIncluded: true, isUnlimited: true },
      online_booking: { isIncluded: true, isUnlimited: true },
      multi_location: { isIncluded: false },
      advanced_calendar: { isIncluded: true, isUnlimited: true },
      group_appointments: { isIncluded: false },
      recurring_appointments: { isIncluded: true, isUnlimited: true },
      waitlist_management: { isIncluded: true, isUnlimited: true },
      advanced_scheduling: { isIncluded: false },

      // Marketing básico
      email_marketing: { isIncluded: true, isUnlimited: false, limit: 200 },
      sms_marketing: { isIncluded: false },
      loyalty_program: { isIncluded: false },
      promotions: { isIncluded: true, isUnlimited: false, limit: 3 },
      referral_program: { isIncluded: false },
      social_media_integration: { isIncluded: false },

      // Integraciones limitadas
      api_access: { isIncluded: false },
      webhook_notifications: { isIncluded: false },
      calendar_sync: { isIncluded: true, isUnlimited: true },
      payment_processing: { isIncluded: true, isUnlimited: true },
      third_party_integrations: { isIncluded: true, isUnlimited: true },
      zapier_integration: { isIncluded: false },
      csv_import_export: { isIncluded: true, isUnlimited: true },

      // Algunas features premium básicas
      white_label: { isIncluded: false },
      priority_support: { isIncluded: false },
      advanced_security: { isIncluded: false },
      custom_branding: { isIncluded: true, isUnlimited: true },
      advanced_analytics: { isIncluded: false },
      data_backup: { isIncluded: false },
      custom_domains: { isIncluded: false },
      audit_logs: { isIncluded: false },
    },
  },

  // ========================================
  // PLAN PROFESIONAL - ⭐ POPULAR
  // ========================================
  {
    name: 'Profesional',
    slug: 'professional',
    description:
      'Para negocios en crecimiento que necesitan funcionalidades avanzadas y mayor capacidad.',
    monthlyPrice: 49990, // $49.990 CLP (~$55 USD)
    yearlyPrice: 499900, // $499.900 CLP (equivalente a 10 meses)
    isPopular: true,
    maxTenants: 3,
    maxUsers: 50,
    sortOrder: 3,
    features: {
      // Features Core casi ilimitadas
      basic_appointments: { isIncluded: true, isUnlimited: true },
      basic_clients: { isIncluded: true, isUnlimited: true },
      basic_services: { isIncluded: true, isUnlimited: true },
      basic_calendar: { isIncluded: true, isUnlimited: true },
      basic_dashboard: { isIncluded: true, isUnlimited: true },

      // Capacidad muy amplia
      monthly_appointments: {
        isIncluded: true,
        isUnlimited: false,
        limit: 1000,
      },
      total_clients: { isIncluded: true, isUnlimited: true },
      providers_limit: { isIncluded: true, isUnlimited: false, limit: 10 },
      services_limit: { isIncluded: true, isUnlimited: true },
      storage_limit: { isIncluded: true, isUnlimited: false, limit: 2000 },

      // Todas las features avanzadas
      advanced_reports: { isIncluded: true, isUnlimited: true },
      custom_fields: { isIncluded: true, isUnlimited: false, limit: 20 },
      automated_reminders: { isIncluded: true, isUnlimited: true },
      online_booking: { isIncluded: true, isUnlimited: true },
      multi_location: { isIncluded: true, isUnlimited: false, limit: 3 },
      advanced_calendar: { isIncluded: true, isUnlimited: true },
      group_appointments: { isIncluded: true, isUnlimited: true },
      recurring_appointments: { isIncluded: true, isUnlimited: true },
      waitlist_management: { isIncluded: true, isUnlimited: true },
      advanced_scheduling: { isIncluded: true, isUnlimited: true },

      // Marketing completo
      email_marketing: { isIncluded: true, isUnlimited: false, limit: 1000 },
      sms_marketing: { isIncluded: true, isUnlimited: false, limit: 300 },
      loyalty_program: { isIncluded: true, isUnlimited: true },
      promotions: { isIncluded: true, isUnlimited: false, limit: 15 },
      referral_program: { isIncluded: true, isUnlimited: true },
      social_media_integration: { isIncluded: true, isUnlimited: true },

      // Integraciones completas
      api_access: { isIncluded: true, isUnlimited: false, limit: 5000 },
      webhook_notifications: {
        isIncluded: true,
        isUnlimited: false,
        limit: 20,
      },
      calendar_sync: { isIncluded: true, isUnlimited: true },
      payment_processing: { isIncluded: true, isUnlimited: true },
      third_party_integrations: { isIncluded: true, isUnlimited: true },
      zapier_integration: { isIncluded: true, isUnlimited: true },
      csv_import_export: { isIncluded: true, isUnlimited: true },

      // Algunas features premium
      white_label: { isIncluded: false },
      priority_support: { isIncluded: true, isUnlimited: true },
      advanced_security: { isIncluded: true, isUnlimited: true },
      custom_branding: { isIncluded: true, isUnlimited: true },
      advanced_analytics: { isIncluded: true, isUnlimited: true },
      data_backup: { isIncluded: true, isUnlimited: true },
      custom_domains: { isIncluded: false },
      audit_logs: { isIncluded: true, isUnlimited: true },
    },
  },

  // ========================================
  // PLAN EMPRESARIAL
  // ========================================
  {
    name: 'Empresarial',
    slug: 'enterprise',
    description:
      'Solución completa para empresas con múltiples ubicaciones y equipos grandes.',
    monthlyPrice: 99990, // $99.990 CLP (~$110 USD)
    yearlyPrice: 999900, // $999.900 CLP (equivalente a 10 meses)
    maxTenants: null, // Ilimitado
    maxUsers: null, // Ilimitado
    sortOrder: 4,
    features: {
      // Todo ilimitado
      basic_appointments: { isIncluded: true, isUnlimited: true },
      basic_clients: { isIncluded: true, isUnlimited: true },
      basic_services: { isIncluded: true, isUnlimited: true },
      basic_calendar: { isIncluded: true, isUnlimited: true },
      basic_dashboard: { isIncluded: true, isUnlimited: true },
      monthly_appointments: { isIncluded: true, isUnlimited: true },
      total_clients: { isIncluded: true, isUnlimited: true },
      providers_limit: { isIncluded: true, isUnlimited: true },
      services_limit: { isIncluded: true, isUnlimited: true },
      storage_limit: { isIncluded: true, isUnlimited: true },

      // Todas las features avanzadas ilimitadas
      advanced_reports: { isIncluded: true, isUnlimited: true },
      custom_fields: { isIncluded: true, isUnlimited: true },
      automated_reminders: { isIncluded: true, isUnlimited: true },
      online_booking: { isIncluded: true, isUnlimited: true },
      multi_location: { isIncluded: true, isUnlimited: true },
      advanced_calendar: { isIncluded: true, isUnlimited: true },
      group_appointments: { isIncluded: true, isUnlimited: true },
      recurring_appointments: { isIncluded: true, isUnlimited: true },
      waitlist_management: { isIncluded: true, isUnlimited: true },
      advanced_scheduling: { isIncluded: true, isUnlimited: true },

      // Marketing ilimitado
      email_marketing: { isIncluded: true, isUnlimited: true },
      sms_marketing: { isIncluded: true, isUnlimited: true },
      loyalty_program: { isIncluded: true, isUnlimited: true },
      promotions: { isIncluded: true, isUnlimited: true },
      referral_program: { isIncluded: true, isUnlimited: true },
      social_media_integration: { isIncluded: true, isUnlimited: true },

      // Todas las integraciones
      api_access: { isIncluded: true, isUnlimited: true },
      webhook_notifications: { isIncluded: true, isUnlimited: true },
      calendar_sync: { isIncluded: true, isUnlimited: true },
      payment_processing: { isIncluded: true, isUnlimited: true },
      third_party_integrations: { isIncluded: true, isUnlimited: true },
      zapier_integration: { isIncluded: true, isUnlimited: true },
      csv_import_export: { isIncluded: true, isUnlimited: true },

      // Todas las features premium
      white_label: { isIncluded: true, isUnlimited: true },
      priority_support: { isIncluded: true, isUnlimited: true },
      advanced_security: { isIncluded: true, isUnlimited: true },
      custom_branding: { isIncluded: true, isUnlimited: true },
      advanced_analytics: { isIncluded: true, isUnlimited: true },
      data_backup: { isIncluded: true, isUnlimited: true },
      custom_domains: { isIncluded: true, isUnlimited: true },
      audit_logs: { isIncluded: true, isUnlimited: true },
    },
  },
];
