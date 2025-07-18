export interface SystemFeature {
  key: string;
  name: string;
  description: string;
  category: string;
  isCore: boolean;
  defaultLimit?: number;
  defaultIsUnlimited: boolean;
}

export const SYSTEM_FEATURES: SystemFeature[] = [
  // ========================================
  // FEATURES CORE - Disponibles en todos los planes
  // ========================================
  {
    key: 'basic_appointments',
    name: 'Gestión Básica de Citas',
    description: 'Crear, editar y gestionar citas básicas',
    category: 'core',
    isCore: true,
    defaultIsUnlimited: true,
  },
  {
    key: 'basic_clients',
    name: 'Gestión Básica de Clientes',
    description: 'Registrar y gestionar información básica de clientes',
    category: 'core',
    isCore: true,
    defaultIsUnlimited: true,
  },
  {
    key: 'basic_services',
    name: 'Gestión Básica de Servicios',
    description: 'Crear y gestionar servicios básicos',
    category: 'core',
    isCore: true,
    defaultLimit: 5,
    defaultIsUnlimited: false,
  },
  {
    key: 'basic_calendar',
    name: 'Calendario Básico',
    description: 'Vista de calendario básica para citas',
    category: 'core',
    isCore: true,
    defaultIsUnlimited: true,
  },
  {
    key: 'basic_dashboard',
    name: 'Dashboard Básico',
    description: 'Panel de control con métricas básicas',
    category: 'core',
    isCore: true,
    defaultIsUnlimited: true,
  },

  // ========================================
  // FEATURES DE CAPACIDAD - Límites de uso
  // ========================================
  {
    key: 'monthly_appointments',
    name: 'Límite de Citas Mensuales',
    description: 'Número máximo de citas que se pueden crear por mes',
    category: 'capacity',
    isCore: false,
    defaultLimit: 50,
    defaultIsUnlimited: false,
  },
  {
    key: 'total_clients',
    name: 'Límite Total de Clientes',
    description: 'Número máximo de clientes que se pueden registrar',
    category: 'capacity',
    isCore: false,
    defaultLimit: 100,
    defaultIsUnlimited: false,
  },
  {
    key: 'providers_limit',
    name: 'Límite de Profesionales',
    description: 'Número máximo de profesionales que se pueden registrar',
    category: 'capacity',
    isCore: false,
    defaultLimit: 1,
    defaultIsUnlimited: false,
  },
  {
    key: 'services_limit',
    name: 'Límite de Servicios',
    description: 'Número máximo de servicios que se pueden crear',
    category: 'capacity',
    isCore: false,
    defaultLimit: 10,
    defaultIsUnlimited: false,
  },
  {
    key: 'storage_limit',
    name: 'Límite de Almacenamiento',
    description: 'Espacio máximo para archivos y documentos (MB)',
    category: 'capacity',
    isCore: false,
    defaultLimit: 100,
    defaultIsUnlimited: false,
  },

  // ========================================
  // FEATURES AVANZADAS - Funcionalidades premium
  // ========================================
  {
    key: 'advanced_reports',
    name: 'Reportes Avanzados',
    description: 'Acceso a reportes detallados y analytics avanzados',
    category: 'advanced',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'custom_fields',
    name: 'Campos Personalizados',
    description: 'Crear campos personalizados para clientes y citas',
    category: 'advanced',
    isCore: false,
    defaultLimit: 5,
    defaultIsUnlimited: false,
  },
  {
    key: 'automated_reminders',
    name: 'Recordatorios Automáticos',
    description: 'Envío automático de recordatorios por email y SMS',
    category: 'advanced',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'online_booking',
    name: 'Reservas Online',
    description: 'Widget de reservas online para sitio web',
    category: 'advanced',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'multi_location',
    name: 'Múltiples Ubicaciones',
    description: 'Gestionar múltiples sucursales o ubicaciones',
    category: 'advanced',
    isCore: false,
    defaultLimit: 1,
    defaultIsUnlimited: false,
  },
  {
    key: 'advanced_calendar',
    name: 'Calendario Avanzado',
    description: 'Vista de calendario con features avanzadas y sincronización',
    category: 'advanced',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'group_appointments',
    name: 'Citas Grupales',
    description: 'Crear y gestionar citas para múltiples clientes',
    category: 'advanced',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'recurring_appointments',
    name: 'Citas Recurrentes',
    description: 'Crear citas que se repiten automáticamente',
    category: 'advanced',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'waitlist_management',
    name: 'Gestión de Lista de Espera',
    description: 'Manejar listas de espera para citas canceladas',
    category: 'advanced',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'advanced_scheduling',
    name: 'Programación Avanzada',
    description: 'Reglas de negocio complejas para horarios',
    category: 'advanced',
    isCore: false,
    defaultIsUnlimited: false,
  },

  // ========================================
  // FEATURES DE MARKETING - Herramientas de marketing
  // ========================================
  {
    key: 'email_marketing',
    name: 'Email Marketing',
    description: 'Envío de campañas de email marketing a clientes',
    category: 'marketing',
    isCore: false,
    defaultLimit: 500,
    defaultIsUnlimited: false,
  },
  {
    key: 'sms_marketing',
    name: 'SMS Marketing',
    description: 'Envío de campañas SMS a clientes',
    category: 'marketing',
    isCore: false,
    defaultLimit: 100,
    defaultIsUnlimited: false,
  },
  {
    key: 'loyalty_program',
    name: 'Programa de Fidelidad',
    description: 'Sistema de puntos y recompensas para clientes',
    category: 'marketing',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'promotions',
    name: 'Promociones y Descuentos',
    description: 'Crear y gestionar promociones y códigos de descuento',
    category: 'marketing',
    isCore: false,
    defaultLimit: 10,
    defaultIsUnlimited: false,
  },
  {
    key: 'referral_program',
    name: 'Programa de Referidos',
    description: 'Sistema de referencias y comisiones',
    category: 'marketing',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'social_media_integration',
    name: 'Integración Redes Sociales',
    description: 'Publicar automáticamente en Facebook, Instagram, etc.',
    category: 'marketing',
    isCore: false,
    defaultIsUnlimited: false,
  },

  // ========================================
  // FEATURES DE INTEGRACIÓN - APIs y conectores
  // ========================================
  {
    key: 'api_access',
    name: 'Acceso a API',
    description:
      'Acceso completo a la API REST para integraciones personalizadas',
    category: 'integrations',
    isCore: false,
    defaultLimit: 1000,
    defaultIsUnlimited: false,
  },
  {
    key: 'webhook_notifications',
    name: 'Webhooks',
    description: 'Notificaciones webhook para eventos del sistema',
    category: 'integrations',
    isCore: false,
    defaultLimit: 5,
    defaultIsUnlimited: false,
  },
  {
    key: 'calendar_sync',
    name: 'Sincronización de Calendarios',
    description: 'Sincronizar con Google Calendar, Outlook y otros',
    category: 'integrations',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'payment_processing',
    name: 'Procesamiento de Pagos',
    description:
      'Integración con pasarelas de pago (MercadoPago, Stripe, etc.)',
    category: 'integrations',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'third_party_integrations',
    name: 'Integraciones de Terceros',
    description: 'Conectar con sistemas externos y herramientas populares',
    category: 'integrations',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'zapier_integration',
    name: 'Integración con Zapier',
    description: 'Conectar con miles de aplicaciones vía Zapier',
    category: 'integrations',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'csv_import_export',
    name: 'Importar/Exportar CSV',
    description: 'Importar y exportar datos en formato CSV',
    category: 'integrations',
    isCore: false,
    defaultIsUnlimited: false,
  },

  // ========================================
  // FEATURES PREMIUM - Funcionalidades exclusivas
  // ========================================
  {
    key: 'white_label',
    name: 'Marca Blanca',
    description: 'Personalización completa de marca y dominio personalizado',
    category: 'premium',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'priority_support',
    name: 'Soporte Prioritario',
    description: 'Soporte técnico prioritario 24/7 con respuesta garantizada',
    category: 'premium',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'advanced_security',
    name: 'Seguridad Avanzada',
    description:
      'Features de seguridad adicionales como 2FA, audit logs, backup automático',
    category: 'premium',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'custom_branding',
    name: 'Branding Personalizado',
    description: 'Personalización completa de colores, logos y estilos',
    category: 'premium',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'advanced_analytics',
    name: 'Analytics Avanzados',
    description:
      'Métricas avanzadas, dashboard personalizable y exportación de datos',
    category: 'premium',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'data_backup',
    name: 'Respaldo de Datos',
    description: 'Respaldo automático y recuperación de datos',
    category: 'premium',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'custom_domains',
    name: 'Dominios Personalizados',
    description: 'Usar dominio propio para la aplicación',
    category: 'premium',
    isCore: false,
    defaultIsUnlimited: false,
  },
  {
    key: 'audit_logs',
    name: 'Logs de Auditoría',
    description: 'Registro detallado de todas las acciones del sistema',
    category: 'premium',
    isCore: false,
    defaultIsUnlimited: false,
  },
];
