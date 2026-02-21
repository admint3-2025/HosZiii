import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireOpsUser } from '@/lib/ops/auth'
import { listAgendaByPlan, updateAgendaEstado } from '@/lib/ops/service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireOpsUser(supabase)
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('plan_id')
    if (!planId) return NextResponse.json({ ok: false, error: 'plan_id requerido' }, { status: 400 })

    const data = await listAgendaByPlan(supabase, planId)
    return NextResponse.json({ ok: true, data })
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

    const { id, estado } = await request.json()
    if (!id || !estado) return NextResponse.json({ ok: false, error: 'id y estado requeridos' }, { status: 400 })

    await updateAgendaEstado(supabase, id, estado)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message ?? error) }, { status: 500 })
  }
}
