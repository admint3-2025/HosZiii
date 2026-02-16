-- =====================================================
-- MIGRACIÓN: Actualizar RLS de Housekeeping
-- Fecha: 2026-02-15
-- Objetivo: Reemplazar corporate_admin por is_corporate
--           en todas las políticas de housekeeping
-- =====================================================

-- ──────────────────────────────────────────────────
-- 1. Actualizar políticas de hk_rooms
-- ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "hk_rooms_select" ON hk_rooms;
CREATE POLICY "hk_rooms_select" ON hk_rooms FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role IN ('admin', 'supervisor') OR is_corporate = true))
);

DROP POLICY IF EXISTS "hk_rooms_insert" ON hk_rooms;
CREATE POLICY "hk_rooms_insert" ON hk_rooms FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR (role = 'supervisor' AND is_corporate = true)))
);

DROP POLICY IF EXISTS "hk_rooms_update" ON hk_rooms;
CREATE POLICY "hk_rooms_update" ON hk_rooms FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR (role = 'supervisor' AND is_corporate = true)))
);

DROP POLICY IF EXISTS "hk_rooms_delete" ON hk_rooms;
CREATE POLICY "hk_rooms_delete" ON hk_rooms FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ──────────────────────────────────────────────────
-- 2. Actualizar políticas de hk_staff
-- ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "hk_staff_select" ON hk_staff;
CREATE POLICY "hk_staff_select" ON hk_staff FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role IN ('admin', 'supervisor') OR is_corporate = true))
);

DROP POLICY IF EXISTS "hk_staff_all" ON hk_staff;
CREATE POLICY "hk_staff_all" ON hk_staff FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR (role = 'supervisor' AND is_corporate = true)))
);


-- ──────────────────────────────────────────────────
-- 3. Actualizar políticas de hk_room_assignments
-- ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "hk_assignments_select" ON hk_room_assignments;
CREATE POLICY "hk_assignments_select" ON hk_room_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role IN ('admin', 'supervisor') OR is_corporate = true))
);

DROP POLICY IF EXISTS "hk_assignments_all" ON hk_room_assignments;
CREATE POLICY "hk_assignments_all" ON hk_room_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR (role = 'supervisor' AND is_corporate = true)))
);


-- ──────────────────────────────────────────────────
-- 4. Actualizar políticas de hk_room_status_log
-- ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "hk_status_log_select" ON hk_room_status_log;
CREATE POLICY "hk_status_log_select" ON hk_room_status_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role IN ('admin', 'supervisor') OR is_corporate = true))
);

DROP POLICY IF EXISTS "hk_status_log_insert" ON hk_room_status_log;
CREATE POLICY "hk_status_log_insert" ON hk_room_status_log FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR (role = 'supervisor' AND is_corporate = true)))
);


-- ──────────────────────────────────────────────────
-- 5. Actualizar políticas de hk_inventory_items
-- ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "hk_inventory_select" ON hk_inventory_items;
CREATE POLICY "hk_inventory_select" ON hk_inventory_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role IN ('admin', 'supervisor') OR is_corporate = true))
);

DROP POLICY IF EXISTS "hk_inventory_all" ON hk_inventory_items;
CREATE POLICY "hk_inventory_all" ON hk_inventory_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR (role = 'supervisor' AND is_corporate = true)))
);


-- ──────────────────────────────────────────────────
-- 6. Actualizar políticas de hk_inventory_movements
-- ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "hk_movements_select" ON hk_inventory_movements;
CREATE POLICY "hk_movements_select" ON hk_inventory_movements FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role IN ('admin', 'supervisor') OR is_corporate = true))
);

DROP POLICY IF EXISTS "hk_movements_insert" ON hk_inventory_movements;
CREATE POLICY "hk_movements_insert" ON hk_inventory_movements FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR (role = 'supervisor' AND is_corporate = true)))
);
