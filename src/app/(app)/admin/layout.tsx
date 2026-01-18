import { redirect } from 'next/navigation'
import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSafeServerUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createSupabaseServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // SOLO admin tiene acceso a /admin/*
  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return children
}
