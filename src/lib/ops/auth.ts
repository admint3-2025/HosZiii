import type { SupabaseClient } from '@supabase/supabase-js'
import { getSafeServerUser } from '@/lib/supabase/server'

export async function requireOpsUser(supabase: SupabaseClient) {
  const user = await getSafeServerUser()
  if (!user) {
    return { ok: false as const, status: 401, error: 'Unauthorized' }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, is_corporate, department, allowed_departments')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return { ok: false as const, status: 403, error: 'Profile not found or inaccessible' }
  }

  const canManage = profile.role === 'admin' || profile.role === 'supervisor'

  return {
    ok: true as const,
    userId: user.id,
    profile,
    canManage,
  }
}

function normalizeDepartment(value: string | null | undefined) {
  return (value ?? '').trim().toUpperCase()
}

export function canManageOpsDepartment(
  profile: {
    role: string
    department?: string | null
    allowed_departments?: string[] | null
  },
  department: string | null | undefined,
) {
  if (profile.role === 'admin') return true

  const target = normalizeDepartment(department)
  if (!target) return false

  const allowed = new Set<string>()
  if (profile.department) allowed.add(normalizeDepartment(profile.department))
  for (const item of profile.allowed_departments ?? []) {
    allowed.add(normalizeDepartment(item))
  }

  return allowed.has(target)
}
