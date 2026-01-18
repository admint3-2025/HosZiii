import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AssetLocationsReportPage() {
  const supabase = await createSupabaseServerClient()

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

  // Obtener cambios de ubicación desde la vista de reporte
  const { data: locationChanges } = await supabase
    .from('asset_location_changes_report')
    .select('*')
    .order('fecha_cambio', { ascending: false })
    .limit(300)

  const totalChanges = locationChanges?.length ?? 0
  const uniqueAssets = new Set((locationChanges ?? []).map(c => c.asset_id)).size
  const withReason = (locationChanges ?? []).filter(c => c.justificacion && String(c.justificacion).trim().length > 0).length

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-600 via-orange-600 to-red-700 shadow-md">
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
                <h1 className="text-xl font-bold text-white">Cambios de Ubicación de Activos</h1>
                <p className="text-orange-100 text-sm">Auditoría de traslados entre sedes con justificación y responsable</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card bg-gradient-to-br from-white to-amber-50">
          <div className="p-4">
            <div className="text-xs font-medium text-gray-600">Total de Traslados</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{totalChanges}</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-white to-gray-50">
          <div className="p-4">
            <div className="text-xs font-medium text-gray-600">Activos Trasladados</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {uniqueAssets}
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-white to-blue-50">
          <div className="p-4">
            <div className="text-xs font-medium text-gray-600">Con Justificación</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {withReason}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de cambios */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold text-xs">Activo</th>
                <th className="px-4 py-3 font-semibold text-xs">Traslado</th>
                <th className="px-4 py-3 font-semibold text-xs">Justificación</th>
                <th className="px-4 py-3 font-semibold text-xs">Responsable</th>
                <th className="px-4 py-3 font-semibold text-xs">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(locationChanges ?? []).map((change) => {
                const assetLink = change.asset_id ? `/assets/${change.asset_id}` : null
                
                return (
                  <tr key={change.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {assetLink ? (
                        <Link
                          href={assetLink}
                          className="block hover:text-blue-600 transition-colors"
                        >
                          <div className="font-semibold text-gray-900">{change.asset_tag}</div>
                          <div className="text-xs text-gray-600">
                            {change.tipo_activo} - {change.marca} {change.modelo}
                          </div>
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-xs">Activo eliminado</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="text-center">
                          <div className="font-semibold text-red-700 text-xs">
                            {change.sede_origen || 'Sin ubicación'}
                          </div>
                          <div className="text-[10px] text-gray-500">&nbsp;</div>
                        </div>
                        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <div className="text-center">
                          <div className="font-semibold text-green-700 text-xs">
                            {change.sede_destino || 'Sin ubicación'}
                          </div>
                          <div className="text-[10px] text-gray-500">&nbsp;</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {change.justificacion ? (
                        <div className="max-w-xs">
                          <p className="text-xs text-gray-700 line-clamp-2">{change.justificacion}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sin justificación</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {change.usuario ? (
                        <div className="text-xs">
                          <div className="font-semibold text-gray-900">{change.usuario}</div>
                          <div className="text-gray-600">{change.email_usuario}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sistema automático</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs">
                      {new Date(change.fecha_cambio).toLocaleString('es-MX', {
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
              {locationChanges?.length === 0 && (
                <tr>
                  <td className="px-4 py-12 text-center text-gray-500" colSpan={5}>
                    <div className="text-4xl mb-2">🚚</div>
                    <div className="font-medium">No hay traslados registrados</div>
                    <div className="text-xs mt-1">Los cambios de sede aparecerán aquí</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota informativa */}
      <div className="card bg-amber-50 border-amber-200">
        <div className="p-4">
          <div className="flex gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 text-sm mb-1">Control de traslados</h3>
              <p className="text-xs text-amber-700 leading-relaxed">
                Todos los cambios de sede requieren justificación obligatoria. Este reporte permite auditar movimientos de activos 
                entre ubicaciones y detectar traslados no autorizados o sin documentación adecuada.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
