-- ============================================
-- ZIII Helpdesk - Deploy Completo a Supabase
-- ============================================
-- Ejecutar en Supabase SQL Editor
-- Orden de ejecución: Este archivo aplica todo en orden correcto

-- PASO 1: Schema principal (tablas, tipos, funciones)
\i schema.sql

-- PASO 2: Migraciones adicionales
\i migration-add-user-fields.sql
\i migration-add-attachments.sql
\i migration-add-resolution.sql

-- PASO 3: Políticas de seguridad RLS
\i policies.sql

-- PASO 4: Fix duplicados (por si hay data previa)
\i fix-duplicates.sql

-- PASO 5: Seed data inicial (usuario admin)
\i seed.sql

-- NOTA: El storage debe configurarse manualmente en el dashboard
-- Ver storage-setup.sql para instrucciones
