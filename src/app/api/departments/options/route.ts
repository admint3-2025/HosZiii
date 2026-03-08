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
      .select('role, is_corporate, department, allowed_departments')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })
    }

    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from('departments')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const departments = data ?? []

    if (profile.role === 'admin' || profile.is_corporate === true) {
      return NextResponse.json({ departments })
    }

    const allowed = new Set<string>()
    const currentDepartment = typeof (profile as any)?.department === 'string' ? (profile as any).department.trim() : ''
    if (currentDepartment) {
      allowed.add(currentDepartment.toUpperCase())
    }

    for (const item of ((profile as any)?.allowed_departments as string[] | null) ?? []) {
      if (typeof item === 'string' && item.trim()) {
        allowed.add(item.trim().toUpperCase())
      }
    }

    const filtered = departments.filter((department) => allowed.has(String(department.name ?? '').trim().toUpperCase()))
    return NextResponse.json({ departments: filtered })
  } catch (err: any) {
    console.error('[departments/options]', err)
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
  }
}