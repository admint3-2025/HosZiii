import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'
import AppShellClient from './AppShellClient'

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const user = await getSafeServerUser()

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('full_name,position,role,location_id,can_view_beo,asset_category,hub_visible_modules,locations(name,code)')
        .eq('id', user.id)
        .single()
    : { data: null }

  // Cargar múltiples sedes del usuario desde user_locations
  const { data: userLocations } = user
    ? await supabase.from('user_locations').select('location_id,locations(name,code)').eq('user_id', user.id)
    : { data: null }

  const locationCodes = userLocations?.map((ul: any) => ul.locations?.code).filter(Boolean) || []
  const locationNames = userLocations?.map((ul: any) => ul.locations?.name).filter(Boolean) || []

  // Datos para el sidebar móvil
  const userData = {
    role: profile?.role || null,
    canViewBeo: profile?.can_view_beo || false,
    assetCategory: profile?.asset_category || null,
    hubModules: profile?.hub_visible_modules || {},
  }

  return (
    <AppShellClient
      user={user}
      profile={profile}
      locationCodes={locationCodes}
      locationNames={locationNames}
      userData={userData}
    >
      {children}
    </AppShellClient>
  )
}

