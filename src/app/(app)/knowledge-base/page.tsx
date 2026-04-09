import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import KBPublicView from './KBPublicView'

export const metadata = {
  title: 'Base de Conocimientos | ZIII HoS',
  description: 'Explora el ranking de soluciones validadas por el equipo técnico.',
}

export default async function KnowledgeBasePublicPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return <KBPublicView userId={user.id} />
}
