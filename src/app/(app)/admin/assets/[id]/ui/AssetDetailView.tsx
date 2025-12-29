'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import AssetEditForm from './AssetEditForm'

type Asset = {
  id: string
  asset_tag: string
  asset_type: string
  status: string
  serial_number: string | null
  model: string | null
  brand: string | null
  department: string | null
  purchase_date: string | null
  warranty_end_date: string | null
  location: string | null
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export default function AssetDetailView({ asset }: { asset: Asset }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isChangingStatus, setIsChangingStatus] = useState(false)

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas dar de baja este activo? Esta acción se puede revertir desde el panel de administración.')) {
      return
    }

    setIsDeleting(true)
    const supabase = createSupabaseBrowserClient()

    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('assets')
      .update({ 
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id || null
      })
      .eq('id', asset.id)

    if (error) {
      console.error('Error deleting asset:', error)
      alert('Error al dar de baja el activo')
      setIsDeleting(false)
      return
    }

    router.push('/admin/assets')
    router.refresh()
  }

  const handleQuickStatusChange = async (newStatus: string) => {
    if (!confirm(`¿Cambiar el estado del activo a "${newStatus}"?`)) {
      return
    }

    setIsChangingStatus(true)
    const supabase = createSupabaseBrowserClient()

    const { error } = await supabase
      .from('assets')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', asset.id)

    if (error) {
      console.error('Error updating status:', error)
      alert('Error al cambiar el estado')
      setIsChangingStatus(false)
      return
    }

    router.refresh()
    setIsChangingStatus(false)
  }

  if (isEditing) {
    return (
      <AssetEditForm
        asset={asset}
        onCancel={() => setIsEditing(false)}
        onSuccess={() => {
          setIsEditing(false)
          router.refresh()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="btn btn-secondary inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{asset.asset_tag}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {asset.asset_type.replace(/_/g, ' ')} • {asset.brand || 'Sin marca'} {asset.model || ''}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn btn-danger inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {isDeleting ? 'Dando de baja...' : 'Dar de baja'}
          </button>
        </div>
      </div>

      {/* Estado Badge Grande */}
      <div className="card shadow-sm border border-slate-200">
        <div className="card-body p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Estado Actual</p>
              {asset.status === 'OPERATIONAL' && (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-semibold bg-green-100 text-green-800">
                  <span className="w-3 h-3 rounded-full bg-green-600"></span>
                  Operacional
                </span>
              )}
              {asset.status === 'MAINTENANCE' && (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-semibold bg-yellow-100 text-yellow-800">
                  <span className="w-3 h-3 rounded-full bg-yellow-600"></span>
                  En Mantenimiento
                </span>
              )}
              {asset.status === 'OUT_OF_SERVICE' && (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-semibold bg-red-100 text-red-800">
                  <span className="w-3 h-3 rounded-full bg-red-600"></span>
                  Fuera de Servicio
                </span>
              )}
              {asset.status === 'RETIRED' && (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-semibold bg-gray-100 text-gray-800">
                  <span className="w-3 h-3 rounded-full bg-gray-600"></span>
                  Retirado
                </span>
              )}
            </div>

            {/* Botones de cambio rápido de estado */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickStatusChange('OPERATIONAL')}
                disabled={isChangingStatus || asset.status === 'OPERATIONAL'}
                className="btn btn-sm btn-outline-success"
                title="Marcar como operacional"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Operacional
              </button>
              <button
                onClick={() => handleQuickStatusChange('MAINTENANCE')}
                disabled={isChangingStatus || asset.status === 'MAINTENANCE'}
                className="btn btn-sm btn-outline-warning"
                title="Marcar en mantenimiento"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Mantenimiento
              </button>
              <button
                onClick={() => handleQuickStatusChange('OUT_OF_SERVICE')}
                disabled={isChangingStatus || asset.status === 'OUT_OF_SERVICE'}
                className="btn btn-sm btn-outline-danger"
                title="Marcar fuera de servicio"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Fuera de Servicio
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Información del Activo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información General */}
        <div className="card shadow-sm border border-slate-200">
          <div className="card-body p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">Información General</h2>
            </div>

            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-600">Etiqueta</dt>
                <dd className="text-sm text-gray-900 mt-1 font-mono">{asset.asset_tag}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-600">Tipo</dt>
                <dd className="text-sm text-gray-900 mt-1">{asset.asset_type.replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-600">Número de Serie</dt>
                <dd className="text-sm text-gray-900 mt-1">{asset.serial_number || 'No especificado'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-600">Modelo</dt>
                <dd className="text-sm text-gray-900 mt-1">{asset.model || 'No especificado'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-600">Marca</dt>
                <dd className="text-sm text-gray-900 mt-1">{asset.brand || 'No especificada'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-600">Departamento</dt>
                <dd className="text-sm text-gray-900 mt-1">{asset.department || 'No especificado'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-600">Ubicación</dt>
                <dd className="text-sm text-gray-900 mt-1">{asset.location || 'No especificada'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Información de Compra y Garantía */}
        <div className="card shadow-sm border border-slate-200">
          <div className="card-body p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">Compra y Garantía</h2>
            </div>

            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-600">Fecha de Compra</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {asset.purchase_date 
                    ? new Date(asset.purchase_date).toLocaleDateString('es-ES', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })
                    : 'No especificada'
                  }
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-600">Fin de Garantía</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {asset.warranty_end_date 
                    ? new Date(asset.warranty_end_date).toLocaleDateString('es-ES', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })
                    : 'No especificada'
                  }
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-600">Creado</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {new Date(asset.created_at).toLocaleString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-600">Última Actualización</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {new Date(asset.updated_at).toLocaleString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Notas */}
      {asset.notes && (
        <div className="card shadow-sm border border-slate-200">
          <div className="card-body p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">Notas</h2>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{asset.notes}</p>
          </div>
        </div>
      )}
    </div>
  )
}
