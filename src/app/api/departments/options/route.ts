import { NextResponse } from 'next/server'
import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

function normalizeDepartmentValue(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

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
      return NextResponse.json({ ok: true, departments })
    }

    const allowed = new Set<string>()
    const currentDepartment = normalizeDepartmentValue((profile as any)?.department)
    if (currentDepartment) {
      allowed.add(currentDepartment)
    }

    for (const item of ((profile as any)?.allowed_departments as string[] | null) ?? []) {
      const normalized = normalizeDepartmentValue(item)
      if (normalized) allowed.add(normalized)
    }

    const filtered = departments.filter((department) => {
      const name = normalizeDepartmentValue(department.name)
      const code = normalizeDepartmentValue(department.code)
      return allowed.has(name) || (code ? allowed.has(code) : false)
    })

    return NextResponse.json({ ok: true, departments: filtered })
  } catch (err: any) {
    console.error('[departments/options]', err)
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
  }
}