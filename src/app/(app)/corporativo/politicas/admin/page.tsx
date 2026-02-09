import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PoliciesAdminPanel from './ui/PoliciesAdminPanel'

export const dynamic = 'force-dynamic'

export default async function PoliciesAdminPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Solo admin o corporate_admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'corporate_admin'].includes(profile.role)) {
    redirect('/politicas')
  }

  // Todas las categorías
  const { data: categories } = await supabase
    .from('policy_categories')
    .select('*')
    .order('sort_order', { ascending: true })

  // Todas las políticas (incluidas drafts)
  const { data: policies } = await supabase
    .from('policies')
    .select(`
      *,
      category:policy_categories(id, name, slug, icon, color)
    `)
    .order('created_at', { ascending: false })

  // Stats de acknowledgments
  const { count: totalAcks } = await supabase
    .from('policy_acknowledgments')
    .select('*', { count: 'exact', head: true })

  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PoliciesAdminPanel
        categories={categories || []}
        policies={policies || []}
        stats={{
          totalPolicies: policies?.length || 0,
          publishedPolicies: policies?.filter(p => p.status === 'published').length || 0,
          totalAcknowledgments: totalAcks || 0,
          totalUsers: totalUsers || 0,
        }}
      />
    </div>
  )
}
