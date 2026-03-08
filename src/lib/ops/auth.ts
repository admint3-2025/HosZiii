import type { SupabaseClient } from '@supabase/supabase-js'
import { getSafeServerUser } from '@/lib/supabase/server'

export async function requireOpsUser(supabase: SupabaseClient) {
  const user = await getSafeServerUser()
  if (!user) {
    return { ok: false as const, status: 401, error: 'Unauthorized' }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, is_corporate')
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
