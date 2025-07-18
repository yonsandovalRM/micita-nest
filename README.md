# Configuración de Base de Datos PostgreSQL con Docker

## Estructura de archivos

```
proyecto/
├── docker-compose.yml
├── .env
├── init-scripts/
│   └── 01-init.sql
├── postgres-data/        # Creado automáticamente
├── pgadmin-data/         # Creado automáticamente
└── DATABASE_SETUP.md
```

## Configuración inicial

1. **Copia los archivos** en la raíz de tu proyecto
2. **Configura las variables de entorno** en el archivo `.env`
3. **Cambia las contraseñas** por valores seguros en producción

## Comandos básicos

### Iniciar la base de datos

```bash
# Solo PostgreSQL
docker-compose up -d postgres

# PostgreSQL + pgAdmin
docker-compose --profile admin up -d
```

### Detener los servicios

```bash
docker-compose down
```

### Ver logs

```bash
# Logs de PostgreSQL
docker-compose logs -f postgres

# Logs de pgAdmin
docker-compose logs -f pgadmin
```

### Reiniciar servicios

```bash
docker-compose restart postgres
```

## Configuración de Prisma

1. **Instalar Prisma CLI** (si no lo tienes):

```bash
npm install -g prisma
```

2. **Ejecutar migraciones**:

```bash
# Generar migración inicial
npx prisma migrate dev --name init

# Aplicar migraciones
npx prisma migrate deploy

# Generar el cliente de Prisma
npx prisma generate
```

3. **Poblar datos iniciales** (opcional):

```bash
npx prisma db seed
```

## Acceso a la base de datos

### Desde tu aplicación NestJS

- **URL**: `postgresql://postgres:your_password@localhost:5432/booking_system`
- **Host**: `localhost`
- **Puerto**: `5432`
- **Database**: `booking_system`
- **Usuario**: `postgres`

### Desde pgAdmin (opcional)

- **URL**: http://localhost:5050
- **Email**: admin@booking.local
- **Password**: admin123

Para conectar a PostgreSQL desde pgAdmin:

- **Host**: `postgres` (nombre del servicio en Docker)
- **Puerto**: `5432`
- **Database**: `booking_system`
- **Usuario**: `postgres`

## Persistencia de datos

Los datos se guardan en:

- **PostgreSQL**: `./postgres-data/`
- **pgAdmin**: `./pgadmin-data/`

Estos folders se crean automáticamente y **NO** deben agregarse al control de versiones.

## Backup y restore

### Crear backup

```bash
docker exec booking-postgres pg_dump -U postgres -d booking_system > backup.sql
```

### Restaurar backup

```bash
docker exec -i booking-postgres psql -U postgres -d booking_system < backup.sql
```

## Limpieza completa

⚠️ **ATENCIÓN**: Esto eliminará TODOS los datos

```bash
# Detener servicios
docker-compose down

# Eliminar volúmenes y datos
docker-compose down -v
rm -rf postgres-data pgadmin-data

# Opcional: eliminar imágenes
docker rmi postgres:15-alpine dpage/pgadmin4:latest
```

## Variables de entorno importantes

| Variable            | Descripción                | Valor por defecto        |
| ------------------- | -------------------------- | ------------------------ |
| `POSTGRES_DB`       | Nombre de la base de datos | `booking_system`         |
| `POSTGRES_USER`     | Usuario de PostgreSQL      | `postgres`               |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL   | `password`               |
| `POSTGRES_PORT`     | Puerto expuesto            | `5432`                   |
| `DATABASE_URL`      | URL completa para Prisma   | Generada automáticamente |

## Troubleshooting

### Puerto ya en uso

```bash
# Cambiar el puerto en .env
POSTGRES_PORT=5433
```

### Problemas de permisos

```bash
# En Linux/Mac, ajustar permisos
sudo chown -R $USER:$USER postgres-data pgadmin-data
```

### Resetear contraseña de PostgreSQL

```bash
# Detener, eliminar contenedor y reiniciar
docker-compose down
docker rm booking-postgres
docker-compose up -d postgres
```
