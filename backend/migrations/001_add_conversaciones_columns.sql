-- Migración 001: Agregar columnas faltantes a conversaciones
-- Ejecutar en Supabase SQL Editor

ALTER TABLE conversaciones
  ADD COLUMN IF NOT EXISTS nivel_confianza VARCHAR(20),
  ADD COLUMN IF NOT EXISTS tipo_consulta   VARCHAR(50);
