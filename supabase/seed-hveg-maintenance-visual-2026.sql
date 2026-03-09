-- ============================================================================
-- SEED: HVEG Mantenimiento 2026 desde tabla visual
-- Objetivo: cargar planes y agenda manual por mes para validar la vista de
-- planificacion exactamente como aparece en la tabla compartida.
--
-- IMPORTANTE:
-- 1. Verifica que la sede exista en public.locations con code = 'HVEG'.
-- 2. Si el codigo real es otro, reemplaza 'HVEG' en este archivo antes de correrlo.
-- 3. Este script es idempotente para los codigos HVEG-MTTO-2026-*.
-- ============================================================================

DO $$
DECLARE
  v_location_exists BOOLEAN;
  v_provider_id UUID;
  v_entity_id UUID;
  v_plan_id UUID;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.locations
    WHERE code = 'HVEG'
  ) INTO v_location_exists;

  IF NOT v_location_exists THEN
    RAISE EXCEPTION 'No existe la sede HVEG en public.locations. Ajusta el code antes de ejecutar este seed.';
  END IF;

  INSERT INTO ops.responsables_proveedores (
    codigo,
    nombre,
    tipo,
    departamento,
    email,
    metadata
  )
  VALUES (
    'HVEG-MTTO-IMPORT-001',
    'Proveedor demo mantenimiento HVEG',
    'externo',
    'MANTENIMIENTO',
    'hveg-mantenimiento-demo@local.test',
    jsonb_build_object('import_source', 'image_hveg_maintenance_2026')
  )
  ON CONFLICT (codigo) DO UPDATE
  SET nombre = EXCLUDED.nombre,
      tipo = EXCLUDED.tipo,
      departamento = EXCLUDED.departamento,
      email = EXCLUDED.email,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
  RETURNING id INTO v_provider_id;

  -- --------------------------------------------------------------------------
  -- Helper pattern repeated per concept:
  -- 1. upsert entidad
  -- 2. upsert plan maestro
  -- 3. wipe previous agenda for that plan
  -- 4. insert manual monthly agenda
  -- --------------------------------------------------------------------------

  -- 001 Elevadores
  INSERT INTO ops.entidades_objetivo (
    codigo, nombre, tipo_entidad, categoria, departamento, centro_costo,
    responsable_proveedor_id, metadata
  ) VALUES (
    'HVEG-MTTO-ENT-001', 'Elevadores', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG',
    v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026')
  )
  ON CONFLICT (codigo) DO UPDATE
  SET nombre = EXCLUDED.nombre,
      tipo_entidad = EXCLUDED.tipo_entidad,
      categoria = EXCLUDED.categoria,
      departamento = EXCLUDED.departamento,
      centro_costo = EXCLUDED.centro_costo,
      responsable_proveedor_id = EXCLUDED.responsable_proveedor_id,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
  RETURNING id INTO v_entity_id;

  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, dia_del_mes,
    monto_total_planeado, esfuerzo_total_planeado, estado, metadata
  ) VALUES (
    'HVEG-MTTO-2026-001', 'Elevadores', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN',
    v_entity_id, v_provider_id,
    '2026-01-01', '2026-12-31', 'monthly', 1, 15,
    228096, 12, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG')
  )
  ON CONFLICT (codigo_plan) DO UPDATE
  SET nombre = EXCLUDED.nombre,
      descripcion = EXCLUDED.descripcion,
      departamento_dueno = EXCLUDED.departamento_dueno,
      centro_costo = EXCLUDED.centro_costo,
      moneda = EXCLUDED.moneda,
      entidad_objetivo_id = EXCLUDED.entidad_objetivo_id,
      responsable_proveedor_id = EXCLUDED.responsable_proveedor_id,
      fecha_inicio = EXCLUDED.fecha_inicio,
      fecha_fin = EXCLUDED.fecha_fin,
      frecuencia_tipo = EXCLUDED.frecuencia_tipo,
      frecuencia_intervalo = EXCLUDED.frecuencia_intervalo,
      dia_del_mes = EXCLUDED.dia_del_mes,
      monto_total_planeado = EXCLUDED.monto_total_planeado,
      esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado,
      estado = EXCLUDED.estado,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
  RETURNING id INTO v_plan_id;

  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-01-15', 19008, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 1)),
    (v_plan_id, 2, '2026-02-15', 19008, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 2)),
    (v_plan_id, 3, '2026-03-15', 19008, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 3)),
    (v_plan_id, 4, '2026-04-15', 19008, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 4)),
    (v_plan_id, 5, '2026-05-15', 19008, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 5)),
    (v_plan_id, 6, '2026-06-15', 19008, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 6)),
    (v_plan_id, 7, '2026-07-15', 19008, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 7)),
    (v_plan_id, 8, '2026-08-15', 19008, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 8)),
    (v_plan_id, 9, '2026-09-15', 19008, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 9)),
    (v_plan_id, 10, '2026-10-15', 19008, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 10)),
    (v_plan_id, 11, '2026-11-15', 19008, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 11)),
    (v_plan_id, 12, '2026-12-15', 19008, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 12));

  -- 002 Sistema contraincendios
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-002', 'Sistema contraincendios', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-002', 'Sistema contraincendios', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 150, 15, 24200, 2, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-01-15', 12100, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 1)),
    (v_plan_id, 2, '2026-06-15', 12100, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 6));

  -- 003 Camaras de congelacion
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-003', 'Camaras de congelacion', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-003', 'Camaras de congelacion', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 30, 15, 41000, 4, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-03-15', 7000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 3)),
    (v_plan_id, 2, '2026-04-15', 20000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 4)),
    (v_plan_id, 3, '2026-07-15', 7000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 7)),
    (v_plan_id, 4, '2026-11-15', 7000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 11));

  -- 004 Carcamo y desague principal mto a dos bombas
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-004', 'Carcamo y desague principal mto a dos bombas', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-004', 'Carcamo y desague principal mto a dos bombas', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 30, 15, 30000, 1, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-12-15', 30000, 1, 'pendiente', 'media', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 12));

  -- 005 Lavado de cisternas
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-005', 'Lavado de cisternas', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-005', 'Lavado de cisternas', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 30, 15, 15000, 1, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-06-15', 15000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 6));

  -- 006 Planta de luz
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-006', 'Planta de luz', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-006', 'Planta de luz', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'quarterly', 1, 36000, 6, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-01-15', 6000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 1)),
    (v_plan_id, 2, '2026-03-15', 6000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 3)),
    (v_plan_id, 3, '2026-05-15', 6000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 5)),
    (v_plan_id, 4, '2026-07-15', 6000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 7)),
    (v_plan_id, 5, '2026-09-15', 6000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 9)),
    (v_plan_id, 6, '2026-11-15', 6000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 11));

  -- 007 Limpieza de cristales edificio
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-007', 'Limpieza de cristales edificio', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-007', 'Limpieza de cristales edificio', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 30, 15, 16000, 1, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-05-15', 16000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 5));

  -- 008 Campana, extractor, ductos y trampa de grasa
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-008', 'Campana, extractor, ductos y trampa de grasa', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-008', 'Campana, extractor, ductos y trampa de grasa', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'quarterly', 1, 52800, 6, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-01-15', 8800, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 1)),
    (v_plan_id, 2, '2026-03-15', 8800, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 3)),
    (v_plan_id, 3, '2026-05-15', 8800, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 5)),
    (v_plan_id, 4, '2026-07-15', 8800, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 7)),
    (v_plan_id, 5, '2026-09-15', 8800, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 9)),
    (v_plan_id, 6, '2026-11-15', 8800, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 11));

  -- 009 Calentadores de agua
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-009', 'Calentadores de agua', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-009', 'Calentadores de agua', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 60, 15, 60000, 3, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-04-15', 15000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 4)),
    (v_plan_id, 2, '2026-06-15', 30000, 1, 'pendiente', 'media', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 6)),
    (v_plan_id, 3, '2026-09-15', 15000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 9));

  -- 010 Equipos de aires acondicionados habs y pb
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-010', 'Equipos de aires acondicionados habs y pb', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-010', 'Equipos de aires acondicionados habs y pb', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 30, 15, 150570, 1, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-03-15', 150570, 1, 'pendiente', 'alta', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 3));

  -- 011 Equipo de gimnasio
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-011', 'Equipo de gimnasio', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-011', 'Equipo de gimnasio', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 270, 15, 14800, 2, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-01-15', 7400, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 1)),
    (v_plan_id, 2, '2026-10-15', 7400, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 10));

  -- 012 Lavadoras y secadoras
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-012', 'Lavadoras y secadoras', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-012', 'Lavadoras y secadoras', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 150, 15, 28400, 2, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-03-15', 14200, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 3)),
    (v_plan_id, 2, '2026-08-15', 14200, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 8));

  -- 013 Puerta automatica
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-013', 'Puerta automatica', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-013', 'Puerta automatica', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 150, 15, 10000, 2, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-03-15', 5000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 3)),
    (v_plan_id, 2, '2026-08-15', 5000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 8));

  -- 014 Tierra fisica y pararrayos
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-014', 'Tierra fisica y pararrayos', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-014', 'Tierra fisica y pararrayos', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 30, 15, 35000, 1, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-02-15', 35000, 1, 'pendiente', 'media', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 2));

  -- 015 Pulido y encerado de bistro y lobby
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-015', 'Pulido y encerado de bistro y lobby', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-015', 'Pulido y encerado de bistro y lobby', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 30, 15, 64800, 6, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-02-15', 9720, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 2)),
    (v_plan_id, 2, '2026-03-15', 11880, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 3)),
    (v_plan_id, 3, '2026-06-15', 9720, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 6)),
    (v_plan_id, 4, '2026-07-15', 11880, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 7)),
    (v_plan_id, 5, '2026-10-15', 9720, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 10)),
    (v_plan_id, 6, '2026-11-15', 11880, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 11));

  -- 016 Sistema de bombas de cisternas 4 bombas
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-016', 'Sistema de bombas de cisternas 4 bombas', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-016', 'Sistema de bombas de cisternas 4 bombas', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 30, 15, 26000, 1, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-07-15', 26000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 7));

  -- 017 Subestacion electrica, transformador, registro y tableros electricos
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-017', 'Subestacion electrica, transformador, registro y tableros electricos', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-017', 'Subestacion electrica, transformador, registro y tableros electricos', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 30, 15, 58000, 1, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-09-15', 58000, 1, 'pendiente', 'media', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 9));

  -- 018 Mantenimiento horno
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-018', 'Mantenimiento horno', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-018', 'Mantenimiento horno', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 180, 15, 8000, 2, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-03-15', 4000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 3)),
    (v_plan_id, 2, '2026-09-15', 4000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 9));

  -- 019 Extintores
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-019', 'Extintores', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-019', 'Extintores', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 240, 15, 24000, 2, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-03-15', 12000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 3)),
    (v_plan_id, 2, '2026-11-15', 12000, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 11));

  -- 020 Sistema de alarma contra incendios
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-020', 'Sistema de alarma contra incendios', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-020', 'Sistema de alarma contra incendios', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 30, 15, 38000, 1, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-05-15', 38000, 1, 'pendiente', 'media', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 5));

  -- 021 Alfombras
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-021', 'Alfombras', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-021', 'Alfombras', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 60, 15, 97200, 5, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-04-15', 19440, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 4)),
    (v_plan_id, 2, '2026-06-15', 19440, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 6)),
    (v_plan_id, 3, '2026-08-15', 19440, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 8)),
    (v_plan_id, 4, '2026-10-15', 19440, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 10)),
    (v_plan_id, 5, '2026-12-15', 19440, 1, 'pendiente', 'baja', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 12));

  -- 022 Alucobond fachada (sellada o retirada)
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-022', 'Alucobond fachada (sellada o retirada)', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-022', 'Alucobond fachada (sellada o retirada)', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 30, 15, 110200, 1, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-01-15', 110200, 1, 'pendiente', 'alta', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 1));

  -- 023 Asfalto estacionamiento
  INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento, centro_costo, responsable_proveedor_id, metadata)
  VALUES ('HVEG-MTTO-ENT-023', 'Asfalto estacionamiento', 'CONCEPTO_MTTO', 'Carga prueba HVEG 2026', 'MANTENIMIENTO', 'HVEG', v_provider_id, jsonb_build_object('import_source', 'image_hveg_maintenance_2026'))
  ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, tipo_entidad = EXCLUDED.tipo_entidad, categoria = EXCLUDED.categoria, departamento = EXCLUDED.departamento, centro_costo = EXCLUDED.centro_costo, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_entity_id;
  INSERT INTO ops.planes_maestros (codigo_plan, nombre, descripcion, departamento_dueno, centro_costo, moneda, entidad_objetivo_id, responsable_proveedor_id, fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days, dia_del_mes, monto_total_planeado, esfuerzo_total_planeado, estado, metadata)
  VALUES ('HVEG-MTTO-2026-023', 'Asfalto estacionamiento', 'Carga de prueba HVEG 2026 importada desde tabla visual.', 'MANTENIMIENTO', 'HVEG', 'MXN', v_entity_id, v_provider_id, '2026-01-01', '2026-12-31', 'custom_days', 1, 30, 15, 190000, 1, 'activo', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'site', 'HVEG'))
  ON CONFLICT (codigo_plan) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, departamento_dueno = EXCLUDED.departamento_dueno, centro_costo = EXCLUDED.centro_costo, moneda = EXCLUDED.moneda, entidad_objetivo_id = EXCLUDED.entidad_objetivo_id, responsable_proveedor_id = EXCLUDED.responsable_proveedor_id, fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, frecuencia_tipo = EXCLUDED.frecuencia_tipo, frecuencia_intervalo = EXCLUDED.frecuencia_intervalo, custom_interval_days = EXCLUDED.custom_interval_days, dia_del_mes = EXCLUDED.dia_del_mes, monto_total_planeado = EXCLUDED.monto_total_planeado, esfuerzo_total_planeado = EXCLUDED.esfuerzo_total_planeado, estado = EXCLUDED.estado, metadata = EXCLUDED.metadata, updated_at = NOW()
  RETURNING id INTO v_plan_id;
  DELETE FROM ops.agenda_operativa WHERE plan_maestro_id = v_plan_id;
  INSERT INTO ops.agenda_operativa (plan_maestro_id, ocurrencia_nro, due_date, monto_estimado, esfuerzo_estimado, estado, prioridad, notas, metadata) VALUES
    (v_plan_id, 1, '2026-02-15', 190000, 1, 'pendiente', 'alta', 'Carga de prueba HVEG 2026 desde imagen', jsonb_build_object('import_source', 'image_hveg_maintenance_2026', 'month', 2));

END $$;

-- --------------------------------------------------------------------------
-- Verificacion sugerida
-- --------------------------------------------------------------------------
SELECT
  p.codigo_plan,
  p.nombre,
  p.centro_costo,
  p.departamento_dueno,
  p.monto_total_planeado,
  COUNT(a.id) AS eventos,
  COALESCE(SUM(a.monto_estimado), 0) AS monto_agenda
FROM ops.planes_maestros p
LEFT JOIN ops.agenda_operativa a ON a.plan_maestro_id = p.id
WHERE p.codigo_plan LIKE 'HVEG-MTTO-2026-%'
GROUP BY p.codigo_plan, p.nombre, p.centro_costo, p.departamento_dueno, p.monto_total_planeado
ORDER BY p.codigo_plan;