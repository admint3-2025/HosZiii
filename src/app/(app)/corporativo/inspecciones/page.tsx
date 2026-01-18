import { redirect } from 'next/navigation'

import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'
import CorporativoInspeccionesClient from './ui/CorporativoInspeccionesClient'

export const dynamic = 'force-dynamic'

export default async function CorporativoInspeccionesPage() {
  const user = await getSafeServerUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createSupabaseServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // Roles corporativos
  if (!profile || !['admin', 'corporate_admin', 'supervisor', 'auditor'].includes(profile.role)) {
    redirect('/hub')
  }

  return <CorporativoInspeccionesClient />
}
