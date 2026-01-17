import { getSafeServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSafeServerUser()

  if (!user) redirect('/login')

  return <AppShell>{children}</AppShell>
}
