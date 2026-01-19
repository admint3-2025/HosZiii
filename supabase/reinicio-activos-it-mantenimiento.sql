-- ============================================================================
-- LIMPIEZA COMPLETA DE ACTIVOS - IT Y MANTENIMIENTO
-- Elimina: activos IT, activos mantenimiento, cambios de activos, auditoría
-- Preserva: usuarios, tickets, categorías, sedes, estructura de BD
-- ============================================================================

-- 1. Desactivar temporalmente RLS para limpieza
SET session_replication_role = replica;

-- 2. Eliminar historial de cambios de activos IT
DELETE FROM asset_changes;

-- 3. Eliminar solicitudes de baja de activos
DELETE FROM asset_disposal_requests;

-- 4. Eliminar activos de IT
DELETE FROM assets_it;

-- 5. Eliminar activos de Mantenimiento
DELETE FROM assets_maintenance;

-- 6. Eliminar activos legacy (si existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets' AND table_schema = 'public') THEN
        DELETE FROM assets;
    END IF;
END $$;

-- 7. Limpiar imágenes de activos en storage
DELETE FROM storage.objects WHERE bucket_id = 'asset-images';
DELETE FROM storage.objects WHERE bucket_id = 'maintenance-asset-images';

-- 8. Eliminar auditoría relacionada con activos
DELETE FROM audit_log WHERE entity_type IN (
    'asset', 'assets', 'assets_it', 'assets_maintenance', 
    'asset_change', 'asset_changes',
    'asset_disposal_request', 'asset_disposal_requests'
);

-- 9. Reactivar RLS
SET session_replication_role = DEFAULT;

-- 10. Verificar limpieza
SELECT 
  'assets_it' as tabla, COUNT(*) as registros FROM assets_it
UNION ALL SELECT 'assets_maintenance', COUNT(*) FROM assets_maintenance
UNION ALL SELECT 'asset_changes', COUNT(*) FROM asset_changes
UNION ALL SELECT 'asset_disposal_requests', COUNT(*) FROM asset_disposal_requests
UNION ALL SELECT 'audit_activos', (SELECT COUNT(*) FROM audit_log WHERE entity_type LIKE '%asset%')
UNION ALL SELECT 'usuarios', COUNT(*) FROM profiles
UNION ALL SELECT 'sedes', COUNT(*) FROM locations;

-- Resultado esperado: 0 en activos y auditoría de activos
-- >0 en usuarios/sedes
