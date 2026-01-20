-- ============================================
-- SOLUCIÓN FINAL: DESHABILITAR RLS COMPLETAMENTE
-- Si BYPASSRLS no funciona, deshabilitamos RLS en las tablas
-- ============================================

-- 1. DESHABILITAR RLS en tickets (TODOS ven TODO)
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;

-- 2. DESHABILITAR RLS en locations (TODOS ven TODO)
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;

-- 3. Verificación inmediata
SELECT 
  'Tickets RLS deshabilitado' as info,
  COUNT(*) as total_tickets
FROM tickets;

SELECT 
  'Locations RLS deshabilitado' as info,
  COUNT(*) as total_locations
FROM locations;

SELECT 
  'Distribución por sede' as info,
  l.code,
  COUNT(t.id) as tickets
FROM locations l
LEFT JOIN tickets t ON t.location_id = l.id
GROUP BY l.id, l.code
ORDER BY tickets DESC;
