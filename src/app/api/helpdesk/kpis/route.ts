import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    // Fetch recent open tickets (MVP: limit to 10000)
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('id,priority,status,created_at')
      .is('closed_at', null)
      .limit(10000)

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    const backlogTotal = (tickets || []).length

    const byPriority: Record<string, number> = {}
    const byStatus: Record<string, number> = {}

    ;(tickets || []).forEach((t: any) => {
      const p = t.priority || 'Sin asignar'
      const s = t.status || 'Unknown'
      byPriority[p] = (byPriority[p] || 0) + 1
      byStatus[s] = (byStatus[s] || 0) + 1
    })

    return NextResponse.json({ ok: true, backlogTotal, byPriority, byStatus })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
