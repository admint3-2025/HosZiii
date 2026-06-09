import type {
  OpsAgendaItem,
  OpsCalendarItem,
  OpsComplianceItem,
  OpsEntidad,
  OpsFinancialItem,
  OpsPlan,
  OpsResponsable,
} from '@/lib/ops/service'

export type PlanningLocationOption = {
  id: string
  code: string
  name: string
}

export type PlanningDemoPlan = OpsPlan & {
  entidad?: { nombre: string } | null
  responsable?: { nombre: string } | null
}

export type PlanningDemoData = {
  locations: PlanningLocationOption[]
  portfolio: {
    plans: PlanningDemoPlan[]
    calendar: OpsCalendarItem[]
    compliance: OpsComplianceItem[]
    financial: OpsFinancialItem[]
  }
  agendasByPlanId: Record<string, OpsAgendaItem[]>
  responsables: OpsResponsable[]
  entidades: OpsEntidad[]
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`
}

function isoDateTime(year: number, month: number, day: number, hour = 9) {
  return `${isoDate(year, month, day)}T${pad(hour)}:00:00.000Z`
}

function daysOverdue(dueDate: string) {
  const due = new Date(`${dueDate}T00:00:00`)
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000))
}

export function buildPlanningDemoData(year: number): PlanningDemoData {
  const locations: PlanningLocationOption[] = [
    { id: 'loc-cun', code: 'ZIII-CUN', name: 'Cancun Centro' },
    { id: 'loc-cab', code: 'ZIII-CAB', name: 'Los Cabos Marina' },
    { id: 'loc-mty', code: 'ZIII-MTY', name: 'Monterrey Valle' },
  ]

  const responsables: OpsResponsable[] = [
    { id: 'resp-vector', codigo: 'RESP-001', nombre: 'Vector Networks', tipo: 'externo', departamento: 'SISTEMAS', email: 'soporte@vector.example', telefono: null, activo: true, created_at: isoDateTime(year, 1, 5) },
    { id: 'resp-frio', codigo: 'RESP-002', nombre: 'Frio Industrial del Pacifico', tipo: 'externo', departamento: 'MANTENIMIENTO', email: 'operaciones@frio.example', telefono: null, activo: true, created_at: isoDateTime(year, 1, 6) },
    { id: 'resp-talento', codigo: 'RESP-003', nombre: 'Talento ZIII', tipo: 'interno', departamento: 'RECURSOS HUMANOS', email: 'talento@ziii.example', telefono: null, activo: true, created_at: isoDateTime(year, 1, 7) },
    { id: 'resp-ayb', codigo: 'RESP-004', nombre: 'Calidad AyB Norte', tipo: 'interno', departamento: 'ALIMENTOS Y BEBIDAS', email: 'ayb@ziii.example', telefono: null, activo: true, created_at: isoDateTime(year, 1, 8) },
  ]

  const entidades: OpsEntidad[] = [
    { id: 'ent-network', codigo: 'ENT-001', nombre: 'Core de red y puntos de acceso', tipo_entidad: 'infraestructura', categoria: 'Red corporativa', departamento: 'SISTEMAS', centro_costo: 'ZIII-CUN', responsable_proveedor_id: 'resp-vector', activo: true, created_at: isoDateTime(year, 1, 5) },
    { id: 'ent-chiller', codigo: 'ENT-002', nombre: 'Chillers y bombas primarias', tipo_entidad: 'equipo', categoria: 'HVAC', departamento: 'MANTENIMIENTO', centro_costo: 'ZIII-CAB', responsable_proveedor_id: 'resp-frio', activo: true, created_at: isoDateTime(year, 1, 6) },
    { id: 'ent-training', codigo: 'ENT-003', nombre: 'Ruta de certificacion operativa', tipo_entidad: 'programa', categoria: 'Formacion', departamento: 'RECURSOS HUMANOS', centro_costo: 'ZIII-CUN', responsable_proveedor_id: 'resp-talento', activo: true, created_at: isoDateTime(year, 1, 7) },
    { id: 'ent-ayb', codigo: 'ENT-004', nombre: 'Linea caliente y estaciones de servicio', tipo_entidad: 'operacion', categoria: 'AyB', departamento: 'ALIMENTOS Y BEBIDAS', centro_costo: 'ZIII-MTY', responsable_proveedor_id: 'resp-ayb', activo: true, created_at: isoDateTime(year, 1, 8) },
  ]

  const plans: PlanningDemoPlan[] = [
    {
      id: 'plan-network', codigo_plan: `IT-${year}-01`, nombre: 'Renovacion anual de red y wifi corporativo', descripcion: 'Programa anual para capacidad, cobertura y continuidad operativa en propiedad.', departamento_dueno: 'SISTEMAS', centro_costo: 'ZIII-CUN', moneda: 'MXN', entidad_objetivo_id: 'ent-network', responsable_proveedor_id: 'resp-vector', fecha_inicio: isoDate(year, 1, 10), fecha_fin: isoDate(year, 12, 15), frecuencia_tipo: 'monthly', frecuencia_intervalo: 1, custom_interval_days: null, dia_semana: null, dia_del_mes: 12, monto_total_planeado: 480000, esfuerzo_total_planeado: 240, estado: 'activo', created_at: isoDateTime(year, 1, 10), entidad: { nombre: 'Core de red y puntos de acceso' }, responsable: { nombre: 'Vector Networks' },
    },
    {
      id: 'plan-chiller', codigo_plan: `MANT-${year}-02`, nombre: 'Programa preventivo de chillers y bombas', descripcion: 'Ruta de mantenimiento trimestral con foco en disponibilidad y consumo energetico.', departamento_dueno: 'MANTENIMIENTO', centro_costo: 'ZIII-CAB', moneda: 'MXN', entidad_objetivo_id: 'ent-chiller', responsable_proveedor_id: 'resp-frio', fecha_inicio: isoDate(year, 1, 8), fecha_fin: isoDate(year, 12, 20), frecuencia_tipo: 'quarterly', frecuencia_intervalo: 1, custom_interval_days: null, dia_semana: null, dia_del_mes: 8, monto_total_planeado: 920000, esfuerzo_total_planeado: 360, estado: 'activo', created_at: isoDateTime(year, 1, 8), entidad: { nombre: 'Chillers y bombas primarias' }, responsable: { nombre: 'Frio Industrial del Pacifico' },
    },
    {
      id: 'plan-training', codigo_plan: `RH-${year}-03`, nombre: 'Capacitacion y certificacion operativa', descripcion: 'Calendario semestral para certificacion de jefaturas y personal critico.', departamento_dueno: 'RECURSOS HUMANOS', centro_costo: 'ZIII-CUN', moneda: 'MXN', entidad_objetivo_id: 'ent-training', responsable_proveedor_id: 'resp-talento', fecha_inicio: isoDate(year, 2, 1), fecha_fin: isoDate(year, 11, 30), frecuencia_tipo: 'monthly', frecuencia_intervalo: 2, custom_interval_days: null, dia_semana: null, dia_del_mes: 5, monto_total_planeado: 260000, esfuerzo_total_planeado: 180, estado: 'pausado', created_at: isoDateTime(year, 2, 1), entidad: { nombre: 'Ruta de certificacion operativa' }, responsable: { nombre: 'Talento ZIII' },
    },
    {
      id: 'plan-ayb', codigo_plan: `AYB-${year}-04`, nombre: 'Estandarizacion sanitaria de linea caliente', descripcion: 'Seguimiento operativo para estaciones de servicio, inocuidad y cierre de hallazgos.', departamento_dueno: 'ALIMENTOS Y BEBIDAS', centro_costo: 'ZIII-MTY', moneda: 'MXN', entidad_objetivo_id: 'ent-ayb', responsable_proveedor_id: 'resp-ayb', fecha_inicio: isoDate(year, 1, 15), fecha_fin: isoDate(year, 11, 20), frecuencia_tipo: 'monthly', frecuencia_intervalo: 2, custom_interval_days: null, dia_semana: null, dia_del_mes: 20, monto_total_planeado: 340000, esfuerzo_total_planeado: 150, estado: 'activo', created_at: isoDateTime(year, 1, 15), entidad: { nombre: 'Linea caliente y estaciones de servicio' }, responsable: { nombre: 'Calidad AyB Norte' },
    },
  ]

  const agendas: OpsAgendaItem[] = [
    { id: 'agenda-network-1', plan_maestro_id: 'plan-network', ocurrencia_nro: 1, due_date: isoDate(year, 4, 12), monto_estimado: 120000, esfuerzo_estimado: 42, estado: 'en_proceso', prioridad: 'alta', notas: 'Cambio de access points en lobby y salones.', created_at: isoDateTime(year, 3, 28) },
    { id: 'agenda-network-2', plan_maestro_id: 'plan-network', ocurrencia_nro: 2, due_date: isoDate(year, 5, 10), monto_estimado: 110000, esfuerzo_estimado: 38, estado: 'pendiente', prioridad: 'media', notas: 'Ajuste de backbone y redundancia.', created_at: isoDateTime(year, 4, 10) },
    { id: 'agenda-network-3', plan_maestro_id: 'plan-network', ocurrencia_nro: 3, due_date: isoDate(year, 6, 14), monto_estimado: 125000, esfuerzo_estimado: 40, estado: 'pendiente', prioridad: 'alta', notas: 'Pruebas de capacidad para temporada alta.', created_at: isoDateTime(year, 5, 14) },
    { id: 'agenda-network-4', plan_maestro_id: 'plan-network', ocurrencia_nro: 4, due_date: isoDate(year, 9, 15), monto_estimado: 125000, esfuerzo_estimado: 40, estado: 'pendiente', prioridad: 'media', notas: 'Renovacion de switches de borde.', created_at: isoDateTime(year, 8, 18) },
    { id: 'agenda-chiller-1', plan_maestro_id: 'plan-chiller', ocurrencia_nro: 1, due_date: isoDate(year, 4, 8), monto_estimado: 260000, esfuerzo_estimado: 90, estado: 'pendiente', prioridad: 'critica', notas: 'Servicio mayor con riesgo de disponibilidad.', created_at: isoDateTime(year, 3, 25) },
    { id: 'agenda-chiller-2', plan_maestro_id: 'plan-chiller', ocurrencia_nro: 2, due_date: isoDate(year, 7, 10), monto_estimado: 220000, esfuerzo_estimado: 88, estado: 'pendiente', prioridad: 'alta', notas: 'Ajustes de carga y revision de bombas.', created_at: isoDateTime(year, 6, 20) },
    { id: 'agenda-chiller-3', plan_maestro_id: 'plan-chiller', ocurrencia_nro: 3, due_date: isoDate(year, 10, 10), monto_estimado: 240000, esfuerzo_estimado: 92, estado: 'pendiente', prioridad: 'alta', notas: 'Calibracion para cierre anual.', created_at: isoDateTime(year, 9, 20) },
    { id: 'agenda-training-1', plan_maestro_id: 'plan-training', ocurrencia_nro: 1, due_date: isoDate(year, 5, 5), monto_estimado: 90000, esfuerzo_estimado: 36, estado: 'pendiente', prioridad: 'media', notas: 'Certificacion de mandos medios.', created_at: isoDateTime(year, 4, 16) },
    { id: 'agenda-training-2', plan_maestro_id: 'plan-training', ocurrencia_nro: 2, due_date: isoDate(year, 8, 5), monto_estimado: 85000, esfuerzo_estimado: 30, estado: 'cancelado', prioridad: 'baja', notas: 'Se movio al siguiente trimestre.', created_at: isoDateTime(year, 7, 10) },
    { id: 'agenda-ayb-1', plan_maestro_id: 'plan-ayb', ocurrencia_nro: 1, due_date: isoDate(year, 4, 20), monto_estimado: 78000, esfuerzo_estimado: 24, estado: 'pendiente', prioridad: 'media', notas: 'Checklist de inocuidad y linea caliente.', created_at: isoDateTime(year, 4, 2) },
    { id: 'agenda-ayb-2', plan_maestro_id: 'plan-ayb', ocurrencia_nro: 2, due_date: isoDate(year, 6, 20), monto_estimado: 86000, esfuerzo_estimado: 28, estado: 'en_proceso', prioridad: 'alta', notas: 'Cierre de hallazgos de auditoria sanitaria.', created_at: isoDateTime(year, 5, 28) },
    { id: 'agenda-ayb-3', plan_maestro_id: 'plan-ayb', ocurrencia_nro: 3, due_date: isoDate(year, 8, 20), monto_estimado: 88000, esfuerzo_estimado: 30, estado: 'pendiente', prioridad: 'media', notas: 'Seguimiento de estaciones criticas.', created_at: isoDateTime(year, 8, 1) },
    { id: 'agenda-ayb-4', plan_maestro_id: 'plan-ayb', ocurrencia_nro: 4, due_date: isoDate(year, 11, 20), monto_estimado: 88000, esfuerzo_estimado: 30, estado: 'pendiente', prioridad: 'media', notas: 'Cierre operativo del anio.', created_at: isoDateTime(year, 10, 28) },
  ]

  const planById = new Map(plans.map((plan) => [plan.id, plan]))
  const entidadById = new Map(entidades.map((entity) => [entity.id, entity]))

  const calendar = agendas
    .map((agenda) => {
      const plan = planById.get(agenda.plan_maestro_id)
      if (!plan) return null
      const entity = entidadById.get(plan.entidad_objetivo_id)
      return {
        agenda_id: agenda.id,
        plan_maestro_id: plan.id,
        plan_nombre: plan.nombre,
        departamento_dueno: plan.departamento_dueno,
        centro_costo: plan.centro_costo,
        entidad_objetivo: entity?.nombre ?? 'Entidad demo',
        entidad_categoria: entity?.categoria ?? 'General',
        ocurrencia_nro: agenda.ocurrencia_nro,
        due_date: agenda.due_date,
        estado: agenda.estado,
        prioridad: agenda.prioridad,
        monto_estimado: agenda.monto_estimado,
        esfuerzo_estimado: agenda.esfuerzo_estimado,
        aging_days: daysOverdue(agenda.due_date),
        semaforo: agenda.estado === 'completado' ? 'GREEN' : agenda.prioridad === 'critica' ? 'RED' : agenda.prioridad === 'alta' ? 'YELLOW' : 'GREEN',
      } satisfies OpsCalendarItem
    })
    .filter((item): item is OpsCalendarItem => Boolean(item))
    .sort((left, right) => left.due_date.localeCompare(right.due_date, 'es-MX'))

  const compliance: OpsComplianceItem[] = [
    { agenda_id: 'agenda-chiller-1', plan_id: 'plan-chiller', plan_nombre: 'Programa preventivo de chillers y bombas', departamento: 'MANTENIMIENTO', centro_costo: 'ZIII-CAB', entidad_objetivo: 'Chillers y bombas primarias', due_date: isoDate(year, 4, 8), estado: 'pendiente', aging_days: daysOverdue(isoDate(year, 4, 8)), alert_flag: 'RED', alert_label: 'CRITICAL_BREACH', impacto_financiero: 180000, monto_estimado: 260000, monto_real_acumulado: 0, compliance_breached: true },
    { agenda_id: 'agenda-network-1', plan_id: 'plan-network', plan_nombre: 'Renovacion anual de red y wifi corporativo', departamento: 'SISTEMAS', centro_costo: 'ZIII-CUN', entidad_objetivo: 'Core de red y puntos de acceso', due_date: isoDate(year, 4, 12), estado: 'en_proceso', aging_days: daysOverdue(isoDate(year, 4, 12)), alert_flag: 'YELLOW', alert_label: 'WARNING_OPERATIVO', impacto_financiero: 85000, monto_estimado: 120000, monto_real_acumulado: 46000, compliance_breached: false },
    { agenda_id: 'agenda-ayb-1', plan_id: 'plan-ayb', plan_nombre: 'Estandarizacion sanitaria de linea caliente', departamento: 'ALIMENTOS Y BEBIDAS', centro_costo: 'ZIII-MTY', entidad_objetivo: 'Linea caliente y estaciones de servicio', due_date: isoDate(year, 4, 20), estado: 'pendiente', aging_days: daysOverdue(isoDate(year, 4, 20)), alert_flag: 'GREEN', alert_label: 'ON_TRACK', impacto_financiero: 18000, monto_estimado: 78000, monto_real_acumulado: 0, compliance_breached: false },
  ]

  const financial: OpsFinancialItem[] = [
    { plan_id: 'plan-network', plan_nombre: 'Renovacion anual de red y wifi corporativo', departamento_dueno: 'SISTEMAS', centro_costo: 'ZIII-CUN', moneda: 'MXN', monto_total_planeado: 480000, monto_real_total: 462000, variacion_abs: -18000, variacion_pct: -3.75, esfuerzo_total_planeado: 240, esfuerzo_real_total: 218 },
    { plan_id: 'plan-chiller', plan_nombre: 'Programa preventivo de chillers y bombas', departamento_dueno: 'MANTENIMIENTO', centro_costo: 'ZIII-CAB', moneda: 'MXN', monto_total_planeado: 920000, monto_real_total: 280000, variacion_abs: -640000, variacion_pct: -69.57, esfuerzo_total_planeado: 360, esfuerzo_real_total: 104 },
    { plan_id: 'plan-training', plan_nombre: 'Capacitacion y certificacion operativa', departamento_dueno: 'RECURSOS HUMANOS', centro_costo: 'ZIII-CUN', moneda: 'MXN', monto_total_planeado: 260000, monto_real_total: 96000, variacion_abs: -164000, variacion_pct: -63.07, esfuerzo_total_planeado: 180, esfuerzo_real_total: 62 },
    { plan_id: 'plan-ayb', plan_nombre: 'Estandarizacion sanitaria de linea caliente', departamento_dueno: 'ALIMENTOS Y BEBIDAS', centro_costo: 'ZIII-MTY', moneda: 'MXN', monto_total_planeado: 340000, monto_real_total: 164000, variacion_abs: -176000, variacion_pct: -51.76, esfuerzo_total_planeado: 150, esfuerzo_real_total: 52 },
  ]

  const agendasByPlanId = agendas.reduce<Record<string, OpsAgendaItem[]>>((acc, item) => {
    if (!acc[item.plan_maestro_id]) {
      acc[item.plan_maestro_id] = []
    }
    acc[item.plan_maestro_id].push(item)
    return acc
  }, {})

  return {
    locations,
    portfolio: { plans, calendar, compliance, financial },
    agendasByPlanId,
    responsables,
    entidades,
  }
}