-- =====================================================
-- Migracion: Reemplazar corporate_admin por is_corporate
-- Fecha: 2026-02-15
-- Objetivo: usar supervisor + flag is_corporate
-- =====================================================

-- 1) Agregar flag corporativo en profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_corporate boolean NOT NULL DEFAULT false;

-- 2) Migrar usuarios corporate_admin a supervisor corporativo
UPDATE public.profiles
SET is_corporate = true,
    role = 'supervisor'
WHERE role = 'corporate_admin';

-- 3) Actualizar RPC get_admin_emails para incluir corporativo
DROP FUNCTION IF EXISTS public.get_admin_emails();

CREATE FUNCTION public.get_admin_emails()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  role text,
  is_corporate boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  return query
  select 
    p.id,
    coalesce(p.full_name, u.email) as full_name,
    u.email::text,
    p.role::text,
    coalesce(p.is_corporate, false) as is_corporate
  from profiles p
  inner join auth.users u on u.id = p.id
  where (p.role = 'admin' or p.is_corporate = true)
    and u.email is not null
    and u.email != '';
end;
$$;

-- 4) RLS - Tickets (IT)
DROP POLICY IF EXISTS "tickets_select_with_hub_modules" ON public.tickets;

CREATE POLICY "tickets_select_with_hub_modules"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  OR tickets.requester_id = auth.uid()
  OR tickets.assigned_agent_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.hub_visible_modules->>'it-helpdesk')::text IN ('user', 'supervisor')
      AND (
        p.is_corporate = true
        OR (
          p.role IN ('supervisor', 'agent_l1', 'agent_l2')
          AND (
            tickets.location_id = p.location_id
            OR tickets.location_id IN (
              SELECT location_id FROM public.user_locations WHERE user_id = auth.uid()
            )
          )
        )
      )
  )
);

-- 5) RLS - Tickets Mantenimiento
DROP POLICY IF EXISTS "tickets_maintenance_select_hub" ON public.tickets_maintenance;

CREATE POLICY "tickets_maintenance_select_hub"
ON public.tickets_maintenance
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  OR tickets_maintenance.requester_id = auth.uid()
  OR tickets_maintenance.assigned_agent_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.hub_visible_modules->>'mantenimiento')::text IN ('user', 'supervisor')
      AND (
        p.is_corporate = true
        OR (
          p.role IN ('supervisor', 'agent_l1', 'agent_l2')
          AND (
            tickets_maintenance.location_id = p.location_id
            OR tickets_maintenance.location_id IN (
              SELECT location_id FROM public.user_locations WHERE user_id = auth.uid()
            )
          )
        )
      )
  )
);

-- 6) RLS - Inspecciones GSH (corporativo)
DROP POLICY IF EXISTS "Usuarios pueden ver inspecciones de sus ubicaciones" ON public.inspections_gsh;
CREATE POLICY "Usuarios pueden ver inspecciones de sus ubicaciones"
  ON public.inspections_gsh FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM public.user_locations WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR is_corporate = true)
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden crear inspecciones" ON public.inspections_gsh;
CREATE POLICY "Usuarios pueden crear inspecciones"
  ON public.inspections_gsh FOR INSERT
  TO authenticated
  WITH CHECK (
    location_id IN (
      SELECT location_id FROM public.user_locations WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR is_corporate = true)
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden actualizar sus inspecciones" ON public.inspections_gsh;
CREATE POLICY "Usuarios pueden actualizar sus inspecciones"
  ON public.inspections_gsh FOR UPDATE
  TO authenticated
  USING (
    inspector_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'supervisor')
    )
  );

DROP POLICY IF EXISTS "Solo admins pueden eliminar inspecciones" ON public.inspections_gsh;
CREATE POLICY "Solo admins pueden eliminar inspecciones"
  ON public.inspections_gsh FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- 6.1) RLS - Inspecciones GSH Areas
DROP POLICY IF EXISTS "Usuarios pueden ver áreas de inspecciones accesibles" ON public.inspections_gsh_areas;
CREATE POLICY "Usuarios pueden ver áreas de inspecciones accesibles"
  ON public.inspections_gsh_areas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections_gsh
      WHERE public.inspections_gsh.id = inspection_id
      AND (
        location_id IN (
          SELECT location_id FROM public.user_locations WHERE user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND (role = 'admin' OR is_corporate = true)
        )
      )
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden crear áreas" ON public.inspections_gsh_areas;
CREATE POLICY "Usuarios pueden crear áreas"
  ON public.inspections_gsh_areas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections_gsh
      WHERE public.inspections_gsh.id = inspection_id
      AND (
        inspector_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND (role = 'admin' OR is_corporate = true)
        )
      )
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden actualizar áreas" ON public.inspections_gsh_areas;
CREATE POLICY "Usuarios pueden actualizar áreas"
  ON public.inspections_gsh_areas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections_gsh
      WHERE public.inspections_gsh.id = inspection_id
      AND (
        inspector_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'supervisor')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Solo admins pueden eliminar áreas" ON public.inspections_gsh_areas;
