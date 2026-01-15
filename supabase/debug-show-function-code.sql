-- ============================================================================
-- DIAGNÓSTICO: Ver el código REAL de las funciones en la base de datos
-- ============================================================================

-- Ver el código actual de set_asset_location
SELECT 
  'set_asset_location()' as function_name,
  pg_get_functiondef(oid) as current_code
FROM pg_proc
WHERE proname = 'set_asset_location';

-- Ver el código actual de track_asset_changes
SELECT 
  'track_asset_changes()' as function_name,
  pg_get_functiondef(oid) as current_code
FROM pg_proc
WHERE proname = 'track_asset_changes';

-- Ver el código actual de log_asset_assignment_change
SELECT 
  'log_asset_assignment_change()' as function_name,
  pg_get_functiondef(oid) as current_code
FROM pg_proc
WHERE proname = 'log_asset_assignment_change';

-- Ver el código actual de validate_asset_location_change
SELECT 
  'validate_asset_location_change()' as function_name,
  pg_get_functiondef(oid) as current_code
FROM pg_proc
WHERE proname = 'validate_asset_location_change';
