import type { SupabaseClient } from '@supabase/supabase-js'

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
