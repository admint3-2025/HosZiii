import { redirect } from 'next/navigation'
import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'

export type UserPlanningProfile = {
  role: string
  isAdmin: boolean
  isCorporate: boolean
  departamento: string | null
  allowed_departments: string[] | null
  full_name: string | null
}

export async function getPlanningPageContext() {
  const supabase = await createSupabaseServerClient()
  const user = await getSafeServerUser()

  if (!user) redirect('/login')

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('role, is_corporate, department, allowed_departments, full_name')
    .eq('id', user.id)
    .single()

  const role = profileRow?.role ?? 'supervisor'
  const isCorporate = Boolean(profileRow?.is_corporate)
  const isAdmin = role === 'admin'

  const userProfile: UserPlanningProfile = {
    role,
    isAdmin,
    isCorporate,
    departamento: (profileRow as any)?.department ?? null,
    allowed_departments: (profileRow?.allowed_departments as string[] | null) ?? null,
    full_name: profileRow?.full_name ?? null,
  }

  return {
    userProfile,
    initialYear: new Date().getFullYear(),
  }
}