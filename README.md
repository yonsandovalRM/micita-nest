# 🏢 Multi-Tenant Business Management Platform

Una plataforma robusta de gestión empresarial multi-tenant construida con **NestJS**, **Prisma** y **PostgreSQL**. Ideal para clínicas, salones de belleza, consultorías y cualquier negocio que necesite gestionar citas, clientes y servicios.

## 🚀 Características Principales

### 🏗️ **Arquitectura Multi-Tenant**

- **Aislamiento completo de datos** por tenant (negocio)
- **Configuración personalizable** por cada tenant
- **Subdominios o rutas personalizadas** para cada negocio
- **Branding independiente** (colores, logos, configuraciones)

### 🔐 **Sistema de Autenticación Avanzado**

- **Múltiples métodos de autenticación**:
  - Email/Password con validaciones robustas
  - Google OAuth integrado
- **Verificación de email** configurable por tenant
- **Reset de contraseña** seguro con tokens temporales
- **Sesiones JWT** con refresh tokens automáticos

### 👥 **Sistema de Roles y Permisos Granular**

- **Roles predefinidos del sistema**:
  - `owner`: Acceso completo al tenant
  - `admin`: Gestión administrativa completa
  - `provider`: Profesionales/prestadores de servicios
  - `receptionist`: Personal de recepción
  - `client`: Clientes finales

- **Permisos específicos** por categoría:
  - `users.*`: Gestión de usuarios
  - `appointments.*`: Manejo de citas
  - `services.*`: Administración de servicios
  - `providers.*`: Gestión de profesionales
  - `settings.*`: Configuración del sistema

### 🎯 **Funcionalidades del Negocio**

- **Gestión de citas y reservas**
- **Catálogo de servicios** con precios y duraciones
- **Directorio de profesionales** con especialidades
- **Sistema de clientes** con historial completo
- **Configuración de horarios** y disponibilidad
- **Notificaciones por email** personalizables

## 🛠️ Stack Tecnológico

- **Backend Framework**: NestJS (con Fastify)
- **Base de Datos**: PostgreSQL + Prisma ORM
- **Autenticación**: JWT + Google OAuth
- **Validación**: class-validator + class-transformer
- **Email**: Nodemailer
- **Containerización**: Docker + Docker Compose

## 📋 Requisitos Previos

- Node.js 18+
- Docker y Docker Compose
- Cuenta de Google Cloud (para OAuth)
- Proveedor de email SMTP

## 🚀 Instalación y Configuración

### 1. **Clonar el Repositorio**

```bash
git clone <tu-repo>
cd multi-tenant-platform
npm install
```

### 2. **Configurar Variables de Entorno**

```bash
cp .env.example .env
```

Configurar las siguientes variables en `.env`:

```env
# Base de datos
DATABASE_URL="postgresql://postgres:password@localhost:5432/business_platform"

# JWT
JWT_SECRET="tu-secret-key-super-seguro"

# URLs
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:3001"

# Google OAuth
GOOGLE_CLIENT_ID="tu-google-client-id"
GOOGLE_CLIENT_SECRET="tu-google-client-secret"

# Email SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu-email@gmail.com"
SMTP_PASS="tu-app-password"
SMTP_FROM="noreply@tudominio.com"
SMTP_SECURE="false"
```

### 3. **Levantar la Base de Datos**

```bash
docker-compose up -d postgres
```

### 4. **Ejecutar Migraciones**

```bash
npx prisma generate
npx prisma db push
```

### 5. **Inicializar Datos del Sistema**

```bash
npm run initialize-roles
```

### 6. **Iniciar el Servidor**

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## 📚 Estructura del Proyecto

```
src/
├── auth/                    # Sistema de autenticación
│   ├── auth.controller.ts   # Endpoints de auth
│   ├── auth.service.ts      # Lógica de autenticación
│   └── dto/                 # DTOs de validación
├── common/                  # Servicios y utilidades compartidas
│   ├── decorators/          # Decoradores personalizados
│   ├── guards/              # Guards de seguridad
│   └── services/            # Servicios base (Prisma, Email, etc.)
├── roles/                   # Sistema de roles y permisos
├── tenants/                 # Gestión de tenants
├── users/                   # Gestión de usuarios
└── main.ts                  # Punto de entrada
```

## 🔧 Uso de la API

### **Headers Requeridos**

