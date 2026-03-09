import type { SupabaseClient } from '@supabase/supabase-js'

// ── Tipos de catálogos ────────────────────────────────────────────────
export type OpsResponsable = {
  id: string
  codigo: string | null
  nombre: string
  tipo: 'interno' | 'externo'
  departamento: string | null
  email: string | null
  telefono: string | null
  activo: boolean
  created_at: string
}

export type OpsEntidad = {
  id: string
  codigo: string | null
  nombre: string
  tipo_entidad: string
  categoria: string
  departamento: string
  centro_costo: string | null
  responsable_proveedor_id: string | null
  activo: boolean
  created_at: string
}

export type OpsPlan = {
  id: string
  codigo_plan: string | null
  nombre: string
  descripcion: string | null
  departamento_dueno: string
  centro_costo: string | null
  moneda: string
  entidad_objetivo_id: string
  responsable_proveedor_id: string | null
  fecha_inicio: string
  fecha_fin: string
  frecuencia_tipo: string
  frecuencia_intervalo: number
  custom_interval_days: number | null
  dia_semana: number | null
  dia_del_mes: number | null
  monto_total_planeado: number
  esfuerzo_total_planeado: number
  estado: 'activo' | 'pausado' | 'cerrado'
  created_at: string
}

export type OpsAgendaItem = {
  id: string
  plan_maestro_id: string
  ocurrencia_nro: number
  due_date: string
  monto_estimado: number
  esfuerzo_estimado: number
  estado: 'pendiente' | 'en_proceso' | 'completado' | 'cancelado'
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  notas: string | null
  created_at: string
}

// ── Tipos de vistas ───────────────────────────────────────────────────
export type OpsCalendarItem = {
  agenda_id: string
  plan_maestro_id: string
  plan_nombre: string
  departamento_dueno: string
  centro_costo: string | null
  entidad_objetivo: string
  entidad_categoria: string
  ocurrencia_nro: number
  due_date: string
  estado: 'pendiente' | 'en_proceso' | 'completado' | 'cancelado'
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  monto_estimado: number
  esfuerzo_estimado: number
  aging_days: number
  semaforo: 'GREEN' | 'YELLOW' | 'RED'
}

export type OpsComplianceItem = {
  agenda_id: string
  plan_id: string
  plan_nombre: string
  departamento: string
  centro_costo: string | null
  entidad_objetivo: string
  due_date: string
  estado: string
  aging_days: number
  alert_flag: 'GREEN' | 'YELLOW' | 'RED'
  alert_label: 'ON_TRACK' | 'WARNING_OPERATIVO' | 'CRITICAL_BREACH'
  impacto_financiero: number
  monto_estimado: number
  monto_real_acumulado: number
  compliance_breached: boolean
}

export type OpsFinancialItem = {
  plan_id: string
  plan_nombre: string
  departamento_dueno: string
  centro_costo: string | null
  moneda: string
  monto_total_planeado: number
  monto_real_total: number
  variacion_abs: number
  variacion_pct: number
  esfuerzo_total_planeado: number
  esfuerzo_real_total: number
}

export async function seedPlanAgenda(
  supabase: SupabaseClient,
  planId: string,
  replaceExisting = false,
) {
  const { data, error } = await supabase
    .schema('ops')
    .rpc('fn_seed_plan_agenda', {
      p_plan_id: planId,
      p_replace_existing: replaceExisting,
    })

  if (error) throw error
  return data
}

export async function getComplianceAging(
  supabase: SupabaseClient,
  params: {
    asOfDate?: string | null
    departamento?: string | null
    centroCosto?: string | null
  },
) {
  const { data, error } = await supabase
    .schema('ops')
    .rpc('fn_aging_compliance', {
      p_as_of_date: params.asOfDate ?? null,
      p_departamento: params.departamento ?? null,
      p_centro_costo: params.centroCosto ?? null,
    })

  if (error) throw error
  return (data ?? []) as OpsComplianceItem[]
}

