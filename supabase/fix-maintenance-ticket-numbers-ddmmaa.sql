-- Normalización de códigos de tickets de MANTENIMIENTO
-- Objetivo: que TODOS los tickets queden con el formato EXACTO:
--   MANT-DDMMAA-XXXX
-- donde:
--   - DDMMYY se calcula desde created_at en zona America/Mexico_City
--   - XXXX es una secuencia por día (1..N) según created_at asc, id asc
--
-- IMPORTANTE:
-- - Este script REASIGNA códigos (puede cambiar códigos existentes), para dejar el historial consistente.
-- - Si ya estás usando ticket_number como “folio” externo, confirma antes de correrlo.
--
-- Recomendación: ejecutar primero la sección PREVIEW.

-- =====================
-- PREVIEW (solo lectura)
-- =====================

-- 1) Ver tickets que NO cumplen el formato estricto
SELECT
  id,
  ticket_number,
  created_at,
  updated_at
FROM tickets_maintenance
WHERE ticket_number IS NULL
   OR ticket_number !~ '^MANT-\d{6}-\d{4}$'
ORDER BY created_at DESC NULLS LAST;

-- 2) Vista previa de la reasignación propuesta (últimos 100)
WITH base AS (
  SELECT
    id,
    COALESCE(created_at, updated_at, now()) AS effective_created_at
  FROM tickets_maintenance
),
numbered AS (
  SELECT
    id,
    effective_created_at,
    to_char(effective_created_at AT TIME ZONE 'America/Mexico_City', 'DDMMYY') AS ddmmyy,
    row_number() OVER (
      PARTITION BY to_char(effective_created_at AT TIME ZONE 'America/Mexico_City', 'DDMMYY')
      ORDER BY effective_created_at ASC, id ASC
    ) AS seq
  FROM base
),
mapped AS (
  SELECT
    id,
    'MANT-' || ddmmyy || '-' || lpad(seq::text, 4, '0') AS new_ticket_number
  FROM numbered
)
SELECT
  t.id,
  t.ticket_number AS old_ticket_number,
  m.new_ticket_number,
  t.created_at
FROM tickets_maintenance t
JOIN mapped m ON m.id = t.id
ORDER BY t.created_at DESC NULLS LAST
LIMIT 100;

-- =====================
-- APLICAR (escritura)
-- =====================

BEGIN;

-- 3) Construir un mapa determinista id -> nuevo código
CREATE TEMP TABLE _maintenance_ticket_number_map AS
WITH base AS (
  SELECT
    id,
    COALESCE(created_at, updated_at, now()) AS effective_created_at
  FROM tickets_maintenance
),
numbered AS (
  SELECT
    id,
    to_char(effective_created_at AT TIME ZONE 'America/Mexico_City', 'DDMMYY') AS ddmmyy,
    row_number() OVER (
      PARTITION BY to_char(effective_created_at AT TIME ZONE 'America/Mexico_City', 'DDMMYY')
      ORDER BY effective_created_at ASC, id ASC
    ) AS seq
  FROM base
)
SELECT
  id,
  'MANT-' || ddmmyy || '-' || lpad(seq::text, 4, '0') AS new_ticket_number
FROM numbered;

-- 4) Guardrail: el mapa NO debe generar duplicados
-- (si esto retorna filas, NO continúes y revisa)
SELECT new_ticket_number, COUNT(*) AS cnt
FROM _maintenance_ticket_number_map
GROUP BY new_ticket_number
HAVING COUNT(*) > 1;

-- 5) Aplicar update
UPDATE tickets_maintenance t
SET ticket_number = m.new_ticket_number
FROM _maintenance_ticket_number_map m
WHERE t.id = m.id
  AND t.ticket_number IS DISTINCT FROM m.new_ticket_number;

-- 6) (Opcional) Alinear notifications.ticket_number para notificaciones de mantenimiento
-- Nota: notifications.ticket_number es bigint; aquí guardamos SOLO la secuencia (XXXX) como número.
UPDATE notifications n
SET ticket_number = RIGHT(t.ticket_number, 4)::bigint
FROM tickets_maintenance t
WHERE n.ticket_source = 'tickets_maintenance'
  AND n.ticket_id = t.id
  AND n.ticket_number IS DISTINCT FROM RIGHT(t.ticket_number, 4)::bigint;

-- 7) Verificación final
SELECT
  COUNT(*) FILTER (WHERE ticket_number IS NULL) AS null_count,
  COUNT(*) FILTER (WHERE ticket_number !~ '^MANT-\d{6}-\d{4}$') AS invalid_format_count,
  COUNT(*) AS total
FROM tickets_maintenance;

COMMIT;

-- Si necesitas revertir antes del COMMIT, usa ROLLBACK; en vez de COMMIT.
