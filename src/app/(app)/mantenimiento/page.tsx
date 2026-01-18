import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function MaintenanceHubPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('role,asset_category')
    .eq('id', user.id)
    .single() : { data: null }

  const canAccessMaintenance = profile?.role === 'admin' || profile?.asset_category === 'MAINTENANCE'

  if (!canAccessMaintenance) {
    return (
      <main className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a este módulo.</p>
        </div>
      </main>
    )
  }

  // Obtener estadísticas
  const [openTickets, totalAssets] = await Promise.all([
    supabase.from('tickets_maintenance').select('id', { count: 'exact', head: true }).is('deleted_at', null).in('status', ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'NEEDS_INFO', 'WAITING_THIRD_PARTY', 'RESOLVED']),
    supabase.from('assets_maintenance').select('id', { count: 'exact', head: true }).is('deleted_at', null),
  ])

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-orange-100 rounded-xl">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m6 2a8 8 0 11-16 0 8 8 0 0116 0zm-6 6v4m-2-2h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Panel de Mantenimiento</h1>
              <p className="text-gray-600 mt-1">Gestión centralizada de solicitudes y activos de mantenimiento</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-6 mb-12 md:grid-cols-2">
          <Link href="/mantenimiento/tickets" className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-600 to-red-600 p-8 shadow-lg hover:shadow-2xl transition-all hover:scale-105">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="p-3 bg-white/20 rounded-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Solicitudes de Mantenimiento</h2>
              <p className="text-orange-100 text-sm mb-6">Gestiona todas tus solicitudes y órdenes de trabajo</p>
              <div className="text-5xl font-bold text-white">{openTickets.count ?? 0}</div>
              <p className="text-orange-100 text-xs mt-2">Solicitudes activas</p>
            </div>
          </Link>

          <Link href="/mantenimiento/assets" className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 p-8 shadow-lg hover:shadow-2xl transition-all hover:scale-105">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="p-3 bg-white/20 rounded-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m0 0l8-4m0 0l8 4m0 0v10l-8 4m0-10L4 7m8 4l8 4m0 0l-8-4m0 0l-8 4" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Activos de Mantenimiento</h2>
              <p className="text-amber-100 text-sm mb-6">Inventario y equipos disponibles</p>
              <div className="text-5xl font-bold text-white">{totalAssets.count ?? 0}</div>
              <p className="text-amber-100 text-xs mt-2">Activos registrados</p>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Acciones Rápidas</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/mantenimiento/tickets/new" className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all group">
              <div className="p-3 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-orange-600">Nueva Solicitud</p>
                <p className="text-gray-600 text-xs">Crear orden de mantenimiento</p>
              </div>
            </Link>

            <Link href="/mantenimiento/tickets?view=queue" className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all group">
              <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-blue-600">Todas las Solicitudes</p>
                <p className="text-gray-600 text-xs">Ver bandeja de mantenimiento</p>
              </div>
            </Link>

            <Link href="/mantenimiento/assets" className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all group">
              <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m0 0l8-4m0 0l8 4m0 0v10l-8 4m0-10L4 7m8 4l8 4m0 0l-8-4m0 0l-8 4" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-purple-600">Ver Activos</p>
                <p className="text-gray-600 text-xs">Equipos disponibles</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
