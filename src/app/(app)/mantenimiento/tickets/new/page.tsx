import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import MaintenanceTicketCreateForm from './ui/MaintenanceTicketCreateForm'

export default async function NewMaintenanceTicketPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('role,asset_category')
    .eq('id', user.id)
    .single() : { data: null }

  // Cualquier usuario autenticado puede crear tickets de mantenimiento
  // (supervisores/agentes de IT pueden crear como solicitantes)
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

  // Cargar categorías
  const { data: categories } = await supabase
    .from('categories')
    .select('id,name,parent_id,sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50 to-orange-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header con tema de mantenimiento */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-300/20 rounded-full blur-3xl -ml-32 -mb-32"></div>
          
          <div className="relative z-10 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Nuevo Ticket de Mantenimiento</h1>
                <p className="text-orange-100 text-xs">Infraestructura, HVAC, plomería, electricidad</p>
              </div>
              <Link
                href="/mantenimiento/tickets"
                className="ml-auto text-white/80 hover:text-white text-xs flex items-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver a solicitudes
              </Link>
            </div>
          </div>
        </div>

        {/* Formulario de creación de ticket de mantenimiento */}
        <MaintenanceTicketCreateForm
          categories={(categories ?? []).filter((c) => c.name !== 'BEO - Evento')}
        />
      </div>
    </main>
  )
}
