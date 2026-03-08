import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireOpsUser } from '@/lib/ops/auth'
import { createEntidad, createPlan, seedPlanAgenda } from '@/lib/ops/service'

/**
 * POST /api/ops/actividades
 * Crea una actividad programada simplificada:
 *   1. Busca o crea la entidad objetivo (área/equipo)
 *   2. Crea el plan maestro
 *   3. Genera la agenda de ocurrencias via fn_seed_plan_agenda
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireOpsUser(supabase)
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    if (!auth.canManage) return NextResponse.json({ ok: false, error: 'Sin permisos de gestión' }, { status: 403 })

    const body = await request.json()
    const { tipo, titulo, descripcion, departamento, area, fecha, frecuencia, repite } = body

    if (!titulo || !fecha || !departamento) {
      return NextResponse.json({ ok: false, error: 'titulo, fecha y departamento son requeridos' }, { status: 400 })
    }

    // 1. Buscar o crear entidad objetivo
    const areaName: string = (area as string)?.trim() || (titulo as string).substring(0, 60)

    const { data: existing } = await supabase
      .schema('ops')
      .from('entidades_objetivo')
      .select('id')
      .eq('nombre', areaName)
      .eq('departamento', departamento)
      .maybeSingle()

    let entidadId: string
    if (existing?.id) {
      entidadId = existing.id as string
    } else {
      const entidad = await createEntidad(supabase, {
        nombre: areaName,
        tipo_entidad: tipo ?? 'actividad',
        categoria: tipo ?? 'actividad',
        departamento,
      })
      entidadId = entidad.id
    }

    // 2. Crear plan maestro
    const yearStr = (fecha as string).substring(0, 4)
    const frecuenciaTipo: string = repite ? (frecuencia ?? 'monthly') : 'monthly'
    const plan = await createPlan(supabase, {
      nombre: titulo,
      descripcion: descripcion || undefined,
      departamento_dueno: departamento,
      moneda: 'MXN',
      entidad_objetivo_id: entidadId,
      fecha_inicio: fecha,
      fecha_fin: `${yearStr}-12-31`,
      frecuencia_tipo: frecuenciaTipo,
      frecuencia_intervalo: 1,
      monto_total_planeado: 0,
      esfuerzo_total_planeado: 0,
    })

    // 3. Generar agenda (best effort — si falla, el plan igual queda creado)
    try {
      await seedPlanAgenda(supabase, plan.id, false)
    } catch (_) {
      // fn_seed_plan_agenda puede no existir en todos los entornos
      // Crear la primera ocurrencia manualmente como fallback
      await supabase
        .schema('ops')
        .from('agenda_operativa')
        .insert({
          plan_maestro_id: plan.id,
          ocurrencia_nro: 1,
          due_date: fecha,
          monto_estimado: 0,
          esfuerzo_estimado: 0,
          estado: 'pendiente',
          prioridad: 'media',
        })
    }

    return NextResponse.json({ ok: true, plan_id: plan.id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: String(error?.message ?? error) },
      { status: 500 },
    )
  }
}
