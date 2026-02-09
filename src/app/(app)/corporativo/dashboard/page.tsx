import { redirect } from 'next/navigation'
import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'
import CorporateDashboardClient from './ui/CorporateDashboardClient'

export type HubVisibleModules = {
  'it-helpdesk'?: boolean
  'mantenimiento'?: boolean
  'inspecciones-rrhh'?: boolean
  'academia'?: boolean
  'beo'?: boolean
  'ama-de-llaves'?: boolean
  [key: string]: boolean | undefined
}

export default async function CorporativoDashboard() {
  const user = await getSafeServerUser()
  
  if (!user) {
    redirect('/login')
  }

  const supabase = await createSupabaseServerClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, hub_visible_modules')
    .eq('id', user.id)
    .single()

  // Verificar permisos (admin o corporate_admin)
  if (!profile || !['admin', 'corporate_admin'].includes(profile.role)) {
    redirect('/hub')
  }

  // Para admin, todos los módulos están disponibles
  // Para corporate_admin, usar hub_visible_modules
  const hubModules = profile.role === 'admin' 
    ? null // null significa acceso total
    : (profile.hub_visible_modules as HubVisibleModules | null)

  return (
    <main className="min-h-screen p-4 md:p-6 space-y-6 bg-gray-50">
      {/* Header Compacto */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 shadow-lg">
        {/* Efectos decorativos */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl -ml-24 -mb-24"></div>
        
        <div className="relative z-10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Módulo Corporativo</h1>
              <p className="text-amber-200/70 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                Gestión Estratégica de Calidad
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Client Component - filtrado por módulos del perfil */}
      <CorporateDashboardClient hubModules={hubModules} isAdmin={profile.role === 'admin'} />
    </main>
  )
}
