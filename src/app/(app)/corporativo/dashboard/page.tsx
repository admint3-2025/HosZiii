import { redirect } from 'next/navigation'
import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function CorporativoDashboard() {
  const user = await getSafeServerUser()
  
  if (!user) {
    redirect('/login')
  }

  const supabase = await createSupabaseServerClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // Verificar permisos (admin, supervisor, auditor)
  if (!profile || !['admin', 'supervisor', 'auditor'].includes(profile.role)) {
    redirect('/hub')
  }

  return (
    <main className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-400/20 rounded-full blur-3xl -ml-32 -mb-32"></div>
        
        <div className="relative z-10 px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Módulo Corporativo</h1>
              <p className="text-amber-100 text-sm mt-1">Inspecciones, Políticas, Procedimientos, Academia</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje de construcción */}
      <div className="card">
        <div className="card-body p-8 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Módulo en Construcción</h2>
          <p className="text-gray-600 max-w-md mx-auto mb-8">
            El módulo corporativo está actualmente en desarrollo. Pronto estará disponible con las siguientes funcionalidades:
          </p>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto text-left">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-semibold text-amber-900">Inspecciones</h3>
              </div>
              <p className="text-xs text-amber-700">Auditorías de calidad y checklist operativos</p>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="font-semibold text-orange-900">Políticas</h3>
              </div>
              <p className="text-xs text-orange-700">Gestión documental y políticas corporativas</p>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="font-semibold text-red-900">Procedimientos</h3>
              </div>
              <p className="text-xs text-red-700">SOPs y guías operativas</p>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
                <h3 className="font-semibold text-purple-900">Academia</h3>
              </div>
              <p className="text-xs text-purple-700">Capacitación y desarrollo de personal</p>
            </div>
          </div>

          <div className="mt-8">
            <Link href="/hub" className="btn btn-primary">
              Volver al Hub
            </Link>
          </div>
        </div>
      </div>

      {/* Info adicional */}
      <div className="card bg-amber-50 border-amber-200">
        <div className="card-body p-6">
          <div className="flex items-start gap-4">
            <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-amber-900 mb-2">Información</h3>
              <p className="text-sm text-amber-800">
                Este módulo está diseñado para roles corporativos (Admin, Supervisor, Auditor). 
                Permitirá gestionar inspecciones de calidad, documentación corporativa, procedimientos operativos 
                y programas de capacitación para todo el personal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
