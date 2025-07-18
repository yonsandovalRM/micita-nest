-- Script de inicialización para la base de datos
-- Este archivo se ejecutará automáticamente cuando se cree el contenedor por primera vez

-- Crear extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Configurar timezone por defecto
SET timezone = 'America/Santiago';

-- Crear índices adicionales si es necesario (se pueden agregar después de que Prisma cree las tablas)
-- Nota: Prisma ya maneja la mayoría de los índices automáticamente