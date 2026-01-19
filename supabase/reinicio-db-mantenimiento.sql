-- ============================================================================
-- LIMPIEZA COMPLETA DE DATOS DE DEMOSTRACIÓN - HELPDESK MANTENIMIENTO
-- Preserva: usuarios, categorías, activos de mantenimiento, sedes, estructura de BD
-- Elimina: tickets de mantenimiento, comentarios, adjuntos
-- ============================================================================

-- 1. Desactivar temporalmente RLS para limpieza
SET session_replication_role = replica;

-- 2. Eliminar datos de tickets de mantenimiento y relacionados
-- Primero adjuntos (dependen de comentarios/tickets)
DELETE FROM ticket_attachments_maintenance;
-- Luego comentarios (dependen de tickets)
DELETE FROM ticket_comments_maintenance;
-- Finalmente tickets
DELETE FROM tickets_maintenance;

-- 3. PRESERVAR assets_maintenance (NO eliminar)
-- Los activos de mantenimiento se mantienen intactos

-- 4. Limpiar bucket de storage de mantenimiento
DELETE FROM storage.objects WHERE bucket_id = 'maintenance-attachments';

-- 5. Notificaciones: omitido (la tabla no tiene columna entity_type para filtrar)

-- 6. Eliminar auditoría relacionada con mantenimiento
DELETE FROM audit_log WHERE entity_type IN ('tickets_maintenance', 'ticket_maintenance', 'assets_maintenance');

-- 7. Reiniciar secuencia de ticket_number de mantenimiento (si existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'ticket_number_maintenance_seq') THEN
        EXECUTE 'ALTER SEQUENCE ticket_number_maintenance_seq RESTART WITH 1';
    END IF;
END $$;

-- 8. Reactivar RLS
SET session_replication_role = DEFAULT;

-- 9. Verificar limpieza
SELECT 
  'tickets_maintenance' as tabla, COUNT(*) as registros FROM tickets_maintenance
UNION ALL SELECT 'comments_maintenance', COUNT(*) FROM ticket_comments_maintenance
UNION ALL SELECT 'adjuntos_maintenance', COUNT(*) FROM ticket_attachments_maintenance
UNION ALL SELECT 'usuarios', COUNT(*) FROM profiles
UNION ALL SELECT 'categorías', COUNT(*) FROM categories
UNION ALL SELECT 'activos_maintenance', COUNT(*) FROM assets_maintenance
UNION ALL SELECT 'sedes', COUNT(*) FROM locations;

-- Resultado esperado: 0 en tickets/comments/adjuntos de mantenimiento
-- >0 en usuarios/categorías/activos_maintenance/sedes
