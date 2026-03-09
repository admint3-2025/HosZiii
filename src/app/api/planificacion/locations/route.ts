import { NextResponse } from 'next/server'
import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const user = await getSafeServerUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, location_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })
    }

    if (profile.role === 'admin') {
      const admin = createSupabaseAdminClient()
      const { data, error } = await admin
        .from('locations')
        .select('id, code, name')
        .order('code', { ascending: true })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, locations: data || [] })
    }

    const { data: userLocs, error: locErr } = await supabase
      .from('user_locations')
      .select('location_id')
      .eq('user_id', user.id)

    if (locErr) return NextResponse.json({ error: locErr.message }, { status: 500 })

    const locationIds = Array.from(new Set((userLocs || []).map((item) => item.location_id).filter(Boolean)))

    if (!locationIds.length && profile.location_id) {
      locationIds.push(profile.location_id)
    }

    if (!locationIds.length) {
      return NextResponse.json({ ok: true, locations: [] })
    }

    const { data, error } = await supabase
      .from('locations')
      .select('id, code, name')
      .in('id', locationIds)
      .order('code', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, locations: data || [] })
  } catch (err: any) {
    console.error('[planificacion/locations]', err)
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
  }
}