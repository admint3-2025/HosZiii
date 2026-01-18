import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const FIELD_LABELS: Record<string, string> = {
  asset_tag: 'Etiqueta',
  asset_type: 'Tipo',
  status: 'Estado',
  serial_number: 'No. Serie',
  model: 'Modelo',
  brand: 'Marca',
  department: 'Departamento',
  location: 'Ubicación Física',
  location_id: 'Sede',
  assigned_to: 'Responsable',
  purchase_date: 'Fecha de Compra',
  warranty_end_date: 'Fin de Garantía',
  processor: 'Procesador',
  ram_gb: 'RAM (GB)',
  storage_gb: 'Almacenamiento (GB)',
  os: 'Sistema Operativo',
  notes: 'Notas',
}

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
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold text-xs">Activo</th>
                <th className="px-4 py-3 font-semibold text-xs">Campo</th>
                <th className="px-4 py-3 font-semibold text-xs">Cambio</th>
                <th className="px-4 py-3 font-semibold text-xs">Tipo</th>
                <th className="px-4 py-3 font-semibold text-xs">Usuario</th>
                <th className="px-4 py-3 font-semibold text-xs">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(changes ?? []).map((change) => {
                const asset = assetMap.get(change.asset_id)
                const changeTypeInfo =
                  CHANGE_TYPE_LABELS[change.change_type || 'field_update'] ?? {
                    label: change.change_type || 'Otro cambio',
                    color: 'bg-gray-100 text-gray-700 border-gray-200',
                  }
                
                return (
                  <tr key={change.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {asset ? (
                        <Link
                          href={`/assets/${asset.id}`}
                          className="block hover:text-blue-600 transition-colors"
                        >
                          <div className="font-semibold text-gray-900">{asset.asset_tag}</div>
                          <div className="text-xs text-gray-600">
                            {asset.asset_type} - {asset.brand} {asset.model}
                          </div>
                          {asset.asset_location && (
                            <div className="text-xs text-blue-600 font-medium">
                              {(asset.asset_location as any).code}
                            </div>
                          )}
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-xs">Activo eliminado</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-700">
                        {FIELD_LABELS[change.field_name] || change.field_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 bg-red-50 text-red-700 rounded border border-red-200 font-mono max-w-[120px] truncate">
                          {change.old_value || '(vacío)'}
                        </span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="px-2 py-1 bg-green-50 text-green-700 rounded border border-green-200 font-mono max-w-[120px] truncate">
                          {change.new_value || '(vacío)'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold border ${changeTypeInfo.color}`}>
                        {changeTypeInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <div className="font-semibold text-gray-900">
                          {change.changed_by_name || 'Sin nombre'}
                        </div>
                        <div className="text-gray-600">{change.changed_by_email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs">
                      {new Date(change.changed_at).toLocaleString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                )
              })}
              {changes?.length === 0 && (
                <tr>
                  <td className="px-4 py-12 text-center text-gray-500" colSpan={6}>
                    <div className="text-4xl mb-2">📝</div>
                    <div className="font-medium">No hay cambios registrados</div>
                    <div className="text-xs mt-1">Los cambios en activos aparecerán aquí</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
