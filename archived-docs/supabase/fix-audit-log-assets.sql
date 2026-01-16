-- ============================================================================
-- FIX: Permitir registro de auditoría para activos
-- ============================================================================
-- Las políticas RLS actuales de audit_log solo permiten INSERT para tickets
-- y reportes. Necesitamos agregar políticas para activos y usuarios.
-- ============================================================================

BEGIN;

-- 1. Verificar políticas actuales
SELECT 
  'POLITICAS ACTUALES' as info,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'audit_log'
ORDER BY policyname;

-- 2. Agregar política para permitir INSERT de auditoría de activos
DROP POLICY IF EXISTS "audit_log_insert_assets" ON audit_log;
CREATE POLICY "audit_log_insert_assets" ON audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  entity_type = 'asset'
  AND action IN ('CREATE', 'UPDATE', 'DELETE')
  AND actor_id = auth.uid()
);

-- 3. Agregar política para permitir INSERT de auditoría de usuarios
DROP POLICY IF EXISTS "audit_log_insert_users" ON audit_log;
CREATE POLICY "audit_log_insert_users" ON audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  entity_type = 'user'
  AND action IN ('CREATE', 'UPDATE', 'DELETE', 'ASSIGN_ROLE')
  AND (
    -- Solo admins pueden auditar usuarios
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
);

-- 4. Verificar políticas después del cambio
SELECT 
  'POLITICAS NUEVAS' as info,
  policyname,
  cmd,
  CASE 
    WHEN policyname LIKE '%assets%' THEN 'Permite auditar activos'
    WHEN policyname LIKE '%users%' THEN 'Permite auditar usuarios (admin)'
    WHEN policyname LIKE '%ticket%' THEN 'Permite auditar tickets'
    WHEN policyname LIKE '%report%' THEN 'Permite auditar reportes'
    WHEN policyname LIKE '%auditor%' THEN 'Auditores leen todo'
    ELSE 'Otra'
  END as descripcion
FROM pg_policies
WHERE tablename = 'audit_log'
ORDER BY policyname;

COMMIT;

-- ============================================================================
-- RESULTADO
-- ============================================================================
-- Ahora los usuarios autenticados podrán:
-- 1. Registrar auditoría cuando crean/editan/eliminan activos
-- 2. Los admins podrán registrar auditoría de creación/edición de usuarios
-- 3. Los auditores podrán VER todos los registros de auditoría
-- ============================================================================
