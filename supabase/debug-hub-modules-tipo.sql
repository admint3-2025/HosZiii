-- =====================================================
-- DEBUG: Verificar TIPO EXACTO de hub_visible_modules
-- =====================================================

-- 1. Ver el VALOR RAW de hub_visible_modules
SELECT 
  u.email,
  p.hub_visible_modules,
  pg_typeof(p.hub_visible_modules) as tipo_columna,
  -- Extraer it-helpdesk de diferentes formas
  p.hub_visible_modules->>'it-helpdesk' as valor_como_texto,
  (p.hub_visible_modules->>'it-helpdesk')::boolean as valor_como_boolean,
  p.hub_visible_modules->'it-helpdesk' as valor_json_extraido,
  pg_typeof(p.hub_visible_modules->'it-helpdesk') as tipo_valor_extraido
FROM auth.users u
INNER JOIN profiles p ON p.id = u.id
WHERE u.email IN ('sistemas@alzen.com', 'mkt@alzen.com')
ORDER BY u.email;

-- 2. COMPARACIONES EXPLÍCITAS (como hace el middleware)
SELECT 
  u.email,
  p.hub_visible_modules,
  -- Comparación 1: como hace el middleware (TypeScript cast)
  (p.hub_visible_modules->>'it-helpdesk') as extraction_1,
  -- Comparación 2: boolean estricto
  (p.hub_visible_modules->>'it-helpdesk')::boolean as extraction_2,
  -- Comparación 3: JSON boolean (sin cast a text)
  (p.hub_visible_modules->'it-helpdesk')::boolean as extraction_3,
  -- Tests
  CASE WHEN (p.hub_visible_modules->>'it-helpdesk') = 'true' THEN '✅ es string "true"'
       WHEN (p.hub_visible_modules->>'it-helpdesk') IS NULL THEN '❌ es NULL'
       ELSE '❓ otro: ' || (p.hub_visible_modules->>'it-helpdesk')
  END as test_string,
  CASE WHEN (p.hub_visible_modules->'it-helpdesk')::text = 'true' THEN '✅ JSON dice true'
       WHEN (p.hub_visible_modules->'it-helpdesk')::text = 'false' THEN '❌ JSON dice false'
       WHEN (p.hub_visible_modules->'it-helpdesk') IS NULL THEN '❌ JSON es NULL'
       ELSE '❓ JSON otro: ' || (p.hub_visible_modules->'it-helpdesk')::text
  END as test_json
FROM auth.users u
INNER JOIN profiles p ON p.id = u.id
WHERE u.email IN ('sistemas@alzen.com', 'mkt@alzen.com')
ORDER BY u.email;

-- 3. PROBAR EXACTAMENTE COMO EL MIDDLEWARE (simulación TypeScript)
-- El middleware hace: hubModules?.['it-helpdesk'] === true
-- En SQL, eso sería equivalente a verificar si el valor JSON es boolean true
SELECT 
  u.email,
  p.is_it_supervisor,
  p.hub_visible_modules,
  -- Simular: hubModules?.['it-helpdesk'] === true
  CASE 
    WHEN jsonb_typeof(p.hub_visible_modules->'it-helpdesk') = 'boolean' 
      AND (p.hub_visible_modules->'it-helpdesk')::boolean = true
    THEN '✅ Módulo IT correcto (boolean true)'
    WHEN jsonb_typeof(p.hub_visible_modules->'it-helpdesk') = 'string'
      AND p.hub_visible_modules->>'it-helpdesk' = 'true'
    THEN '⚠️ Módulo IT guardado como STRING "true" (PROBLEMA)'
    WHEN p.hub_visible_modules->'it-helpdesk' IS NULL
    THEN '❌ Módulo IT es NULL'
    ELSE '❓ Módulo IT otro tipo: ' || jsonb_typeof(p.hub_visible_modules->'it-helpdesk')
  END as analisis_modulo,
  -- Simular condición completa del middleware
  CASE 
    WHEN p.role = 'corporate_admin'
      AND jsonb_typeof(p.hub_visible_modules->'it-helpdesk') = 'boolean'
      AND (p.hub_visible_modules->'it-helpdesk')::boolean = true
      AND p.is_it_supervisor = true
    THEN '✅ PASA middleware (todos los checks OK)'
    WHEN p.role = 'corporate_admin'
      AND jsonb_typeof(p.hub_visible_modules->'it-helpdesk') = 'string'
      AND p.hub_visible_modules->>'it-helpdesk' = 'true'  
      AND p.is_it_supervisor = true
    THEN '⚠️ PROBLEMA: módulo como string pero debería ser boolean'
    ELSE '❌ BLOQUEADO por alguna condición'
  END as resultado_middleware
FROM auth.users u
INNER JOIN profiles p ON p.id = u.id
WHERE u.email IN ('sistemas@alzen.com', 'mkt@alzen.com')
ORDER BY u.email;

-- 4. ESTRUCTURA COMPLETA DEL JSONB para ambos usuarios
SELECT 
  u.email,
  jsonb_pretty(p.hub_visible_modules) as estructura_completa
FROM auth.users u
INNER JOIN profiles p ON p.id = u.id
WHERE u.email IN ('sistemas@alzen.com', 'mkt@alzen.com')
ORDER BY u.email;
