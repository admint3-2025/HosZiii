import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function MaintenanceAssetDetailPage({
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

  const { data: asset, error } = await supabase
    .from('assets_maintenance')
    .select('*,locations(code,name)')
    .eq('id', id)
    .single()

  if (error || !asset) {
    return notFound()
  }

  const statusConfig: Record<string, { label: string; badge: string; bg: string }> = {
    'ACTIVE': { label: 'Activo', badge: 'Activo', bg: 'bg-green-100' },
    'INACTIVE': { label: 'Inactivo', badge: 'Inactivo', bg: 'bg-gray-100' },
    'MAINTENANCE': { label: 'Mantenimiento', badge: 'Mantenimiento', bg: 'bg-orange-100' },
    'DISPOSED': { label: 'Descartado', badge: 'Descartado', bg: 'bg-red-100' },
  }

  const status = statusConfig[asset.status] || statusConfig['ACTIVE']

  return (
    <main className="p-6 space-y-6">
      <Link href="/mantenimiento/assets" className="text-orange-600 hover:text-orange-700 text-sm font-medium inline-flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver a activos
      </Link>

      <div className="max-w-4xl">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{asset.name}</h1>
              <p className="text-gray-600 mt-1">Código: <span className="font-semibold">{asset.asset_code}</span></p>
            </div>
            <span className={`inline-flex px-4 py-2 rounded-lg text-sm font-semibold ${status.bg}`}>
              {status.badge}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-gray-200">
            <div>
              <p className="text-gray-600 text-sm mb-1">Categoría</p>
              <p className="font-bold text-gray-900">{asset.category || '—'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Marca</p>
              <p className="font-bold text-gray-900">{asset.brand || '—'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Modelo</p>
              <p className="font-bold text-gray-900">{asset.model || '—'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Sede</p>
              <p className="font-bold text-gray-900">{(asset.locations as any)?.code || '—'}</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {asset.description && (
              <div>
                <h2 className="font-semibold text-gray-900 mb-2">Descripción</h2>
                <p className="text-gray-700">{asset.description}</p>
              </div>
            )}

            {asset.serial_number && (
              <div>
                <h2 className="font-semibold text-gray-900 mb-2">Número de Serie</h2>
                <p className="text-gray-700 font-mono">{asset.serial_number}</p>
              </div>
            )}

            {asset.notes && (
              <div>
                <h2 className="font-semibold text-gray-900 mb-2">Notas</h2>
                <p className="text-gray-700">{asset.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
