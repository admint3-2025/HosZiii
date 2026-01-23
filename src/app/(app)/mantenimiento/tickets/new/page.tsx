import { createSupabaseServerClient } from '@/lib/supabase/server'
import MaintenanceTicketCreateFormModern from './ui/MaintenanceTicketCreateFormModern'

export default async function NewMaintenanceTicketPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('role,asset_category')
    .eq('id', user.id)
    .single() : { data: null }

  // Cualquier usuario autenticado puede crear tickets de mantenimiento,
  // (solo se limita la gestin/cola por permisos, no la creacin)
  const canCreateMaintenanceTicket = !!profile
  
  if (!canCreateMaintenanceTicket) {
    return (
      <main className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para crear solicitudes de mantenimiento.</p>
        </div>
      </main>
    )
  }

  // Cargar categorías de mantenimiento
  // Las categorías de mantenimiento tienen sort_order >= 100
  // IT tiene sort_order < 100
  const { data: allCategories } = await supabase
    .from('categories')
    .select('id,name,parent_id,sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  // Filtrar solo categorías de mantenimiento (sort_order >= 100)
  const maintenanceCategories = (allCategories ?? []).filter(
    (c) => (c.sort_order ?? 0) >= 100
  )

  // El formulario client-side ahora renderiza toda la vista (layout + sidebar + header + footer).
  return <MaintenanceTicketCreateFormModern categories={maintenanceCategories} />
}
