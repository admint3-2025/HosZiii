-- =====================================================
-- FIX: Sincronizar RLS de tickets_maintenance con hub_visible_modules
-- =====================================================
-- Problema: La política RLS solo verifica asset_category = 'MAINTENANCE'
--           pero ignora hub_visible_modules que se configura en la UI
-- Solución: Permitir acceso si hub_visible_modules->>'mantenimiento' = 'true'
-- =====================================================

-- Paso 1: Verificar política actual
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'tickets_maintenance'
ORDER BY policyname;

-- Paso 2: Eliminar políticas SELECT existentes
DROP POLICY IF EXISTS "tickets_maintenance_select_basic" ON public.tickets_maintenance;
DROP POLICY IF EXISTS "tickets_maintenance_select_policy" ON public.tickets_maintenance;
DROP POLICY IF EXISTS "tickets_maintenance_select" ON public.tickets_maintenance;

-- Paso 3: Crear nueva política SELECT que considera hub_visible_modules
CREATE POLICY "tickets_maintenance_select_with_hub_modules"
ON public.tickets_maintenance
FOR SELECT
TO authenticated
USING (
  -- 1. Admin ve todo
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR
  -- 2. Usuario es el solicitante del ticket
  tickets_maintenance.requester_id = auth.uid()
  OR
  -- 3. Usuario asignado al ticket
  tickets_maintenance.assigned_to = auth.uid()
  OR
  -- 4. Usuario tiene permiso de mantenimiento (asset_category O hub_visible_modules)
  --    y el ticket está en una ubicación accesible
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supervisor', 'agent_l1', 'agent_l2', 'corporate_admin')
    AND (
      -- Tiene asset_category = MAINTENANCE (método legacy)
      p.asset_category = 'MAINTENANCE'
      OR
      -- Tiene módulo mantenimiento visible en Hub (método nuevo)
      (p.hub_visible_modules->>'mantenimiento')::boolean = true
    )
    AND (
      -- Ticket está en ubicación del perfil
      tickets_maintenance.location_id = p.location_id
      OR
      -- Ticket está en ubicación asignada via user_locations
      tickets_maintenance.location_id IN (
        SELECT ul.location_id 
        FROM public.user_locations ul
        WHERE ul.user_id = auth.uid()
      )
      OR
      -- Corporate admin sin ubicación específica ve todo de mantenimiento
      (p.role = 'corporate_admin' AND p.location_id IS NULL)
    )
  )
);

-- Paso 4: Verificar que la política se creó correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  SUBSTRING(qual::text FROM 1 FOR 100) as policy_condition_preview
FROM pg_policies
WHERE tablename = 'tickets_maintenance'
  AND policyname = 'tickets_maintenance_select_with_hub_modules';

-- Paso 5: Probar acceso de Edith De la Torre
-- (Ejecutar como admin, luego probar desde la UI con usuario Edith)
SELECT 
  p.full_name,
  p.role,
  p.asset_category,
  (p.hub_visible_modules->>'mantenimiento')::boolean as tiene_mantenimiento_hub,
  p.location_id,
  l.code as location_code,
  (
    SELECT COUNT(*) 
    FROM tickets_maintenance tm
    WHERE tm.location_id = p.location_id
      AND tm.deleted_at IS NULL
  ) as tickets_en_su_sede
FROM profiles p
LEFT JOIN locations l ON l.id = p.location_id
WHERE p.id IN (SELECT id FROM auth.users WHERE email = 'edelatorre298@gmail.com');

-- Paso 6: Ver cuántos usuarios tienen mantenimiento en hub_visible_modules
SELECT 
  p.asset_category,
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN (p.hub_visible_modules->>'mantenimiento')::boolean = true THEN 1 END) as con_hub_mantenimiento
FROM profiles p
GROUP BY p.asset_category
ORDER BY p.asset_category;
