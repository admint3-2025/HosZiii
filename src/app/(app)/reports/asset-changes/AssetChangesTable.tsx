'use client'

import Link from 'next/link'
import { formatHistoryValue, FIELD_LABELS } from '@/lib/assets/format-history'

type Asset = {
  id: string
  asset_tag: string
  asset_type: string | null
  brand: string | null
  model: string | null
  location_id: string | null
  asset_location: { code: string; name: string } | null
}

type Change = {
  id: string
  asset_id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  change_type: string
  changed_at: string
  changed_by: string | null
  changed_by_name: string | null
  changed_by_email: string | null
}

type Location = {
  id: string
  name: string
  code: string
}

const CHANGE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  field_update: { label: 'Actualización', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  status_change: { label: 'Cambio de Estado', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  location_change: { label: 'Cambio de Sede', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  assignment_change: { label: 'Cambio de Responsable', color: 'bg-green-100 text-green-800 border-green-300' },
}

export default function AssetChangesTable({
  changes,
  assetMap,
  locations,
}: {
  changes: Change[]
  assetMap: Map<string, Asset>
  locations: Location[]
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Activo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Campo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cambio</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {changes.map((change) => {
              const asset = assetMap.get(change.asset_id)
              const changeTypeInfo = CHANGE_TYPE_LABELS[change.change_type] || CHANGE_TYPE_LABELS.field_update

              return (
                <tr key={change.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {asset ? (
                      <Link
                        href={`/assets/${asset.id}`}
                        className="group flex flex-col gap-0.5 hover:text-blue-600"
                      >
                        <div className="font-mono text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                          {asset.asset_tag}
                        </div>
                        <div className="text-xs text-gray-600">
                          {asset.brand} {asset.model}
                        </div>
                        {asset.asset_location && (
                          <div className="text-xs text-blue-600 font-medium">
                            {asset.asset_location.code}
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
                      <span className="px-2 py-1 bg-red-50 text-red-700 rounded border border-red-200 font-mono max-w-[120px] truncate" title={formatHistoryValue(change.old_value, change.field_name, locations)}>
                        {formatHistoryValue(change.old_value, change.field_name, locations)}
                      </span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <span className="px-2 py-1 bg-green-50 text-green-700 rounded border border-green-200 font-mono max-w-[120px] truncate" title={formatHistoryValue(change.new_value, change.field_name, locations)}>
                        {formatHistoryValue(change.new_value, change.field_name, locations)}
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
                      {change.changed_by_name && change.changed_by_email ? (
                        <>
                          <div className="font-semibold text-gray-900">
                            {change.changed_by_name}
                          </div>
                          <div className="text-gray-600">{change.changed_by_email}</div>
                        </>
                      ) : change.changed_by_name ? (
                        <div className="font-semibold text-gray-900">
                          {change.changed_by_name}
                        </div>
                      ) : change.changed_by_email ? (
                        <div className="font-semibold text-gray-900">
                          {change.changed_by_email}
                        </div>
                      ) : (
                        <div className="text-gray-400 italic">Usuario no registrado</div>
                      )}
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
          </tbody>
        </table>
      </div>

      {changes.length === 0 && (
        <div className="p-8 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600 font-medium">No hay cambios registrados</p>
          <p className="text-sm text-gray-500 mt-1">Los cambios en activos aparecerán aquí automáticamente</p>
        </div>
      )}
    </div>
  )
}
