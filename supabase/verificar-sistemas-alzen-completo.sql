-- =====================================================
-- VERIFICACIÓN COMPLETA: sistemas@alzen.com
-- =====================================================
-- ¿Por qué sigue bloqueado después del UPDATE?
-- =====================================================

-- 1. VERIFICAR QUE EL UPDATE SE APLICÓ
SELECT 
  u.email,
  p.id,
  p.full_name,
  p.role,
  p.asset_category,
  p.department,
  p.is_it_supervisor,
  p.is_maintenance_supervisor,
  p.hub_visible_modules,
  (p.hub_visible_modules->>'it-helpdesk')::boolean as modulo_it_parsed,
  p.location_id,
  l.code as sede_principal
FROM auth.users u
INNER JOIN profiles p ON p.id = u.id
LEFT JOIN locations l ON l.id = p.location_id
WHERE u.email = 'sistemas@alzen.com';

-- 2. SEDES ASIGNADAS (completo)
SELECT 
  l.id,
  l.code,
  l.name,
  ul.created_at
FROM user_locations ul
INNER JOIN locations l ON l.id = ul.location_id
WHERE ul.user_id = (SELECT id FROM auth.users WHERE email = 'sistemas@alzen.com')
ORDER BY l.code;

-- 3. SIMULAR EXACTAMENTE LA LÓGICA DEL MIDDLEWARE
-- Líneas 315-316 de middleware.ts
WITH user_data AS (
  SELECT 
    u.email,
    p.id,
    p.role,
    p.asset_category,
    p.hub_visible_modules,
    p.is_it_supervisor,
    p.is_maintenance_supervisor
  FROM auth.users u
  INNER JOIN profiles p ON p.id = u.id
  WHERE u.email = 'sistemas@alzen.com'
)
SELECT 
  email,
  role,
  asset_category,
  -- Evaluación paso a paso
  CASE WHEN role = 'admin' THEN true ELSE false END as es_admin,
  CASE WHEN role = 'corporate_admin' THEN true ELSE false END as es_corporate_admin,
  CASE WHEN (hub_visible_modules->>'it-helpdesk')::boolean = true THEN true ELSE false END as tiene_modulo_it,
  is_it_supervisor as tiene_flag_supervisor,
  -- Evaluación combinada (EXACTA del middleware)
  CASE 
    WHEN role = 'admin' THEN '✅ PASA (admin global)'
    WHEN role IN ('supervisor', 'agent_l1', 'agent_l2') 
      AND (asset_category = 'IT' OR asset_category IS NULL)
    THEN '✅ PASA (staff IT operativo)'
    WHEN role = 'corporate_admin' 
      AND (hub_visible_modules->>'it-helpdesk')::boolean = true
      AND is_it_supervisor = true
    THEN '✅ PASA (corporate_admin + módulo + supervisor)'
    ELSE '❌ BLOQUEADO'
  END as resultado_middleware,
  -- Desglose de la condición problemática
  CASE 
    WHEN role = 'corporate_admin' 
      AND NOT ((hub_visible_modules->>'it-helpdesk')::boolean = true AND is_it_supervisor = true)
    THEN '❌ Falló: ' || 
      CASE 
        WHEN (hub_visible_modules->>'it-helpdesk')::boolean IS NULL THEN 'módulo IT es NULL'
        WHEN (hub_visible_modules->>'it-helpdesk')::boolean = false THEN 'módulo IT es false'
        WHEN is_it_supervisor IS NULL THEN 'is_it_supervisor es NULL'
        WHEN is_it_supervisor = false THEN 'is_it_supervisor es false'
        ELSE 'otra razón'
      END
    ELSE 'N/A'
  END as detalle_fallo
FROM user_data;

-- 4. VERIFICAR TIPO DE DATOS DE LAS COLUMNAS
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('is_it_supervisor', 'is_maintenance_supervisor', 'hub_visible_modules')
ORDER BY column_name;

-- 5. PROBAR RLS - ¿Puede ver tickets?
SELECT 
  COUNT(*) as total_tickets_it
FROM tickets_it ti
WHERE ti.deleted_at IS NULL;

-- 6. VERIFICAR SI HAY OTROS CORPORATE_ADMIN CON SUPERVISOR QUE SÍ FUNCIONEN
SELECT 
  u.email,
  p.role,
  p.is_it_supervisor,
  (p.hub_visible_modules->>'it-helpdesk')::boolean as modulo_it,
  CASE 
    WHEN p.role = 'corporate_admin' 
      AND (p.hub_visible_modules->>'it-helpdesk')::boolean = true
      AND p.is_it_supervisor = true
    THEN '✅ Debería pasar'
    ELSE '❌ Bloqueado'
  END as estado
FROM auth.users u
INNER JOIN profiles p ON p.id = u.id
WHERE p.role = 'corporate_admin'
  AND (p.hub_visible_modules->>'it-helpdesk')::boolean = true
ORDER BY p.is_it_supervisor DESC, u.email;

-- 7. VERIFICAR SI HAY ALGÚN TRIGGER O CONSTRAINT QUE ESTÉ REVIRTIENDO EL UPDATE
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
  AND trigger_name ILIKE '%supervisor%'
ORDER BY trigger_name;
