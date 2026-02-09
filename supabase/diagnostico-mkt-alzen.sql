-- =====================================================
-- DIAGNÓSTICO USUARIO: mkt@alzen.com
-- =====================================================
-- Fecha: 2026-02-08
-- Propósito: Verificar por qué este corporate_admin ve Helpdesk IT
-- =====================================================

-- 1. PERFIL COMPLETO DEL USUARIO
SELECT 
  p.id,
  u.email,
  p.full_name,
  p.role,
  p.asset_category,
  p.department,
  p.position,
  p.location_id,
  l.code as sede_principal,
  l.name as nombre_sede,
  p.is_it_supervisor,
  p.is_maintenance_supervisor,
  p.hub_visible_modules,
  (p.hub_visible_modules->>'it-helpdesk')::boolean as tiene_permiso_it,
  (p.hub_visible_modules->>'mantenimiento')::boolean as tiene_permiso_mant,
  (p.hub_visible_modules->>'inspecciones-rrhh')::boolean as tiene_permiso_rrhh,
  p.can_view_beo,
  p.created_at,
  u.created_at as usuario_creado,
  u.updated_at as usuario_actualizado
FROM profiles p
INNER JOIN auth.users u ON u.id = p.id
LEFT JOIN locations l ON l.id = p.location_id
WHERE u.email = 'mkt@alzen.com';

-- 2. SEDES ADICIONALES (user_locations)
SELECT 
  ul.location_id,
  l.code as sede_codigo,
  l.name as sede_nombre,
  l.is_active as sede_activa
FROM user_locations ul
INNER JOIN locations l ON l.id = ul.location_id
WHERE ul.user_id = (SELECT id FROM auth.users WHERE email = 'mkt@alzen.com')
ORDER BY l.code;

-- 3. TICKETS IT QUE PUEDE VER (según RLS actual)
SELECT 
  COUNT(*) as total_tickets_it,
  COUNT(CASE WHEN ti.deleted_at IS NULL THEN 1 END) as tickets_activos,
  COUNT(CASE WHEN ti.deleted_at IS NOT NULL THEN 1 END) as tickets_eliminados
FROM tickets_it ti
WHERE EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = (SELECT id FROM auth.users WHERE email = 'mkt@alzen.com')
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

-- 4. TICKETS MANTENIMIENTO QUE PUEDE VER
SELECT 
  COUNT(*) as total_tickets_mant,
  COUNT(CASE WHEN tm.deleted_at IS NULL THEN 1 END) as tickets_activos,
  COUNT(CASE WHEN tm.deleted_at IS NOT NULL THEN 1 END) as tickets_eliminados
FROM tickets_maintenance tm
WHERE EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = (SELECT id FROM auth.users WHERE email = 'mkt@alzen.com')
  AND (
    p.role = 'admin'
    OR tm.requester_id = p.id
    OR tm.assigned_to = p.id
    OR (
      p.role IN ('supervisor', 'agent_l1', 'agent_l2')
      AND p.asset_category = 'MAINTENANCE'
      AND (
        tm.location_id = p.location_id
        OR tm.location_id IN (
          SELECT location_id FROM user_locations WHERE user_id = p.id
        )
      )
    )
    OR (
      p.role = 'corporate_admin'
      AND (p.hub_visible_modules->>'mantenimiento')::boolean = true
      AND p.is_maintenance_supervisor = true
      AND (
        tm.location_id = p.location_id
        OR tm.location_id IN (
          SELECT location_id FROM user_locations WHERE user_id = p.id
        )
      )
    )
  )
);

-- 5. ACTIVOS IT QUE PUEDE VER
SELECT 
  COUNT(*) as total_activos_it
FROM assets_it ai
WHERE EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = (SELECT id FROM auth.users WHERE email = 'mkt@alzen.com')
  AND (
    p.role = 'admin'
    OR (
      p.role IN ('supervisor', 'agent_l1', 'agent_l2')
      AND p.asset_category = 'IT'
      AND (
        ai.location_id = p.location_id
        OR ai.location_id IN (
          SELECT location_id FROM user_locations WHERE user_id = p.id
        )
      )
    )
    OR (
      p.role = 'corporate_admin'
      AND (p.hub_visible_modules->>'it-helpdesk')::boolean = true
      AND p.is_it_supervisor = true
      AND (
        ai.location_id = p.location_id
        OR ai.location_id IN (
          SELECT location_id FROM user_locations WHERE user_id = p.id
        )
      )
    )
  )
);

-- 6. RESUMEN: ¿Cumple los requisitos para ver Helpdesk IT?
SELECT 
  u.email,
  p.role,
  CASE 
    WHEN p.role = 'admin' THEN 'SÍ (es admin)'
    WHEN p.role = 'corporate_admin' 
      AND (p.hub_visible_modules->>'it-helpdesk')::boolean = true 
      AND p.is_it_supervisor = true 
    THEN 'SÍ (corporate_admin + módulo IT + supervisor IT)'
    WHEN p.role = 'corporate_admin' 
      AND (p.hub_visible_modules->>'it-helpdesk')::boolean = true 
      AND p.is_it_supervisor IS NOT TRUE 
    THEN 'NO - tiene módulo pero NO es supervisor IT'
    WHEN p.role IN ('supervisor', 'agent_l1', 'agent_l2') 
      AND p.asset_category = 'IT' 
    THEN 'SÍ (staff IT operativo)'
    ELSE 'NO - sin permisos IT'
  END as puede_gestionar_helpdesk_it,
  (p.hub_visible_modules->>'it-helpdesk')::boolean as modulo_it,
  p.is_it_supervisor as flag_supervisor_it,
  p.asset_category
FROM auth.users u
INNER JOIN profiles p ON p.id = u.id
WHERE u.email = 'mkt@alzen.com';

-- =====================================================
-- CORRECCIÓN (ejecutar solo si es necesario)
-- =====================================================

/*
-- Si el usuario NO debe tener acceso a IT Helpdesk, ejecutar:

UPDATE profiles
SET 
  hub_visible_modules = jsonb_set(
    COALESCE(hub_visible_modules, '{}'::jsonb),
    '{it-helpdesk}',
    'false'
  ),
  is_it_supervisor = false
WHERE id = (SELECT id FROM auth.users WHERE email = 'mkt@alzen.com');

-- Si el usuario SÍ debe ver el módulo pero NO gestionar (Bandeja/Dashboard/Activos):

UPDATE profiles
SET 
  is_it_supervisor = false
WHERE id = (SELECT id FROM auth.users WHERE email = 'mkt@alzen.com');

-- Si el usuario SÍ debe gestionar IT completamente:

UPDATE profiles
SET 
  hub_visible_modules = jsonb_set(
    COALESCE(hub_visible_modules, '{}'::jsonb),
    '{it-helpdesk}',
    'true'
  ),
  is_it_supervisor = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'mkt@alzen.com');
*/
