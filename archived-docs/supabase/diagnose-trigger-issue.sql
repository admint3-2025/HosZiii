-- ============================================================================
-- DIAGNÓSTICO: Desactivar triggers uno por uno para identificar el problema
-- ============================================================================

-- Paso 1: Listar todos los triggers activos en assets
SELECT 
  tgname as trigger_name,
  proname as function_name,
  pg_get_functiondef(pg_proc.oid) as function_definition
FROM pg_trigger
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE pg_class.relname = 'assets'
  AND NOT tgisinternal
ORDER BY tgname;

-- ============================================================================
-- Si ves el listado arriba, ahora vamos a DESHABILITAR triggers temporalmente
-- ============================================================================

-- Deshabilitar TODOS los triggers de assets temporalmente
ALTER TABLE assets DISABLE TRIGGER ALL;

-- Ahora intenta crear un activo desde la UI
-- Si funciona, el problema es uno de los triggers

-- Para re-habilitar todos los triggers:
-- ALTER TABLE assets ENABLE TRIGGER ALL;

-- ============================================================================
-- Si funcionó sin triggers, vamos habilitando uno por uno:
-- ============================================================================

-- 1. Habilitar solo el trigger de updated_at
ALTER TABLE assets ENABLE TRIGGER trg_assets_set_updated_at;
-- Probar crear activo. ¿Funciona? Continuar.

-- 2. Habilitar el trigger de location
ALTER TABLE assets ENABLE TRIGGER trg_assets_set_location;
-- Probar crear activo. ¿Funciona? Continuar.

-- 3. Habilitar el trigger de asset_code
ALTER TABLE assets ENABLE TRIGGER trg_assign_asset_code;
-- Probar crear activo. ¿Funciona? Continuar.

-- 4. Habilitar el trigger de cambios/historial
ALTER TABLE assets ENABLE TRIGGER asset_changes_trigger;
-- Probar crear activo. Si falla aquí, este es el problema.

-- ============================================================================
-- Si encontraste el trigger problemático, avísame cuál es
-- ============================================================================
