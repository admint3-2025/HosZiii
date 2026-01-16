import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    // Select open tickets with critical priority older than 48 hours
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('id,title,created_at,location_id,assigned')
      .is('closed_at', null)
      .or("priority.eq.Crítica,priority.eq.CRITICO,priority.eq.CRITICAL,priority.eq.Critical,priority.eq.critical")
      .lte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })
      .limit(10)

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, items: tickets || [] })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
