import { getSafeServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HousekeepingDashboard from './ui/HousekeepingDashboard'

export const metadata = {
  title: 'Ama de Llaves | ZIII HoS',
  description: 'Dashboard operativo de Housekeeping',
}

export const dynamic = 'force-dynamic'

export default async function HousekeepingPage() {
  const user = await getSafeServerUser()
  if (!user) redirect('/login')

  return <HousekeepingDashboard />
}
