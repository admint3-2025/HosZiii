import Link from 'next/link'

type AssetRow = {
  id: string
  asset_tag: string
  asset_type: string
  status: string
  asset_location?: { code: string; name: string } | null
}

export default function AssignedAssets({ assets }: { assets: AssetRow[] }) {
  const hasAssets = assets && assets.length > 0

  return (
    <div className="card shadow-lg border-0">
      <div className="card-body">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6M9 8h6m2-6H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Equipos asignados a este usuario</h3>
            <p className="text-xs text-gray-600">Activos vinculados al usuario actual</p>
          </div>
        </div>

        {!hasAssets ? (
          <div className="text-center py-6 text-xs text-gray-500">
            No tienes activos asignados en el inventario.
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {assets.map((asset) => (
              <li key={asset.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
                <div className="min-w-0">
                  <Link
                    href={`/assets/${asset.id}`}
                    className="font-semibold text-gray-900 truncate block text-xs"
                  >
                    {asset.asset_tag}
                  </Link>
                  <div className="text-[11px] text-gray-600 truncate">
                    {asset.asset_type.replace(/_/g, ' ')}
                    {asset.asset_location && (
                      <span className="ml-1 text-emerald-700 font-medium">
                        [
                        {asset.asset_location.code}
                        ]
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 uppercase font-semibold">
                  {asset.status.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
