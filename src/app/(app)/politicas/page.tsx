import { redirect } from 'next/navigation'
import { getSafeServerUser } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import PoliciesCatalog from './ui/PoliciesCatalog'

export const dynamic = 'force-dynamic'

export default async function PoliticasPage() {
  const user = await getSafeServerUser()
  if (!user) redirect('/login')

  const supabase = createSupabaseAdminClient()

  // Obtener perfil del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Obtener categorías activas
  const { data: categories } = await supabase
    .from('policy_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  // Obtener políticas publicadas
  const { data: policies } = await supabase
    .from('policies')
    .select(`
      *,
      category:policy_categories(id, name, slug, icon, color)
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  // Obtener acknowledgments del usuario
  const { data: acknowledgments } = await supabase
    .from('policy_acknowledgments')
    .select('policy_id, acknowledged_at, version_read')
    .eq('user_id', user.id)

  // Mapear acknowledgments por política
  const ackMap = new Map(
    (acknowledgments || []).map(a => [a.policy_id, a])
  )

  // Combinar políticas con estado de lectura
  const policiesWithAck = (policies || []).map(policy => ({
    ...policy,
    acknowledgment: ackMap.get(policy.id) || null,
  }))

  const isAdmin = ['admin', 'corporate_admin'].includes(profile.role)

  return (
    <PoliciesCatalog
      categories={categories || []}
      policies={policiesWithAck}
      isAdmin={isAdmin}
      userName={profile.full_name || 'Usuario'}
      userId={user.id}
    />
  )
}
