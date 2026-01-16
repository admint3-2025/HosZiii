-- ============================================================================
-- TICKETS DE PRUEBA PARA AGING METRICS
-- Crea 10 tickets con diferentes antigüedades y estados
-- ============================================================================

-- Obtener IDs de usuarios existentes (ajusta según tu DB)
DO $$
DECLARE
  v_requester_id UUID;
  v_agent_l1_id UUID;
  v_agent_l2_id UUID;
  v_supervisor_id UUID;
  v_category_id UUID;
  v_ticket_id UUID;
BEGIN
  -- Obtener usuarios (ajusta emails según tu BD)
  SELECT id INTO v_requester_id FROM profiles WHERE role = 'requester' LIMIT 1;
  SELECT id INTO v_agent_l1_id FROM profiles WHERE role = 'agent_l1' LIMIT 1;
  SELECT id INTO v_agent_l2_id FROM profiles WHERE role = 'agent_l2' LIMIT 1;
  SELECT id INTO v_supervisor_id FROM profiles WHERE role = 'supervisor' LIMIT 1;
  
  -- Si no hay agentes, usar admin
  IF v_agent_l1_id IS NULL THEN
    SELECT id INTO v_agent_l1_id FROM profiles WHERE role = 'admin' LIMIT 1;
  END IF;
  IF v_agent_l2_id IS NULL THEN
    v_agent_l2_id := v_agent_l1_id;
  END IF;
  IF v_supervisor_id IS NULL THEN
    v_supervisor_id := v_agent_l1_id;
  END IF;
  IF v_requester_id IS NULL THEN
    SELECT id INTO v_requester_id FROM auth.users LIMIT 1;
  END IF;
  
  -- Verificar que tenemos usuarios
  IF v_requester_id IS NULL OR v_agent_l1_id IS NULL THEN
    RAISE EXCEPTION 'No se encontraron usuarios en la base de datos';
  END IF;
  
  -- Obtener una categoría
  SELECT id INTO v_category_id FROM categories WHERE parent_id IS NOT NULL LIMIT 1;

  -- TICKET 1: Muy viejo (30 días) - ASSIGNED - Alta prioridad
  INSERT INTO tickets (
    ticket_number, title, description, category_id, 
    priority, urgency, impact, status,
    requester_id, requester_email, requester_name,
    assigned_agent_id,
    created_at, updated_at
  ) VALUES (
    nextval('ticket_number_seq'),
    'Servidor no responde - URGENTE',
    'El servidor principal no responde desde hace varios días',
    v_category_id, 
    4, 4, 4, 'ASSIGNED',
    v_requester_id, 'usuario1@empresa.com', 'Usuario Uno',
    v_agent_l1_id,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '28 days'
  ) RETURNING id INTO v_ticket_id;
  
  INSERT INTO ticket_status_history (ticket_id, from_status, to_status, actor_id)
  VALUES (v_ticket_id, 'NEW', 'ASSIGNED', v_agent_l1_id);

  -- TICKET 2: Viejo (20 días) - IN_PROGRESS - Media prioridad
  INSERT INTO tickets (
    ticket_number, title, description, category_id, 
    priority, urgency, impact, status,
    requester_id, requester_email, requester_name,
    assigned_agent_id,
    created_at, updated_at
  ) VALUES (
    nextval('ticket_number_seq'),
    'VPN no conecta desde home office',
    'No puedo conectarme a la VPN desde casa',
    v_category_id, 
    3, 3, 3, 'IN_PROGRESS',
    v_requester_id, 'usuario2@empresa.com', 'Usuario Dos',
    v_agent_l2_id,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '10 days'
  ) RETURNING id INTO v_ticket_id;
  
  INSERT INTO ticket_status_history (ticket_id, from_status, to_status, actor_id)
  VALUES (v_ticket_id, 'ASSIGNED', 'IN_PROGRESS', v_agent_l2_id);

  -- TICKET 3: Medio (15 días) - NEEDS_INFO - Baja prioridad
  INSERT INTO tickets (
    ticket_number, title, description, category_id, 
    priority, urgency, impact, status,
    requester_id, requester_email, requester_name,
    assigned_agent_id,
    created_at, updated_at
  ) VALUES (
    nextval('ticket_number_seq'),
    'Solicitud de nuevo mouse',
    'Mi mouse ya no funciona correctamente',
    v_category_id, 
    1, 1, 1, 'NEEDS_INFO',
    v_requester_id, 'usuario3@empresa.com', 'Usuario Tres',
    v_agent_l1_id,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '14 days'
  ) RETURNING id INTO v_ticket_id;
  
  INSERT INTO ticket_status_history (ticket_id, from_status, to_status, actor_id)
  VALUES (v_ticket_id, 'IN_PROGRESS', 'NEEDS_INFO', v_agent_l1_id);

  -- TICKET 4: Medio (12 días) - ASSIGNED - Alta prioridad
  INSERT INTO tickets (
    ticket_number, title, description, category_id, 
    priority, urgency, impact, status,
    requester_id, requester_email, requester_name,
    assigned_agent_id,
    created_at, updated_at
  ) VALUES (
    nextval('ticket_number_seq'),
    'Pérdida de datos en backup',
    'El backup automático falló la semana pasada',
    v_category_id, 
    4, 4, 4, 'ASSIGNED',
    v_requester_id, 'usuario4@empresa.com', 'Usuario Cuatro',
    v_supervisor_id,
    NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '11 days'
  ) RETURNING id INTO v_ticket_id;
  
  INSERT INTO ticket_status_history (ticket_id, from_status, to_status, actor_id)
  VALUES (v_ticket_id, 'NEW', 'ASSIGNED', v_supervisor_id);

  -- TICKET 5: Reciente (7 días) - IN_PROGRESS - Media prioridad
  INSERT INTO tickets (
    ticket_number, title, description, category_id, 
    priority, urgency, impact, status,
    requester_id, requester_email, requester_name,
    assigned_agent_id,
    created_at, updated_at
  ) VALUES (
    nextval('ticket_number_seq'),
    'Impresora no imprime',
    'La impresora del piso 3 no responde',
    v_category_id, 
    3, 2, 2, 'IN_PROGRESS',
    v_requester_id, 'usuario5@empresa.com', 'Usuario Cinco',
    v_agent_l2_id,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '5 days'
  ) RETURNING id INTO v_ticket_id;
  
  INSERT INTO ticket_status_history (ticket_id, from_status, to_status, actor_id)
  VALUES (v_ticket_id, 'ASSIGNED', 'IN_PROGRESS', v_agent_l2_id);

  -- TICKET 6: Reciente (5 días) - ASSIGNED - Baja prioridad
  INSERT INTO tickets (
    ticket_number, title, description, category_id, 
    priority, urgency, impact, status,
    requester_id, requester_email, requester_name,
    assigned_agent_id,
    created_at, updated_at
  ) VALUES (
    nextval('ticket_number_seq'),
    'Actualización de software de oficina',
    'Solicito actualización de Office a última versión',
    v_category_id, 
    1, 1, 1, 'ASSIGNED',
    v_requester_id, 'usuario6@empresa.com', 'Usuario Seis',
    v_agent_l1_id,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '4 days'
  ) RETURNING id INTO v_ticket_id;
  
  INSERT INTO ticket_status_history (ticket_id, from_status, to_status, actor_id)
  VALUES (v_ticket_id, 'NEW', 'ASSIGNED', v_agent_l1_id);

  -- TICKET 7: Nuevo (3 días) - NEW - Media prioridad
  INSERT INTO tickets (
    ticket_number, title, description, category_id, 
    priority, urgency, impact, status,
    requester_id, requester_email, requester_name,
    created_at, updated_at
  ) VALUES (
    nextval('ticket_number_seq'),
    'No puedo acceder a carpeta compartida',
    'Error de permisos en red',
    v_category_id, 
    2, 2, 2, 'NEW',
    v_requester_id, 'usuario7@empresa.com', 'Usuario Siete',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  );

  -- TICKET 8: Nuevo (2 días) - ASSIGNED - Alta prioridad
  INSERT INTO tickets (
    ticket_number, title, description, category_id, 
    priority, urgency, impact, status,
    requester_id, requester_email, requester_name,
    assigned_agent_id,
    created_at, updated_at
  ) VALUES (
    nextval('ticket_number_seq'),
    'Email no envía ni recibe',
    'Correo electrónico sin funcionar desde ayer',
    v_category_id, 
    4, 3, 3, 'ASSIGNED',
    v_requester_id, 'usuario8@empresa.com', 'Usuario Ocho',
    v_agent_l2_id,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day'
  ) RETURNING id INTO v_ticket_id;
  
  INSERT INTO ticket_status_history (ticket_id, from_status, to_status, actor_id)
  VALUES (v_ticket_id, 'NEW', 'ASSIGNED', v_agent_l2_id);

  -- TICKET 9: Muy nuevo (1 día) - IN_PROGRESS - Media prioridad
  INSERT INTO tickets (
    ticket_number, title, description, category_id, 
    priority, urgency, impact, status,
    requester_id, requester_email, requester_name,
    assigned_agent_id,
    created_at, updated_at
  ) VALUES (
    nextval('ticket_number_seq'),
    'Instalación de aplicación específica',
    'Necesito instalar software especializado',
    v_category_id, 
    2, 2, 2, 'IN_PROGRESS',
    v_requester_id, 'usuario9@empresa.com', 'Usuario Nueve',
    v_supervisor_id,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '12 hours'
  ) RETURNING id INTO v_ticket_id;
  
  INSERT INTO ticket_status_history (ticket_id, from_status, to_status, actor_id)
  VALUES (v_ticket_id, 'ASSIGNED', 'IN_PROGRESS', v_supervisor_id);
  
  INSERT INTO ticket_comments (ticket_id, body, author_id, visibility)
  VALUES (v_ticket_id, 'Iniciando instalación del software requerido', v_supervisor_id, 'internal');

  -- TICKET 10: Recién creado (1 hora) - NEW - Baja prioridad
  INSERT INTO tickets (
    ticket_number, title, description, category_id, 
    priority, urgency, impact, status,
    requester_id, requester_email, requester_name,
    created_at, updated_at
  ) VALUES (
    nextval('ticket_number_seq'),
    'Consulta sobre políticas de uso',
    'Tengo dudas sobre políticas de TI',
    v_category_id, 
    1, 1, 1, 'NEW',
    v_requester_id, 'usuario10@empresa.com', 'Usuario Diez',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour'
  );

  RAISE NOTICE 'Se crearon 10 tickets de prueba exitosamente';
END $$;

-- Verificar tickets creados
SELECT 
  ticket_number,
  title,
  status,
  priority,
  EXTRACT(DAY FROM NOW() - created_at) as dias_antiguedad,
  created_at
FROM tickets
ORDER BY created_at DESC
LIMIT 10;
