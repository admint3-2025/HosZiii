import { redirect } from 'next/navigation'

import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'
import CorporativoInspeccionesClient from './ui/CorporativoInspeccionesClient'

export const dynamic = 'force-dynamic'

type HubVisibleModules = {
  'inspecciones-rrhh'?: boolean
  [key: string]: boolean | undefined
}

export default async function CorporativoInspeccionesPage() {
  const user = await getSafeServerUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createSupabaseServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, hub_visible_modules')
    .eq('id', user.id)
    .single()

  // Roles corporativos
  if (!profile || !['admin', 'corporate_admin', 'supervisor', 'auditor'].includes(profile.role)) {
    redirect('/hub')
  }

  // Para corporate_admin, verificar permiso de inspecciones
  if (profile.role === 'corporate_admin') {
    const hubModules = profile.hub_visible_modules as HubVisibleModules | null
    // Si hub_visible_modules existe y inspecciones-rrhh está explícitamente en false, denegar acceso
    if (hubModules && hubModules['inspecciones-rrhh'] === false) {
      redirect('/corporativo/dashboard')
    }
  }

  return <CorporativoInspeccionesClient />
}
