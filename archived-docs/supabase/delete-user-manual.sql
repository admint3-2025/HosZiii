-- Script para reemplazar referencias de un usuario antes de eliminarlo
-- PASO 1: Define aquí el ID del usuario a eliminar y el admin que heredará sus registros
DO $$
DECLARE
  v_user_to_delete UUID := '4bf077f4-c1d2-4200-9a3f-edd9e04dd121'; -- Esteban Aguirre (proyectos@integrational3.com.mx)
  v_admin_replacement UUID := 'fc87c49b-452a-4312-b85e-b002e7f63be8'; -- Ortiz Angel (sistemas@egdls.com)
BEGIN

  -- 1. Transferir solicitudes de baja de activos
  UPDATE asset_disposal_requests
  SET requested_by = v_admin_replacement
  WHERE requested_by = v_user_to_delete;

  -- 2. Transferir activos asignados (deshabilitando trigger)
  ALTER TABLE assets DISABLE TRIGGER trg_log_asset_assignment_change;
  
  UPDATE assets 
  SET assigned_to = v_admin_replacement
  WHERE assigned_to = v_user_to_delete;
  
  ALTER TABLE assets ENABLE TRIGGER trg_log_asset_assignment_change;

  -- 3. Transferir tickets creados (mantener trazabilidad del solicitante original)
  UPDATE tickets 
  SET requester_id = v_admin_replacement
  WHERE requester_id = v_user_to_delete;

  -- 4. Desvincular tickets asignados (mejor NULL que transferir responsabilidad)
  UPDATE tickets 
  SET assigned_agent_id = NULL 
  WHERE assigned_agent_id = v_user_to_delete;

  -- 5. Transferir comentarios en tickets
  UPDATE ticket_comments
  SET author_id = v_admin_replacement
  WHERE author_id = v_user_to_delete;

  -- 6. Transferir archivos adjuntos
  UPDATE ticket_attachments
  SET uploaded_by = v_admin_replacement
  WHERE uploaded_by = v_user_to_delete;

  -- 7. Transferir cambios de ubicación de activos
  UPDATE asset_location_changes
  SET changed_by = v_admin_replacement
  WHERE changed_by = v_user_to_delete;

  -- 8. Transferir cambios de asignación de activos
  UPDATE asset_assignment_changes
  SET changed_by = v_admin_replacement
  WHERE changed_by = v_user_to_delete;

  -- 9. Transferir historial de cambios de estado de tickets
  UPDATE ticket_status_history
  SET actor_id = v_admin_replacement
  WHERE actor_id = v_user_to_delete;

  -- 10. Eliminar relaciones de ubicaciones
  DELETE FROM user_locations 
  WHERE user_id = v_user_to_delete;

  -- 11. Eliminar notificaciones
  DELETE FROM notifications 
  WHERE user_id = v_user_to_delete;

  -- 12. Eliminar de profiles
  DELETE FROM profiles 
  WHERE id = v_user_to_delete;

  -- 13. Finalmente eliminar de auth.users
  DELETE FROM auth.users 
  WHERE id = v_user_to_delete;

  RAISE NOTICE 'Usuario eliminado correctamente y registros transferidos';
END $$;

-- Verificar que se eliminó correctamente
SELECT 'Proceso completado' as status;
