import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireOpsUser } from '@/lib/ops/auth'
import { seedPlanAgenda } from '@/lib/ops/service'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireOpsUser(supabase)

    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }

    if (!auth.canManage) {
      return NextResponse.json(
        { ok: false, error: 'Solo admin o supervisor corporativo pueden sembrar agenda.' },
        { status: 403 },
      )
    }

    const { id: planId } = await context.params
    const body = await request.json().catch(() => ({}))
    const replaceExisting = body?.replaceExisting === true

    const result = await seedPlanAgenda(supabase, planId, replaceExisting)

    return NextResponse.json({ ok: true, result })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message ?? error) }, { status: 500 })
  }
}
