-- =====================================================
-- DIAGNÓSTICO USUARIO: sistemas@alzen.com
-- =====================================================
-- Fecha: 2026-02-08
-- Problema: Corporate admin con supervisor IT NO puede ver dashboard
-- =====================================================

-- 1. PERFIL COMPLETO
SELECT 
  p.id,
  u.email,
  p.full_name,
  p.role,
  p.asset_category,
  p.department,
  p.is_it_supervisor,
  p.is_maintenance_supervisor,
  p.hub_visible_modules,
  (p.hub_visible_modules->>'it-helpdesk')::boolean as modulo_it,
  p.location_id,
  l.code as sede,
  CASE 
    WHEN p.role = 'admin' THEN '✅ Admin global'
    WHEN p.role = 'corporate_admin' 
      AND (p.hub_visible_modules->>'it-helpdesk')::boolean = true 
      AND p.is_it_supervisor = true 
    THEN '✅ Puede gestionar IT (módulo + supervisor)'
    WHEN p.role = 'corporate_admin' 
      AND (p.hub_visible_modules->>'it-helpdesk')::boolean = true 
      AND p.is_it_supervisor IS NOT TRUE 
    THEN '❌ Tiene módulo pero NO es supervisor'
    WHEN p.role = 'corporate_admin' 
      AND COALESCE((p.hub_visible_modules->>'it-helpdesk')::boolean, false) = false
    THEN '❌ NO tiene módulo IT'
    ELSE '❌ Otro caso'
  END as diagnostico
FROM profiles p
INNER JOIN auth.users u ON u.id = p.id
LEFT JOIN locations l ON l.id = p.location_id
WHERE u.email = 'sistemas@alzen.com';

-- 2. SEDES ADICIONALES
SELECT 
  COUNT(*) as total_sedes,
  string_agg(l.code, ', ') as codigos_sedes
FROM user_locations ul
INNER JOIN locations l ON l.id = ul.location_id
WHERE ul.user_id = (SELECT id FROM auth.users WHERE email = 'sistemas@alzen.com');

-- 3. ¿QUÉ DEBERÍA PASAR EN MIDDLEWARE?
-- Simular la lógica del middleware para /dashboard
SELECT 
  u.email,
  p.role,
  p.asset_category,
  (p.hub_visible_modules->>'it-helpdesk')::boolean as tiene_modulo_it,
  p.is_it_supervisor,
  CASE 
    WHEN p.role = 'admin' THEN '✅ Pasa (admin)'
    WHEN p.role IN ('supervisor', 'agent_l1', 'agent_l2') 
      AND (p.asset_category = 'IT' OR p.asset_category IS NULL)
    THEN '✅ Pasa (staff IT operativo)'
    WHEN p.role = 'corporate_admin' 
      AND (p.hub_visible_modules->>'it-helpdesk')::boolean = true
      AND p.is_it_supervisor = true
    THEN '✅ Pasa (corporate_admin + módulo + supervisor)'
    ELSE '❌ BLOQUEADO por middleware'
  END as resultado_middleware
FROM auth.users u
INNER JOIN profiles p ON p.id = u.id
WHERE u.email = 'sistemas@alzen.com';

-- 4. TICKETS IT QUE PUEDE VER (prueba RLS)
SELECT 
  COUNT(*) as total_tickets_it_visibles
FROM tickets_it ti
WHERE EXISTS (
  SELECT 1 FROM auth.users u
  INNER JOIN profiles p ON p.id = u.id
  WHERE u.email = 'sistemas@alzen.com'
  AND (
    p.role = 'admin'
    OR ti.requester_id = p.id
    OR ti.assigned_agent_id = p.id
    OR (
      p.role IN ('supervisor', 'agent_l1', 'agent_l2')
      AND p.asset_category = 'IT'
      AND (
        ti.location_id = p.location_id
        OR ti.location_id IN (
          SELECT location_id FROM user_locations WHERE user_id = p.id
        )
      )
    )
    OR (
      p.role = 'corporate_admin'
      AND (p.hub_visible_modules->>'it-helpdesk')::boolean = true
      AND p.is_it_supervisor = true
      AND (
        ti.location_id = p.location_id
        OR ti.location_id IN (
          SELECT location_id FROM user_locations WHERE user_id = p.id
        )
      )
    )
  )
);

-- =====================================================
-- CORRECCIÓN INMEDIATA (ejecutar si el flag está mal)
-- =====================================================

/*
-- Si is_it_supervisor NO está en true pero DEBERÍA estarlo:
UPDATE profiles
SET is_it_supervisor = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'sistemas@alzen.com');

-- Si el módulo NO está habilitado pero DEBERÍA estarlo:
UPDATE profiles
SET 
  hub_visible_modules = jsonb_set(
    COALESCE(hub_visible_modules, '{}'::jsonb),
    '{it-helpdesk}',
    'true'
  ),
  is_it_supervisor = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'sistemas@alzen.com');
*/
