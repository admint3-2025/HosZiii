import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'

export default async function ReportsPage() {
  const supabase = await createSupabaseServerClient()

  // Verificar autenticación y rol del usuario
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, asset_category, is_it_supervisor, is_maintenance_supervisor')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const isSupervisor = profile?.role === 'supervisor'
  // corporate_admin con permisos de supervisión también tiene acceso
  const isAdminOrSupervisor = isAdmin || isSupervisor || 
    (profile?.role === 'corporate_admin' && (profile?.is_it_supervisor || profile?.is_maintenance_supervisor))
  
  // Determinar acceso a módulos
  const canAccessIT = isAdmin || profile?.asset_category === 'IT' || profile?.asset_category === null
  const canAccessMaintenance = isAdmin || profile?.asset_category === 'MAINTENANCE'

  // Módulos de reportes disponibles
  const modules = [
    {
      id: 'helpdesk',
      title: 'Service Desk IT',
      description: 'Reportes de tickets, incidentes, activos IT y métricas de soporte técnico',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200 hover:border-blue-400',
      textColor: 'text-blue-700',
      link: '/reports/helpdesk',
      enabled: canAccessIT,
    },
    {
      id: 'maintenance',
      title: 'Service Desk Mantenimiento',
      description: 'Reportes de solicitudes, órdenes de trabajo, equipos y métricas de mantenimiento',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'from-orange-500 to-red-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200 hover:border-orange-400',
      textColor: 'text-orange-700',
      link: '/reports/maintenance',
      enabled: canAccessMaintenance,
    },
    {
      id: 'audit',
      title: 'Auditoría General',
      description: 'Historial de acciones, cambios en el sistema y registro de actividades',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'from-purple-500 to-violet-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200 hover:border-purple-400',
      textColor: 'text-purple-700',
      link: '/audit',
      enabled: isAdmin,
    },
  ]

  const visibleModules = modules.filter(m => m.enabled)

  return (
    <main className="space-y-8 p-6">
      {/* Header */}
      <PageHeader
        title="Centro de Reportes"
        description="Selecciona el módulo para acceder a sus reportes y métricas"
        color="admin"
        icon={
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />

      {/* Módulos disponibles */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleModules.map((module) => (
          <Link
            key={module.id}
            href={module.link}
            className={`group relative overflow-hidden rounded-2xl border-2 ${module.borderColor} ${module.bgColor} p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
          >
            {/* Gradiente decorativo */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${module.color} opacity-10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:opacity-20 transition-opacity`}></div>
            
            <div className="relative z-10">
              {/* Icono */}
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${module.color} text-white shadow-lg mb-4`}>
                {module.icon}
              </div>
              
              {/* Título */}
              <h3 className={`text-xl font-bold ${module.textColor} mb-2 group-hover:translate-x-1 transition-transform`}>
                {module.title}
              </h3>
              
              {/* Descripción */}
              <p className="text-sm text-slate-600 mb-4">
                {module.description}
              </p>
              
              {/* Indicador de acción */}
              <div className={`flex items-center gap-2 text-sm font-medium ${module.textColor}`}>
                <span>Ver reportes</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Mensaje informativo */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 mb-1">Reportes Centralizados</h4>
            <p className="text-sm text-slate-600">
              Cada módulo contiene reportes específicos para su área. Los reportes están filtrados según tu rol y permisos asignados.
              {isAdmin && ' Como administrador, tienes acceso completo a todos los reportes del sistema.'}
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
