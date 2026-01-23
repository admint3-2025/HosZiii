-- ============================================
-- VERIFICACIÓN DETALLADA DE DUPLICADOS
-- ============================================

-- 1. Ver cuántos triggers hay activos
SELECT 
  '=== TRIGGERS ACTUALES ===' as tipo,
  event_object_table as tabla,
  trigger_name,
  event_manipulation as evento
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('assets', 'assets_it', 'assets_maintenance')
ORDER BY event_object_table, trigger_name;

-- 2. Ver duplicados exactos (mismo campo, mismo valor, mismo activo)
SELECT 
  '=== DUPLICADOS UPDATE ===' as tipo,
  asset_tag,
  field_name,
  old_value,
  new_value,
  COUNT(*) as veces,
  string_agg(id::text, ', ') as ids
FROM public.asset_changes
WHERE change_type = 'UPDATE'
GROUP BY asset_tag, field_name, old_value, new_value
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 20;

-- 3. Ver duplicados de CREATE
SELECT 
  '=== DUPLICADOS CREATE ===' as tipo,
  asset_id,
  asset_tag,
  COUNT(*) as veces,
  string_agg(id::text, ', ') as ids
FROM public.asset_changes
WHERE change_type = 'CREATE'
GROUP BY asset_id, asset_tag
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 4. Contar totales
SELECT 
  '=== TOTALES ===' as tipo,
  'Total registros' as descripcion,
  COUNT(*) as cantidad
FROM public.asset_changes
UNION ALL
SELECT 
  '=== TOTALES ===' as tipo,
  'Triggers activos' as descripcion,
  COUNT(*) as cantidad
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('assets', 'assets_it', 'assets_maintenance');

-- 5. Ver los últimos 10 cambios para detectar patrón
SELECT 
  '=== ÚLTIMOS CAMBIOS ===' as tipo,
  asset_tag,
  field_name,
  old_value,
  new_value,
  changed_by_name,
  change_type
FROM public.asset_changes
ORDER BY id DESC
LIMIT 10;