export async function getOperationalCalendar(
  supabase: SupabaseClient,
  params: {
    from?: string | null
    to?: string | null
    departamento?: string | null
    centroCosto?: string | null
    estado?: string | null
    limit?: number
  },
) {
  let query = supabase
    .schema('ops')
    .from('vw_operativa_calendario')
    .select('*')
    .order('due_date', { ascending: true })

  if (params.from) query = query.gte('due_date', params.from)
  if (params.to) query = query.lte('due_date', params.to)
  if (params.departamento) query = query.eq('departamento_dueno', params.departamento)
  if (params.centroCosto) query = query.eq('centro_costo', params.centroCosto)
  if (params.estado) query = query.eq('estado', params.estado)

  query = query.limit(params.limit ?? 500)

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as OpsCalendarItem[]
}

export async function getFinancialControl(
  supabase: SupabaseClient,
  params: {
    departamento?: string | null
    centroCosto?: string | null
  },
) {
  let query = supabase
    .schema('ops')
    .from('vw_financiera_control')
    .select('*')
    .order('variacion_abs', { ascending: false })

  if (params.departamento) query = query.eq('departamento_dueno', params.departamento)
  if (params.centroCosto) query = query.eq('centro_costo', params.centroCosto)

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as OpsFinancialItem[]
}

// ═══════════════════════════════════════════════════════════════════════
// CRUD — Responsables / Proveedores
// ═══════════════════════════════════════════════════════════════════════

export async function listResponsables(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .schema('ops')
    .from('responsables_proveedores')
    .select('*')
    .order('nombre')
  if (error) throw error
  return (data ?? []) as OpsResponsable[]
}

export async function createResponsable(
  supabase: SupabaseClient,
  input: { codigo?: string; nombre: string; tipo: 'interno' | 'externo'; departamento?: string; email?: string; telefono?: string },
) {
  const { data, error } = await supabase
    .schema('ops')
    .from('responsables_proveedores')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as OpsResponsable
}

export async function updateResponsable(
  supabase: SupabaseClient,
  id: string,
  input: Partial<Pick<OpsResponsable, 'codigo' | 'nombre' | 'tipo' | 'departamento' | 'email' | 'telefono' | 'activo'>>,
) {
  const { data, error } = await supabase
    .schema('ops')
    .from('responsables_proveedores')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as OpsResponsable
}

