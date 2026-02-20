import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getOperationalCalendar } from '@/lib/ops/service'
import { requireOpsUser } from '@/lib/ops/auth'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireOpsUser(supabase)

    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)

    const data = await getOperationalCalendar(supabase, {
      from: searchParams.get('from'),
      to: searchParams.get('to'),
      departamento: searchParams.get('departamento'),
      centroCosto: searchParams.get('centro_costo'),
      estado: searchParams.get('estado'),
      limit: Number(searchParams.get('limit') || 500),
    })

    return NextResponse.json({ ok: true, count: data.length, data })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message ?? error) }, { status: 500 })
  }
}
