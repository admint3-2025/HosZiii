import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getComplianceAging } from '@/lib/ops/service'
import { requireOpsUser } from '@/lib/ops/auth'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireOpsUser(supabase)

    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)

    const data = await getComplianceAging(supabase, {
      asOfDate: searchParams.get('as_of_date'),
      departamento: searchParams.get('departamento'),
      centroCosto: searchParams.get('centro_costo'),
    })

    const totals = {
      open_items: data.length,
      yellow_items: data.filter((x) => x.alert_flag === 'YELLOW').length,
      red_items: data.filter((x) => x.alert_flag === 'RED').length,
      total_financial_impact: data.reduce((sum, x) => sum + Number(x.impacto_financiero || 0), 0),
    }

    return NextResponse.json({ ok: true, totals, data })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message ?? error) }, { status: 500 })
  }
}
