import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { canManageOpsDepartment, requireOpsUser } from '@/lib/ops/auth'
import { createPlan, deletePlan, getPlanById, listPlanes, updatePlan, updatePlanEstado } from '@/lib/ops/service'

function parseNumericInput(value: unknown, fallback = 0) {
  if (value === undefined) return undefined
  if (value === null || value === '') return fallback
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback

  if (typeof value === 'string') {
    const normalized = value.replace(/\s+/g, '').replace(/,/g, '')
    if (!normalized) return fallback
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  return fallback
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireOpsUser(supabase)
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

    const data = await listPlanes(supabase)
    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message ?? error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireOpsUser(supabase)
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    if (!auth.canManage) return NextResponse.json({ ok: false, error: 'Sin permisos de gestión' }, { status: 403 })

    const body = await request.json()
    const payload = {
      ...(typeof body.codigo_plan === 'string' ? { codigo_plan: body.codigo_plan.trim() || undefined } : {}),
      nombre: typeof body.nombre === 'string' ? body.nombre.trim() : '',
      ...(body.descripcion !== undefined ? { descripcion: typeof body.descripcion === 'string' ? body.descripcion.trim() || undefined : undefined } : {}),
      departamento_dueno: typeof body.departamento_dueno === 'string' ? body.departamento_dueno.trim() : '',
      ...(body.centro_costo !== undefined ? { centro_costo: typeof body.centro_costo === 'string' ? body.centro_costo.trim() || undefined : undefined } : {}),
      moneda: typeof body.moneda === 'string' ? body.moneda.trim() || 'MXN' : 'MXN',
      entidad_objetivo_id: typeof body.entidad_objetivo_id === 'string' ? body.entidad_objetivo_id : '',
      ...(body.responsable_proveedor_id !== undefined ? { responsable_proveedor_id: body.responsable_proveedor_id || undefined } : {}),
      fecha_inicio: typeof body.fecha_inicio === 'string' ? body.fecha_inicio : '',
      fecha_fin: typeof body.fecha_fin === 'string' ? body.fecha_fin : '',
      frecuencia_tipo: typeof body.frecuencia_tipo === 'string' ? body.frecuencia_tipo : 'monthly',
      frecuencia_intervalo: parseNumericInput(body.frecuencia_intervalo, 1) ?? 1,
      ...(body.custom_interval_days !== undefined ? { custom_interval_days: body.custom_interval_days ? parseNumericInput(body.custom_interval_days, 0) : undefined } : {}),
      ...(body.dia_semana !== undefined ? { dia_semana: body.dia_semana === '' || body.dia_semana === null ? undefined : parseNumericInput(body.dia_semana, 0) } : {}),
      ...(body.dia_del_mes !== undefined ? { dia_del_mes: body.dia_del_mes === '' || body.dia_del_mes === null ? undefined : parseNumericInput(body.dia_del_mes, 0) } : {}),
      monto_total_planeado: parseNumericInput(body.monto_total_planeado, 0) ?? 0,
      esfuerzo_total_planeado: parseNumericInput(body.esfuerzo_total_planeado, 0) ?? 0,
    }

    if (!payload.nombre) {
      return NextResponse.json({ ok: false, error: 'nombre requerido' }, { status: 400 })
    }

    if (!payload.departamento_dueno) {
      return NextResponse.json({ ok: false, error: 'departamento_dueno requerido' }, { status: 400 })
    }

    if (!payload.entidad_objetivo_id) {
      return NextResponse.json({ ok: false, error: 'entidad_objetivo_id requerido' }, { status: 400 })
    }

    if (!payload.fecha_inicio || !payload.fecha_fin) {
      return NextResponse.json({ ok: false, error: 'fecha_inicio y fecha_fin son requeridas' }, { status: 400 })
    }

    const data = await createPlan(supabase, payload)
    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message ?? error) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireOpsUser(supabase)
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    if (!auth.canManage) return NextResponse.json({ ok: false, error: 'Sin permisos de gestión' }, { status: 403 })

    const body = await request.json()
    const { id, estado, ...rest } = body ?? {}
    if (!id) return NextResponse.json({ ok: false, error: 'id requerido' }, { status: 400 })

    const current = await getPlanById(supabase, id)
    const targetDepartment = typeof rest?.departamento_dueno === 'string' ? rest.departamento_dueno : current.departamento_dueno

    if (!canManageOpsDepartment(auth.profile, current.departamento_dueno) || !canManageOpsDepartment(auth.profile, targetDepartment)) {
      return NextResponse.json({ ok: false, error: 'Sin permisos sobre el departamento del plan' }, { status: 403 })
    }

    const hasFullUpdate = Object.keys(rest).length > 0

    if (!hasFullUpdate) {
      if (!estado) return NextResponse.json({ ok: false, error: 'estado requerido' }, { status: 400 })
      await updatePlanEstado(supabase, id, estado)
      return NextResponse.json({ ok: true })
    }

    const updates = {
      ...(typeof body.codigo_plan === 'string' ? { codigo_plan: body.codigo_plan.trim() || null } : {}),
      ...(typeof body.nombre === 'string' ? { nombre: body.nombre.trim() } : {}),
      ...(body.descripcion !== undefined ? { descripcion: typeof body.descripcion === 'string' ? body.descripcion.trim() || null : null } : {}),
      ...(typeof body.departamento_dueno === 'string' ? { departamento_dueno: body.departamento_dueno.trim() } : {}),
      ...(body.centro_costo !== undefined ? { centro_costo: typeof body.centro_costo === 'string' ? body.centro_costo.trim() || null : null } : {}),
      ...(typeof body.moneda === 'string' ? { moneda: body.moneda.trim() || 'MXN' } : {}),
      ...(body.entidad_objetivo_id !== undefined ? { entidad_objetivo_id: body.entidad_objetivo_id || null } : {}),
      ...(body.responsable_proveedor_id !== undefined ? { responsable_proveedor_id: body.responsable_proveedor_id || null } : {}),
      ...(typeof body.fecha_inicio === 'string' ? { fecha_inicio: body.fecha_inicio } : {}),
      ...(typeof body.fecha_fin === 'string' ? { fecha_fin: body.fecha_fin } : {}),
      ...(typeof body.frecuencia_tipo === 'string' ? { frecuencia_tipo: body.frecuencia_tipo } : {}),
      ...(body.frecuencia_intervalo !== undefined ? { frecuencia_intervalo: parseNumericInput(body.frecuencia_intervalo, 1) } : {}),
      ...(body.custom_interval_days !== undefined ? { custom_interval_days: body.custom_interval_days ? parseNumericInput(body.custom_interval_days, 0) : null } : {}),
      ...(body.dia_semana !== undefined ? { dia_semana: body.dia_semana === '' || body.dia_semana === null ? null : parseNumericInput(body.dia_semana, 0) } : {}),
      ...(body.dia_del_mes !== undefined ? { dia_del_mes: body.dia_del_mes === '' || body.dia_del_mes === null ? null : parseNumericInput(body.dia_del_mes, 0) } : {}),
      ...(body.monto_total_planeado !== undefined ? { monto_total_planeado: parseNumericInput(body.monto_total_planeado, 0) } : {}),
      ...(body.esfuerzo_total_planeado !== undefined ? { esfuerzo_total_planeado: parseNumericInput(body.esfuerzo_total_planeado, 0) } : {}),
      ...(typeof body.estado === 'string' ? { estado: body.estado } : {}),
    }

    if (!updates.nombre) {
      return NextResponse.json({ ok: false, error: 'nombre requerido' }, { status: 400 })
    }

    await updatePlan(supabase, id, updates)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message ?? error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireOpsUser(supabase)
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    if (!auth.canManage) return NextResponse.json({ ok: false, error: 'Sin permisos de gestión' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ ok: false, error: 'id requerido' }, { status: 400 })

    await deletePlan(supabase, id)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message ?? error) }, { status: 500 })
  }
}
