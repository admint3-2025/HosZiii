import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import TicketCreateForm from './ui/TicketCreateForm'

type ServiceAreaParam = 'it' | 'maintenance'

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams?: Promise<{ area?: string }>
}) {
  const params = (await searchParams) ?? {}
  const area = params.area === 'it' || params.area === 'maintenance' ? (params.area as ServiceAreaParam) : undefined

  const supabase = await createSupabaseServerClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id,name,parent_id,sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  // Configuración de tema según área
  const themeConfig = {
    it: {
      bgGradient: 'from-gray-50 via-blue-50 to-indigo-50',
      headerGradient: 'from-blue-600 via-indigo-600 to-violet-700',
      accentColor: 'indigo-400',
      textColor: 'blue-100',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Nuevo Ticket IT',
      subtitle: 'Hardware, software, redes, accesos',
    },
    maintenance: {
      bgGradient: 'from-gray-50 via-amber-50 to-orange-50',
      headerGradient: 'from-amber-500 via-orange-500 to-red-600',
      accentColor: 'orange-400',
      textColor: 'amber-100',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: 'Nuevo Ticket Mantenimiento',
      subtitle: 'Infraestructura, HVAC, plomería, electricidad',
    },
  }

  const theme = area ? themeConfig[area] : null

  return (
    <main className={`min-h-screen bg-gradient-to-br ${area ? themeConfig[area].bgGradient : 'from-gray-50 via-slate-50 to-gray-100'} p-4 sm:p-6`}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header dinámico según área */}
        {area && theme ? (
          <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${theme.headerGradient} shadow-lg`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className={`absolute bottom-0 left-0 w-64 h-64 bg-${theme.accentColor}/20 rounded-full blur-3xl -ml-32 -mb-32`}></div>
            
            <div className="relative z-10 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
                  {theme.icon}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{theme.title}</h1>
                  <p className={`text-${theme.textColor} text-xs`}>{theme.subtitle}</p>
                </div>
                <Link
                  href="/tickets/new"
                  className="ml-auto text-white/80 hover:text-white text-xs flex items-center gap-1 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Cambiar área
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-600 via-gray-700 to-slate-800 shadow-lg">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-400/20 rounded-full blur-3xl -ml-32 -mb-32"></div>
            
            <div className="relative z-10 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Crear nuevo ticket</h1>
                  <p className="text-slate-200 text-xs">Selecciona el área de servicio para continuar</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!area ? (
          <div className="card shadow-lg border-0">
            <div className="card-body p-6">
              <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wider">¿Qué tipo de soporte necesitas?</h2>
              <p className="mt-1 text-sm text-gray-600">Selecciona el área para ver categorías y activos específicos.</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Link
                  href="/tickets/new?area=it"
                  className="group relative rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 hover:border-blue-400 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-bold text-blue-900">Soporte IT</div>
                      <div className="mt-1 text-sm text-blue-700">Hardware, software, redes, accesos</div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Computadoras</span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Impresoras</span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Servidores</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>

                <Link
                  href="/tickets/new?area=maintenance"
                  className="group relative rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 hover:border-amber-400 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-100 rounded-xl group-hover:bg-amber-200 transition-colors">
                      <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-bold text-amber-900">Mantenimiento</div>
                      <div className="mt-1 text-sm text-amber-700">Infraestructura, HVAC, plomería, electricidad</div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Aires A/C</span>
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Calderas</span>
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Bombas</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <TicketCreateForm
            categories={(categories ?? []).filter((c) => c.name !== 'BEO - Evento')}
            area={area}
          />
        )}
      </div>
    </main>
  )
}