Todas las peticiones (excepto auth públicas) requieren:

```
Authorization: Bearer <jwt-token>
x-tenant-id: <tenant-slug-o-id>
```

### **Flujo de Autenticación**

1. **Registro de Usuario**

```bash
POST /auth/register/email
{
  "email": "usuario@email.com",
  "password": "Password123!",
  "tenantSlug": "mi-negocio",
  "firstName": "Juan",
  "lastName": "Pérez"
}
```

2. **Verificación de Email** (si está habilitada)

```bash
POST /auth/verify-email
{
  "token": "verification-token",
  "tenantSlug": "mi-negocio"
}
```

3. **Login**

```bash
POST /auth/login/email
{
  "email": "usuario@email.com",
  "password": "Password123!",
  "tenantSlug": "mi-negocio"
}
```

### **Gestión de Roles**

```bash
# Listar roles del tenant
GET /roles
Headers: x-tenant-id: mi-negocio

# Crear rol personalizado
POST /roles
{
  "name": "veterinario",
  "displayName": "Veterinario",
  "description": "Profesional veterinario",
  "permissionIds": ["services.read", "appointments.read"]
}

# Asignar rol a usuario
POST /roles/{roleId}/assign-user
{
  "userId": "user-id"
}
```

## 🏢 Configuración de Tenant

### **Configuraciones Disponibles**

- **Horarios de trabajo** por día de la semana
- **Días festivos** y no laborales
- **Políticas de reservas** (anticipación, cancelación)
- **Métodos de autenticación** permitidos
- **Notificaciones** (email, SMS)
- **Branding** (colores, logos)

### **Ejemplo de Configuración**

```json
{
  "allowSelfBooking": true,
  "requireApproval": false,
  "advanceBookingDays": 30,
  "cancellationHours": 24,
  "workingHours": {
    "monday": { "start": "09:00", "end": "18:00" },
    "tuesday": { "start": "09:00", "end": "18:00" }
  },
  "primaryColor": "#007bff",
  "allowGoogleSignIn": true
}
```

## 🛡️ Seguridad y Permisos

### **Niveles de Protección**

1. **AuthGuard**: Valida JWT token
2. **TenantGuard**: Valida acceso al tenant
3. **PermissionsGuard**: Valida permisos específicos
4. **RolesGuard**: Valida roles requeridos

### **Uso de Decoradores**

```typescript
@RequirePermissions('users.read', 'users.update')
@RequireRoles('admin', 'owner')
async updateUser() {
  // Solo admin u owner con permisos específicos
}
```

## 📊 Base de Datos

### **Modelos Principales**

- `User`: Usuarios del sistema
- `Tenant`: Negocios/organizaciones
- `UserTenant`: Relación usuario-tenant con rol
- `Role`: Roles dentro de cada tenant
- `Permission`: Permisos granulares
- `Service`: Servicios ofrecidos
- `Appointment`: Citas y reservas
- `Provider`: Profesionales/prestadores

### **Comandos Útiles de Prisma**

```bash
# Generar cliente
npx prisma generate

# Aplicar cambios al esquema
npx prisma db push

# Resetear base de datos
npx prisma db reset

# Abrir Prisma Studio
npx prisma studio
```

## 🚀 Despliegue

### **Docker Compose (Recomendado)**

```bash
# Levantar todo el stack
docker-compose up -d

# Ver logs
docker-compose logs -f api

# Escalar servicios
docker-compose up -d --scale api=3
```

### **Variables de Producción**

```env
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@prod-db:5432/business_platform"
JWT_SECRET="super-secret-production-key"
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## 📈 Próximas Funcionalidades

- [ ] Sistema de notificaciones push
- [ ] Integración con calendarios externos
- [ ] Reportes y analytics avanzados
- [ ] API de pagos (Stripe/PayPal)
- [ ] Sistema de inventario
- [ ] App móvil con React Native
- [ ] Integración con WhatsApp Business

## 🤝 Contribución

1. Fork el proyecto
2. Crear branch para feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para detalles.

## 📞 Soporte

- **Issues**: [GitHub Issues](https://github.com/tu-usuario/tu-repo/issues)
- **Documentación**: [Wiki del Proyecto](https://github.com/tu-usuario/tu-repo/wiki)
- **Email**: soporte@tudominio.com

---

**Desarrollado con ❤️ para empoderar negocios locales**
