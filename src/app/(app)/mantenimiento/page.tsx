import { redirect } from 'next/navigation'
import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'
import { getLocationFilter } from '@/lib/supabase/locations'
import MantenimientoClient from './MantenimientoClient'

type LocationRow = {
  id: string
  name: string
  code: string
}

export default async function MantenimientoPage() {
  const user = await getSafeServerUser()

  if (!user) redirect('/login')

  const supabase = await createSupabaseServerClient()
  const locationFilter = await getLocationFilter()
  const canViewAll = locationFilter === null

  let locations: LocationRow[] = []

  if (locationFilter === null) {
    const { data } = await supabase
      .from('locations')
      .select('id,name,code')
      .eq('is_active', true)
      .order('name')

    locations = (data || []) as LocationRow[]
  } else {
    if (locationFilter.length > 0) {
      const { data } = await supabase
        .from('locations')
        .select('id,name,code')
        .eq('is_active', true)
        .in('id', locationFilter)
        .order('name')

      locations = (data || []) as LocationRow[]
    }
  }

  return <MantenimientoClient locations={locations} canViewAll={canViewAll} />
}