CREATE POLICY "Solo admins pueden eliminar áreas"
  ON public.inspections_gsh_areas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- 6.2) RLS - Inspecciones GSH Items
DROP POLICY IF EXISTS "Usuarios pueden ver items de inspecciones accesibles" ON public.inspections_gsh_items;
CREATE POLICY "Usuarios pueden ver items de inspecciones accesibles"
  ON public.inspections_gsh_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections_gsh
      WHERE public.inspections_gsh.id = inspection_id
      AND (
        location_id IN (
          SELECT location_id FROM public.user_locations WHERE user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND (role = 'admin' OR is_corporate = true)
        )
      )
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden crear items" ON public.inspections_gsh_items;
CREATE POLICY "Usuarios pueden crear items"
  ON public.inspections_gsh_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections_gsh
      WHERE public.inspections_gsh.id = inspection_id
      AND (
        inspector_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND (role = 'admin' OR is_corporate = true)
        )
      )
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden actualizar items" ON public.inspections_gsh_items;
CREATE POLICY "Usuarios pueden actualizar items"
  ON public.inspections_gsh_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections_gsh
      WHERE public.inspections_gsh.id = inspection_id
      AND (
        inspector_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'supervisor')
        )
      )
    )
  );

-- 7) RLS - Academia (admin o corporativo)
DROP POLICY IF EXISTS "areas_admin_all" ON public.academy_areas;
CREATE POLICY "areas_admin_all" ON public.academy_areas FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_corporate = true))
);

DROP POLICY IF EXISTS "courses_select_published" ON public.academy_courses;
CREATE POLICY "courses_select_published" ON public.academy_courses FOR SELECT USING (
  is_published = true AND is_active = true
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_corporate = true))
);
DROP POLICY IF EXISTS "courses_admin_all" ON public.academy_courses;
CREATE POLICY "courses_admin_all" ON public.academy_courses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_corporate = true))
);

DROP POLICY IF EXISTS "modules_select" ON public.academy_modules;
CREATE POLICY "modules_select" ON public.academy_modules FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.academy_courses c
    WHERE c.id = course_id
    AND (c.is_published = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_corporate = true)))
  )
);
DROP POLICY IF EXISTS "modules_admin_all" ON public.academy_modules;
CREATE POLICY "modules_admin_all" ON public.academy_modules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_corporate = true))
);

DROP POLICY IF EXISTS "content_select" ON public.academy_content;
CREATE POLICY "content_select" ON public.academy_content FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.academy_modules m
    JOIN public.academy_courses c ON c.id = m.course_id
    WHERE m.id = module_id
    AND (c.is_published = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_corporate = true)))
  )
);
DROP POLICY IF EXISTS "content_admin_all" ON public.academy_content;
CREATE POLICY "content_admin_all" ON public.academy_content FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_corporate = true))
);

DROP POLICY IF EXISTS "quizzes_select" ON public.academy_quizzes;
CREATE POLICY "quizzes_select" ON public.academy_quizzes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.academy_courses c
    WHERE (c.id = course_id OR c.id IN (SELECT course_id FROM public.academy_modules WHERE id = module_id))
    AND (c.is_published = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_corporate = true)))
  )
);
DROP POLICY IF EXISTS "quizzes_admin_all" ON public.academy_quizzes;
CREATE POLICY "quizzes_admin_all" ON public.academy_quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_corporate = true))
);

DROP POLICY IF EXISTS "questions_admin_all" ON public.academy_quiz_questions;
CREATE POLICY "questions_admin_all" ON public.academy_quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_corporate = true))
);

DROP POLICY IF EXISTS "enrollments_select_own" ON public.academy_enrollments;
CREATE POLICY "enrollments_select_own" ON public.academy_enrollments FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_corporate = true))
);
DROP POLICY IF EXISTS "enrollments_insert_own" ON public.academy_enrollments;
CREATE POLICY "enrollments_insert_own" ON public.academy_enrollments FOR INSERT WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_corporate = true))
);
DROP POLICY IF EXISTS "enrollments_update" ON public.academy_enrollments;
CREATE POLICY "enrollments_update" ON public.academy_enrollments FOR UPDATE USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_corporate = true))
);

DROP POLICY IF EXISTS "progress_select_own" ON public.academy_progress;
CREATE POLICY "progress_select_own" ON public.academy_progress FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_corporate = true))
);
DROP POLICY IF EXISTS "attempts_select_own" ON public.academy_quiz_attempts;
CREATE POLICY "attempts_select_own" ON public.academy_quiz_attempts FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_corporate = true))
);

DROP POLICY IF EXISTS "certificates_select_own" ON public.academy_certificates;
CREATE POLICY "certificates_select_own" ON public.academy_certificates FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_corporate = true))
);
DROP POLICY IF EXISTS "certificates_admin_insert" ON public.academy_certificates;
CREATE POLICY "certificates_admin_insert" ON public.academy_certificates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_corporate = true))
  OR user_id = auth.uid()
);

-- NOTE: Policies like progress_insert_own, progress_update_own,
-- attempts_insert_own, attempts_update_own, bookmarks_own are unchanged.