export async function deleteResponsable(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.schema('ops').from('responsables_proveedores').delete().eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════════════════
// CRUD — Entidades Objetivo
// ═══════════════════════════════════════════════════════════════════════

export async function listEntidades(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .schema('ops')
    .from('entidades_objetivo')
    .select('*, responsable:responsables_proveedores(nombre)')
    .order('nombre')
  if (error) throw error
  return (data ?? []) as (OpsEntidad & { responsable: { nombre: string } | null })[]
}

export async function createEntidad(
  supabase: SupabaseClient,
  input: {
    codigo?: string
    nombre: string
    tipo_entidad: string
    categoria: string
    departamento: string
    centro_costo?: string
    responsable_proveedor_id?: string
  },
) {
  const { data, error } = await supabase
    .schema('ops')
    .from('entidades_objetivo')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as OpsEntidad
}

export async function updateEntidad(
  supabase: SupabaseClient,
  id: string,
  input: Partial<Pick<OpsEntidad, 'codigo' | 'nombre' | 'tipo_entidad' | 'categoria' | 'departamento' | 'centro_costo' | 'responsable_proveedor_id' | 'activo'>>,
) {
  const { data, error } = await supabase
    .schema('ops')
    .from('entidades_objetivo')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as OpsEntidad
}

export async function deleteEntidad(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.schema('ops').from('entidades_objetivo').delete().eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════════════════
// CRUD — Planes Maestros
// ═══════════════════════════════════════════════════════════════════════

export async function listPlanes(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .schema('ops')
    .from('planes_maestros')
    .select('*, entidad:entidades_objetivo(nombre), responsable:responsables_proveedores(nombre)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as (OpsPlan & { entidad: { nombre: string } | null; responsable: { nombre: string } | null })[]
}

export async function createPlan(
  supabase: SupabaseClient,
  input: {
    codigo_plan?: string
    nombre: string
    descripcion?: string
    departamento_dueno: string
    centro_costo?: string
    moneda?: string
    entidad_objetivo_id: string
    responsable_proveedor_id?: string
    fecha_inicio: string
    fecha_fin: string
    frecuencia_tipo: string
    frecuencia_intervalo?: number
    custom_interval_days?: number
    dia_semana?: number
    dia_del_mes?: number
    monto_total_planeado?: number
    esfuerzo_total_planeado?: number
  },
) {
  const { data, error } = await supabase
    .schema('ops')
    .from('planes_maestros')
    .insert({
      ...input,
      frecuencia_intervalo: input.frecuencia_intervalo ?? 1,
      monto_total_planeado: input.monto_total_planeado ?? 0,
      esfuerzo_total_planeado: input.esfuerzo_total_planeado ?? 0,
    })
    .select()
    .single()
  if (error) throw error
  return data as OpsPlan
}

export async function getPlanById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .schema('ops')
    .from('planes_maestros')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as OpsPlan
}

export async function updatePlan(
  supabase: SupabaseClient,
  id: string,
  input: Partial<
    Pick<
      OpsPlan,
      | 'codigo_plan'
      | 'nombre'
      | 'descripcion'
      | 'departamento_dueno'
      | 'centro_costo'
      | 'moneda'
      | 'entidad_objetivo_id'
      | 'responsable_proveedor_id'
      | 'fecha_inicio'
      | 'fecha_fin'
      | 'frecuencia_tipo'
      | 'frecuencia_intervalo'
      | 'custom_interval_days'
      | 'dia_semana'
      | 'dia_del_mes'
      | 'monto_total_planeado'
      | 'esfuerzo_total_planeado'
      | 'estado'
    >
  >,
) {
  const { error } = await supabase.schema('ops').from('planes_maestros').update(input).eq('id', id)
  if (error) throw error
}

export async function updatePlanEstado(supabase: SupabaseClient, id: string, estado: 'activo' | 'pausado' | 'cerrado') {
  const { error } = await supabase.schema('ops').from('planes_maestros').update({ estado }).eq('id', id)
  if (error) throw error
}

export async function deletePlan(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.schema('ops').from('planes_maestros').delete().eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════════════════
// Agenda — Lectura y actualización de estado
// ═══════════════════════════════════════════════════════════════════════

export async function listAgendaByPlan(supabase: SupabaseClient, planId: string) {
  const { data, error } = await supabase
    .schema('ops')
    .from('agenda_operativa')
    .select('*')
    .eq('plan_maestro_id', planId)
    .order('due_date')
  if (error) throw error
  return (data ?? []) as OpsAgendaItem[]
}

export async function updateAgendaEstado(
  supabase: SupabaseClient,
  id: string,
  estado: 'pendiente' | 'en_proceso' | 'completado' | 'cancelado',
) {
  const { error } = await supabase.schema('ops').from('agenda_operativa').update({ estado }).eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════════════════
// Ejecución — Registrar ejecución real contra un ítem de agenda
// ═══════════════════════════════════════════════════════════════════════

export async function createEjecucion(
  supabase: SupabaseClient,
  input: {
    agenda_operativa_id: string
    fecha_ejecucion_real: string
    monto_real: number
    esfuerzo_real?: number
    evidencia_url?: string
    referencia_factura?: string
    notas?: string
    created_by?: string
  },
) {
  const { data, error } = await supabase
    .schema('ops')
    .from('ejecucion_operativa')
    .insert({
      ...input,
      esfuerzo_real: input.esfuerzo_real ?? 0,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
