import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('status')
      .limit(10000)

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    const counts: Record<string, number> = {}
    ;(tickets || []).forEach((t: any) => {
      const s = t.status || 'Unknown'
      counts[s] = (counts[s] || 0) + 1
    })

    return NextResponse.json({ ok: true, counts })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
