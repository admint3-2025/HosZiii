import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AssetChangesTable from './AssetChangesTable'

const CHANGE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  field_update: { label: 'Actualización', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  status_change: { label: 'Cambio de Estado', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  location_change: { label: 'Cambio de Sede', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  assignment_change: { label: 'Cambio de Responsable', color: 'bg-green-100 text-green-800 border-green-300' },
}

export default async function AssetChangesReportPage() {
  const supabase = await createSupabaseServerClient()

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'supervisor'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Obtener cambios de activos con información relacionada
  const { data: changes } = await supabase
    .from('asset_changes')
    .select(`
      id,
      asset_id,
      field_name,
      old_value,
      new_value,
      change_type,
      changed_at,
      changed_by,
      changed_by_name,
      changed_by_email
    `)
    .order('changed_at', { ascending: false })
    .limit(500)

  // Obtener información de activos
  const assetIds = [...new Set((changes ?? []).map(c => c.asset_id))]
  const { data: assets } = await supabase
    .from('assets')
    .select('id, asset_tag, asset_type, brand, model, location_id, asset_location:locations(code, name)')
    .in('id', assetIds)

  const assetMap = new Map(assets?.map(a => [a.id, a]) ?? [])
  
  // Obtener todas las ubicaciones para el formateo
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, code')
    .eq('is_active', true)

  // Estadísticas
  const totalChanges = changes?.length ?? 0
  const uniqueAssets = new Set(changes?.map(c => c.asset_id)).size
  const changesByType = (changes ?? []).reduce((acc, c) => {
    const type = c.change_type || 'field_update'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 shadow-md">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
        <div className="relative z-10 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/reports"
                className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Historial de Cambios en Activos</h1>
                <p className="text-cyan-100 text-sm">Trazabilidad completa de modificaciones con responsable y timestamp</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card bg-gradient-to-br from-white to-gray-50">
          <div className="p-4">
            <div className="text-xs font-medium text-gray-600">Total de Cambios</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{totalChanges}</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-white to-teal-50">
          <div className="p-4">
            <div className="text-xs font-medium text-gray-600">Activos Modificados</div>
            <div className="text-2xl font-bold text-teal-600 mt-1">{uniqueAssets}</div>
          </div>
        </div>
        {Object.entries(changesByType).slice(0, 2).map(([type, count]) => (
          <div key={type} className="card bg-gradient-to-br from-white to-blue-50">
            <div className="p-4">
              <div className="text-xs font-medium text-gray-600">{CHANGE_TYPE_LABELS[type]?.label || type}</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{count}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla de cambios */}
      <AssetChangesTable 
        changes={changes ?? []}
        assetMap={assetMap}
        locations={locations ?? []}
      />

      {/* Nota informativa */}
      <div className="card bg-teal-50 border-teal-200">
        <div className="p-4">
          <div className="flex gap-3">
            <div className="text-2xl">ℹ️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-teal-900 text-sm mb-1">Sobre este reporte</h3>
              <p className="text-xs text-teal-700 leading-relaxed">
                Este reporte muestra todos los cambios realizados en activos mediante triggers automáticos. Incluye modificaciones de estado, 
                ubicación, responsable y especificaciones técnicas. Cada cambio registra el usuario responsable y timestamp exacto.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
