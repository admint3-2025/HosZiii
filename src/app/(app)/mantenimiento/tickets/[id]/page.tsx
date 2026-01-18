import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function MaintenanceTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('role,asset_category')
    .eq('id', user.id)
    .single() : { data: null }

  const canAccessMaintenance = profile?.role === 'admin' || profile?.asset_category === 'MAINTENANCE'
  
  if (!canAccessMaintenance) {
    return notFound()
  }

  const { data: ticket, error } = await supabase
    .from('tickets_maintenance')
    .select('*,locations(code,name)')
    .eq('id', id)
    .single()

  if (error || !ticket) {
    return notFound()
  }

  const statusConfig: Record<string, { badge: string; bg: string; text: string }> = {
    'NEW': { badge: 'Nuevo', bg: 'bg-blue-100', text: 'text-blue-800' },
    'ASSIGNED': { badge: 'Asignado', bg: 'bg-purple-100', text: 'text-purple-800' },
    'IN_PROGRESS': { badge: 'En Progreso', bg: 'bg-yellow-100', text: 'text-yellow-800' },
    'RESOLVED': { badge: 'Resuelto', bg: 'bg-green-100', text: 'text-green-800' },
    'CLOSED': { badge: 'Cerrado', bg: 'bg-gray-100', text: 'text-gray-800' },
  }

  const priorityConfig: Record<number, { label: string; color: string }> = {
    1: { label: 'Crítica', color: 'text-red-700' },
    2: { label: 'Alta', color: 'text-orange-700' },
    3: { label: 'Media', color: 'text-blue-700' },
    4: { label: 'Baja', color: 'text-gray-700' },
  }

  const status = statusConfig[ticket.status] || statusConfig['NEW']
  const priority = priorityConfig[ticket.priority] || priorityConfig[3]

  return (
    <main className="p-6 space-y-6">
      <Link href="/mantenimiento/tickets" className="text-orange-600 hover:text-orange-700 text-sm font-medium inline-flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver a solicitudes
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Header */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
                <p className="text-gray-600 text-sm mt-1">Ticket #{ticket.ticket_number}</p>
              </div>
              <span className={`inline-flex px-4 py-2 rounded-lg text-sm font-semibold ${status.bg} ${status.text}`}>
                {status.badge}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-200">
              <div>
                <p className="text-gray-600 text-sm">Prioridad</p>
                <p className={`font-bold text-lg ${priority.color}`}>{priority.label}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Nivel de Soporte</p>
                <p className="font-bold text-lg">L{ticket.support_level}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Sede</p>
                <p className="font-bold">{(ticket.locations as any)?.code || '—'}</p>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="font-semibold text-gray-900 mb-2">Descripción</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.description || 'Sin descripción'}</p>
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Comentarios</h2>
            <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-600 text-sm">
              La sección de comentarios estará disponible próximamente
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info Card */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Información</h3>
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 text-sm">Creado</p>
                <p className="font-medium text-gray-900">
                  {new Date(ticket.created_at).toLocaleString('es-MX', { 
                    timeZone: 'America/Mexico_City',
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Actualizado</p>
                <p className="font-medium text-gray-900">
                  {new Date(ticket.updated_at).toLocaleString('es-MX', { 
                    timeZone: 'America/Mexico_City',
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Acciones</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition">
                Editar
              </button>
              <button className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition">
                Cambiar Estado
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
