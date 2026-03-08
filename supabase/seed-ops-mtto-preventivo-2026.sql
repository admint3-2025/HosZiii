-- ============================================================================
-- SEED: Programa Anual de Mantenimiento Preventivo Hotel 2026
-- Módulo: Operaciones (ops.*)
-- Fuente: MTTO PREVENTIVO QRO26.pdf
-- Ejecutar DESPUÉS de: supabase/migrations/20260219093000_create_ops_module.sql
-- ============================================================================

-- ── 1. RESPONSABLE DE MANTENIMIENTO ──────────────────────────────────────────
INSERT INTO ops.responsables_proveedores (codigo, nombre, tipo, departamento)
VALUES ('MTTO-JEFE-001', 'Jefe de Mantenimiento', 'interno', 'MANTENIMIENTO')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
RETURNING id;

-- ── 2. ENTIDADES OBJETIVO (áreas del hotel) ───────────────────────────────────
INSERT INTO ops.entidades_objetivo (codigo, nombre, tipo_entidad, categoria, departamento) VALUES
  ('MTTO-EST-001',   'Estacionamiento',                              'AREA_HOTEL',    'Áreas Exteriores',     'MANTENIMIENTO'),
  ('MTTO-FAC-001',   'Fachada',                                      'AREA_HOTEL',    'Áreas Exteriores',     'MANTENIMIENTO'),
  ('MTTO-LOB-001',   'Motor Lobby / Lobby y Bistro',                 'AREA_HOTEL',    'Áreas Comunes',        'MANTENIMIENTO'),
  ('MTTO-ANU-001',   'Anuncios Panorámicos y Espectaculares',        'AREA_HOTEL',    'Áreas Exteriores',     'MANTENIMIENTO'),
  ('MTTO-BOD-001',   'Almacenes, Bodegas, Pisos y Sótanos',         'AREA_HOTEL',    'Áreas de Servicio',    'MANTENIMIENTO'),
  ('MTTO-AZO-001',   'Azoteas',                                      'AREA_HOTEL',    'Áreas Exteriores',     'MANTENIMIENTO'),
  ('MTTO-OFI-001',   'Áreas Administrativas y Oficinas',             'AREA_HOTEL',    'Áreas Administrativas','MANTENIMIENTO'),
  ('MTTO-VES-001',   'Vestidores',                                   'AREA_HOTEL',    'Áreas de Servicio',    'MANTENIMIENTO'),
  ('MTTO-COM-001',   'Comedor de Personal',                          'AREA_HOTEL',    'Áreas de Servicio',    'MANTENIMIENTO'),
  ('MTTO-VIG-001',   'Vigilancia, Casetas y Plumas',                 'AREA_HOTEL',    'Seguridad',            'MANTENIMIENTO'),
  ('MTTO-BAS-001',   'Área de Basura y Bodega de Separación',        'AREA_HOTEL',    'Áreas de Servicio',    'MANTENIMIENTO'),
  ('MTTO-PAT-001',   'Patios y Pasillos de Servicio',                'AREA_HOTEL',    'Áreas de Servicio',    'MANTENIMIENTO'),
  ('MTTO-GYM-001',   'Gimnasio',                                     'AREA_HOTEL',    'Áreas Comunes',        'MANTENIMIENTO'),
  ('MTTO-CDN-001',   'Centro de Negocios',                           'AREA_HOTEL',    'Áreas Comunes',        'MANTENIMIENTO'),
  ('MTTO-HAB-001',   'Habitaciones',                                 'AREA_HOTEL',    'Cuartos',              'MANTENIMIENTO'),
  ('MTTO-PAS-001',   'Pasillos de Habitaciones',                     'AREA_HOTEL',    'Cuartos',              'MANTENIMIENTO'),
  ('MTTO-ELE-001',   'Sistema Eléctrico',                            'SISTEMA',       'Instalaciones',        'MANTENIMIENTO'),
  ('MTTO-HID-001',   'Sistema Hidráulico',                           'SISTEMA',       'Instalaciones',        'MANTENIMIENTO'),
  ('MTTO-AC-001',    'Sistemas de Aire Acondicionado',               'SISTEMA',       'Climatización',        'MANTENIMIENTO'),
  ('MTTO-COC-001',   'Cocina',                                       'AREA_HOTEL',    'Alimentos y Bebidas',  'MANTENIMIENTO'),
  ('MTTO-LAV-001',   'Lavandería',                                   'AREA_HOTEL',    'Áreas de Servicio',    'MANTENIMIENTO'),
  ('MTTO-ELV-001',   'Elevadores',                                   'EQUIPO',        'Transporte Vertical',  'MANTENIMIENTO'),
  ('MTTO-SEG-001',   'Seguridad y Control de Riesgos',               'SISTEMA',       'Seguridad',            'MANTENIMIENTO'),
  ('MTTO-ADM-001',   'Aspectos Administrativos del Departamento',    'ACTIVIDAD',     'Administración',       'MANTENIMIENTO')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

