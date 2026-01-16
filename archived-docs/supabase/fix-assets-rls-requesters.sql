-- RLS: limitar que los "usuarios" (requester) solo vean sus activos asignados
-- Ejecutar en el SQL Editor de Supabase

-- 1) Quitar la política abierta que permite ver todos los activos
DROP POLICY IF EXISTS "Anyone can view active assets" ON assets;

-- 2) Política específica para requesters: solo ven activos donde assigned_to = auth.uid()
CREATE POLICY "Requesters see only own assets"
  ON assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'requester'
    )
    AND assigned_to = auth.uid()
  );

-- 3) Verificación rápida (opcional)
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'assets'
-- ORDER BY policyname;
