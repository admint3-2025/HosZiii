import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import KBAdminView from './KBAdminView'

export const metadata = {
  title: 'Base de Conocimientos - Administración | Helpdesk',
  description: 'Gestiona artículos de la base de conocimientos: aprueba, rechaza o edita artículos generados automáticamente.',
}

export default async function KnowledgeBaseAdminPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Obtener perfil y verificar permisos
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['ADMIN', 'SUPERVISOR'].includes(profile.role)) {
    redirect('/tickets')
  }

  return <KBAdminView />
}
