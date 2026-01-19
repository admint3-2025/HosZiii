import { createSupabaseServerClient } from '@/lib/supabase/server'
import MaintenanceTicketCreateForm from './ui/MaintenanceTicketCreateForm'
import MaintenanceBanner from '../../ui/MaintenanceBanner'

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

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50 to-orange-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header con tema de mantenimiento */}
        <MaintenanceBanner
          title="Nuevo Ticket de Mantenimiento"
          subtitle="Infraestructura, HVAC, plomería, electricidad"
          icon={
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />

        {/* Formulario de creación de ticket de mantenimiento */}
        <MaintenanceTicketCreateForm
          categories={maintenanceCategories}
        />
      </div>
    </main>
  )
}
