import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getFinancialControl } from '@/lib/ops/service'
import { requireOpsUser } from '@/lib/ops/auth'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireOpsUser(supabase)

    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)

    const data = await getFinancialControl(supabase, {
      departamento: searchParams.get('departamento'),
      centroCosto: searchParams.get('centro_costo'),
    })

    const totals = {
      approved_total: data.reduce((sum, x) => sum + Number(x.monto_total_planeado || 0), 0),
      spent_total: data.reduce((sum, x) => sum + Number(x.monto_real_total || 0), 0),
      variance_total: data.reduce((sum, x) => sum + Number(x.variacion_abs || 0), 0),
    }

    return NextResponse.json({ ok: true, totals, count: data.length, data })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message ?? error) }, { status: 500 })
  }
}
