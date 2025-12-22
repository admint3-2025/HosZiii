import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AssetList from './ui/AssetList'
import AssetStats from './ui/AssetStats'

export default async function AssetsPage() {
  const supabase = await createSupabaseServerClient()

  // Verificar autenticación y rol
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Solo administradores pueden gestionar activos
  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Obtener activos
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Obtener estadísticas
  const { data: stats } = await supabase.rpc('get_asset_stats')

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 shadow-md">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-400/20 rounded-full blur-3xl -ml-24 -mb-24"></div>

        <div className="relative z-10 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Gestión de Activos</h1>
                <p className="text-violet-100 text-[11px]">Administración de equipos y recursos de TI</p>
              </div>
            </div>
            <a
              href="/admin/assets/new"
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-white text-purple-700 hover:bg-purple-50 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Activo
            </a>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && stats.length > 0 && <AssetStats stats={stats[0]} />}

      {/* Lista de activos */}
      <AssetList assets={assets || []} />
    </main>
  )
}
