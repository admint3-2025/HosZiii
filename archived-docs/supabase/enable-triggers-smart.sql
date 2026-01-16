-- ============================================================================
-- RE-HABILITAR TRIGGERS DE FORMA INTELIGENTE
-- ============================================================================

-- PASO 1: Habilitar triggers que SOLO afectan UPDATE (seguros para INSERT)
-- Estos NO pueden causar el error en creación de activos

ALTER TABLE assets ENABLE TRIGGER trg_assets_set_updated_at;
-- ✓ BEFORE UPDATE - solo actualiza updated_at en modificaciones

ALTER TABLE assets ENABLE TRIGGER trg_log_asset_assignment_change;
-- ✓ BEFORE UPDATE OF assigned_to - solo se ejecuta al cambiar responsable

ALTER TABLE assets ENABLE TRIGGER trg_validate_asset_location_change;
-- ✓ BEFORE UPDATE OF location_id - solo valida cambios de sede (ya tiene IF TG_OP = 'INSERT')

SELECT '✓ Triggers de UPDATE habilitados (seguros)' as status;

-- ============================================================================
-- PASO 2: Habilitar triggers CRÍTICOS de INSERT (necesarios para funcionamiento)
-- ============================================================================

ALTER TABLE assets ENABLE TRIGGER trg_assign_asset_code;
-- ✓ BEFORE INSERT - genera código único del activo (CRÍTICO)

ALTER TABLE assets ENABLE TRIGGER trg_assets_set_location;
-- ✓ BEFORE INSERT - asigna sede automática (CRÍTICO - ya corregido a MAYÚSCULAS)

SELECT '✓ Triggers de INSERT críticos habilitados' as status;

-- ============================================================================
-- PASO 3: Habilitar trigger de AUDITORÍA (registro de cambios)
-- ============================================================================

ALTER TABLE assets ENABLE TRIGGER asset_changes_trigger;
-- ✓ AFTER INSERT OR UPDATE - track_asset_changes (auditoría)

SELECT '✓ Trigger de auditoría habilitado' as status;

-- ============================================================================
-- VERIFICAR ESTADO FINAL
-- ============================================================================

SELECT 
  tgname as trigger_name,
  tgenabled as status,
  CASE tgenabled
    WHEN 'O' THEN '✓ ENABLED'
    WHEN 'D' THEN '✗ DISABLED'
    ELSE tgenabled::text
  END as estado
FROM pg_trigger
WHERE tgrelid = 'assets'::regclass
  AND tgisinternal = false
ORDER BY tgname;

SELECT '
============================================================================
TODOS LOS TRIGGERS HABILITADOS - Prueba crear un activo ahora
============================================================================
' as final_status;