-- ── 3. PLANES MAESTROS ────────────────────────────────────────────────────────
-- Usamos un bloque DO para resolver el id del responsable dinámicamente

DO $$
DECLARE
  v_resp  uuid;
  v_ent   uuid;
BEGIN
  -- Responsable principal
  SELECT id INTO v_resp FROM ops.responsables_proveedores WHERE codigo = 'MTTO-JEFE-001' LIMIT 1;

  -- ─── ASPECTOS ADMINISTRATIVOS (trimestral) ────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-ADM-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-ADM-2026',
    'Aspectos Administrativos – Mantenimiento',
    'Presupuesto, uniformes, inventario de herramientas, licencias y permisos',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'quarterly', 1,
    0, 8, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── ESTACIONAMIENTO (trimestral) ─────────────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-EST-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-EST-2026',
    'Mantenimiento Preventivo – Estacionamiento',
    'Balizamiento, señalética y luminarios del estacionamiento',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'quarterly', 1,
    5000, 12, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── FACHADA (semestral) ──────────────────────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-FAC-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-FAC-2026',
    'Mantenimiento Preventivo – Fachada',
    'Pintura, grietas, lavado de cristales altura y luminarios de fachada',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'custom_days', 1, 180,
    25000, 24, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── MOTOR LOBBY / LOBBY Y BISTRO (trimestral) ────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-LOB-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-LOB-2026',
    'Mantenimiento Preventivo – Lobby y Bistro',
    'Pisos, pintura, luminarios, puerta automática, mobiliario, sillones y mesas',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'quarterly', 1,
    8000, 16, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── ANUNCIOS PANORÁMICOS (trimestral) ────────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-ANU-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-ANU-2026',
    'Mantenimiento Preventivo – Anuncios y Espectaculares',
    'Lavado, funcionamiento y ajuste de timers de anuncios panorámicos',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'quarterly', 1,
    3000, 8, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── ALMACENES Y BODEGAS (trimestral) ─────────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-BOD-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-BOD-2026',
    'Mantenimiento Preventivo – Almacenes y Bodegas',
    'Instalaciones, limpieza profunda, cebaderos y luminarios en pisos y sótanos',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'quarterly', 1,
    4000, 16, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── AZOTEAS (semestral) ──────────────────────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-AZO-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo, custom_interval_days,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-AZO-2026',
    'Mantenimiento Preventivo – Azoteas',
    'Sellado de grietas, impermeabilización, limpieza y bajantes pluviales',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'custom_days', 1, 180,
    18000, 20, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── ÁREAS ADMINISTRATIVAS Y OFICINAS (mensual) ───────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-OFI-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-OFI-2026',
    'Mantenimiento Preventivo – Oficinas Administrativas',
    'Instalaciones, luminarios y mobiliario de oficinas',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'monthly', 1,
    2000, 8, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── VESTIDORES (mensual) ─────────────────────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-VES-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-VES-2026',
    'Mantenimiento Preventivo – Vestidores',
    'Instalaciones, luminarios, casilleros, mamparas y mobiliario',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'monthly', 1,
    1500, 6, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── COMEDOR DE PERSONAL (mensual) ────────────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-COM-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-COM-2026',
    'Mantenimiento Preventivo – Comedor de Personal',
    'Instalaciones, luminarios, mobiliario, horno y refrigerador',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'monthly', 1,
    1500, 6, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── VIGILANCIA Y CASETAS (mensual) ───────────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-VIG-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-VIG-2026',
    'Mantenimiento Preventivo – Vigilancia, Casetas y Plumas',
    'Instalaciones, luminarios y mobiliario de puntos de seguridad',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'monthly', 1,
    1000, 4, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── BASURA Y BODEGA DE SEPARACIÓN (mensual) ──────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-BAS-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-BAS-2026',
    'Mantenimiento Preventivo – Área de Basura y Separación',
    'Lavado de contenedores, fumigación, cebaderos, puertas y rejas',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'monthly', 1,
    2000, 8, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── PATIOS Y PASILLOS DE SERVICIO (mensual) ──────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-PAT-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-PAT-2026',
    'Mantenimiento Preventivo – Patios y Pasillos de Servicio',
    'Instalaciones, limpieza general y revisión de registros y drenes',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'monthly', 1,
    1000, 4, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── GIMNASIO (mensual) ───────────────────────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-GYM-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-GYM-2026',
    'Mantenimiento Preventivo – Gimnasio',
    'Mantenimiento de equipo de gimnasio y pintura general',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'monthly', 1,
    3000, 8, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── HABITACIONES (mensual) ───────────────────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-HAB-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-HAB-2026',
    'Mantenimiento Preventivo – Habitaciones',
    'Mantenimiento preventivo de habitaciones (recorrido integral)',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'monthly', 1,
    8000, 40, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── PASILLOS DE HABITACIONES (mensual) ───────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-PAS-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-PAS-2026',
    'Mantenimiento Preventivo – Pasillos de Habitaciones',
    'Instalaciones, luminarios, decoración y ductos de instalaciones',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'monthly', 1,
    2000, 8, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── SISTEMA ELÉCTRICO (mensual) ──────────────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-ELE-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-ELE-2026',
    'Mantenimiento Preventivo – Sistema Eléctrico',
    'Transformador, registros eléctricos, planta de energía, tierras, subestación, pararrayos y señalética',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'monthly', 1,
    12000, 24, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── SISTEMA HIDRÁULICO (mensual) ─────────────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-HID-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-HID-2026',
    'Mantenimiento Preventivo – Sistema Hidráulico',
    'Aljibes, cisternas, tinacos, calentadores, cárcamos, bombas, tuberías y válvulas',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'monthly', 1,
    10000, 20, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── AIRES ACONDICIONADOS (mensual) ───────────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-AC-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-AC-2026',
    'Mantenimiento Preventivo – Aires Acondicionados',
    'AC de salones, salas de juntas, oficinas, bistro, habitaciones, inyectores y extractores',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'monthly', 1,
    15000, 32, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── COCINA (mensual) ─────────────────────────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-COC-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-COC-2026',
    'Mantenimiento Preventivo – Cocina',
    'Mobiliario, equipos de cocción, hornos, refrigeración, drenajes, trampa de grasa, gas y extracción',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'monthly', 1,
    10000, 20, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── LAVANDERÍA (mensual) ─────────────────────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-LAV-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-LAV-2026',
    'Mantenimiento Preventivo – Lavandería',
    'Instalaciones, iluminación, drenajes, lavadoras, secadoras, planchadoras y maquinaria',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'monthly', 1,
    5000, 12, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── ELEVADORES (mensual) ─────────────────────────────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-ELV-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-ELV-2026',
    'Mantenimiento Preventivo – Elevadores',
    'Mantenimiento póliza, instalaciones, prueba de alarmas e interfón',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'monthly', 1,
    8000, 8, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

  -- ─── SEGURIDAD Y CONTROL DE RIESGOS (trimestral) ─────────────────────────
  SELECT id INTO v_ent FROM ops.entidades_objetivo WHERE codigo = 'MTTO-SEG-001' LIMIT 1;
  INSERT INTO ops.planes_maestros (
    codigo_plan, nombre, descripcion, departamento_dueno, moneda,
    entidad_objetivo_id, responsable_proveedor_id,
    fecha_inicio, fecha_fin, frecuencia_tipo, frecuencia_intervalo,
    monto_total_planeado, esfuerzo_total_planeado, estado
  ) VALUES (
    'PLAN-MTTO-SEG-2026',
    'Mantenimiento Preventivo – Seguridad y Protección Civil',
    'Primeros auxilios, brigadas, simulacros, señalética, sistema contra incendios, hidrantes, extintores y bombas',
    'MANTENIMIENTO', 'MXN', v_ent, v_resp,
    '2026-01-01', '2026-12-31', 'quarterly', 1,
    6000, 16, 'activo'
  ) ON CONFLICT (codigo_plan) DO NOTHING;

END $$;

-- ── VERIFICACIÓN ──────────────────────────────────────────────────────────────
SELECT
  p.codigo_plan,
  p.nombre,
  p.frecuencia_tipo,
  p.monto_total_planeado,
  e.nombre AS entidad,
  p.estado
FROM ops.planes_maestros p
JOIN ops.entidades_objetivo e ON e.id = p.entidad_objetivo_id
WHERE p.codigo_plan LIKE 'PLAN-MTTO-%'
ORDER BY p.codigo_plan;
