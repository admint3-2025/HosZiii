-- ============================================================================
-- FIX: Eliminar triggers de notificación duplicados en tabla tickets
-- Fecha: 2026-02-17
-- ============================================================================
-- PROBLEMA:
-- Existen triggers en la tabla `tickets` que crean filas en `notifications`
-- cada vez que se inserta o actualiza un ticket. PERO el código de la
-- aplicación (notifyTicketCreated, notifyTicketAssigned, notifyTicketStatusChanged,
-- notifyLocationStaff) TAMBIÉN crea notificaciones. Esto causa:
--
--   1. Notificaciones DUPLICADAS (trigger + app)
--   2. Notificaciones CROSS-LOCATION: el trigger usa `assets` (tabla vieja)
--      para determinar la categoría; cuando falla (NULL), ignora el filtro
--      de asset_category y notifica a TODOS los agentes de la sede,
--      incluyendo los de mantenimiento. En versiones simplificadas del
--      trigger, el filtro de categoría fue removido por completo.
--   3. El trigger NO revisa la tabla `user_locations` (multi-sede),
--      mientras que el código de la app SÍ lo hace.
--
-- SOLUCIÓN:
-- Eliminar los 3 triggers de notificación de la tabla `tickets`.
-- Mantener `trg_notify_comment_added` en `ticket_comments` porque
-- el código de la app NO tiene notificación in-app para comentarios IT.
-- ============================================================================

-- 1. Eliminar trigger de creación de ticket
DROP TRIGGER IF EXISTS trg_notify_ticket_created ON tickets;

-- 2. Eliminar trigger de asignación de ticket
DROP TRIGGER IF EXISTS trg_notify_ticket_assigned ON tickets;

-- 3. Eliminar trigger de cambio de estado
DROP TRIGGER IF EXISTS trg_notify_ticket_status_changed ON tickets;

-- 4. (Opcional) Eliminar las funciones asociadas si ya no se usan en otro lugar.
--    Comentado por seguridad; descomentar si se confirma que no se usan.
-- DROP FUNCTION IF EXISTS notify_ticket_created();
-- DROP FUNCTION IF EXISTS notify_ticket_assigned();
-- DROP FUNCTION IF EXISTS notify_ticket_status_changed();

-- Verificar que el trigger de comentarios sigue activo
-- (Este SÍ es necesario porque la app no tiene notificaciones in-app para
--  comentarios de tickets IT)
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'ticket_comments'::regclass;

-- ============================================================================
-- DESPUÉS DE EJECUTAR:
-- Las notificaciones de tickets IT serán manejadas EXCLUSIVAMENTE por el
-- código de la aplicación (Next.js), que incluye:
--   ✓ Filtrado por location_id del ticket
--   ✓ Filtrado por asset_category (IT vs MAINTENANCE)
--   ✓ Soporte para user_locations (multi-sede)
--   ✓ Exclusión de actor/requester/assigned para evitar duplicados
--   ✓ Email + Telegram + Push in-app
-- ============================================================================
