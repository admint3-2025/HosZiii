import { createSupabaseServerClient } from '@/lib/supabase/server'
import LocationCreateForm from './ui/LocationCreateForm'
import LocationList from './ui/LocationList'

export default async function AdminLocationsPage() {
  // La validación de rol está en /admin/layout.tsx

  return (
    <main className="p-6 space-y-4">
      {/* Header compacto */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 shadow-md">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-400/20 rounded-full blur-3xl -ml-24 -mb-24"></div>

        <div className="relative z-10 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Ubicaciones / Sedes</h1>
              <p className="text-emerald-100 text-[11px]">Gestión de ciudades y empresas</p>
            </div>
          </div>
        </div>
      </div>
      <LocationCreateForm />
      <LocationList />
    </main>
  )
}
