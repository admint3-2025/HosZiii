import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('asset_types')
    .select('id, value, label, category, sort_order')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assetTypes: data })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { value, label, category, sort_order } = body || {}

  if (!value || !label || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()

  // Optional: verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('asset_types')
    .insert({ value, label, category, sort_order: sort_order ?? 100 })
    .select('id, value, label, category, sort_order')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assetType: data }, { status: 201 })
}
