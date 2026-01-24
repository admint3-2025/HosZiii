'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { createSupabaseBrowserClient, getSafeUser } from '@/lib/supabase/browser'
import { InspectionsGSHService, type InspectionGSH } from '@/lib/services/inspections-gsh.service'
import GSHInspectionManager from '../../ui/GSHInspectionManager'

export const dynamic = 'force-dynamic'

type RouteParams = { id: string }

type InspectionContext = {
  inspectionId: string
  locationId: string
  departmentName: string
  propertyCode: string
  propertyName: string
}

export default function GSHInspectionByIdPage() {
  const router = useRouter()
  const params = useParams<RouteParams>()

  const inspectionId = useMemo(() => {
    const id = params?.id
    return typeof id === 'string' ? id : ''
  }, [params])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [ctx, setCtx] = useState<InspectionContext | null>(null)

  const userName = useMemo(() => {
    const meta = (currentUser as any)?.user_metadata
    return meta?.full_name || currentUser?.email || 'Usuario'
  }, [currentUser])

  useEffect(() => {
    const load = async () => {
      if (!inspectionId) return

      setLoading(true)
      setError(null)

      try {
        const supabase = createSupabaseBrowserClient()
        const user = await getSafeUser(supabase)

        if (!user) {
          // Don't force redirect on auth errors; user might still have valid session
          setError('No se pudo verificar la autenticación. Intenta recargar la página.')
          return
        }

        setCurrentUser(user)

        const { data, error: loadError } = await InspectionsGSHService.getInspectionById(inspectionId)

        if (loadError || !data) {
          setError(loadError?.message || 'No se pudo cargar la inspección')
          return
        }

        const inspection = data as InspectionGSH

        setCtx({
          inspectionId,
          locationId: inspection.location_id,
          departmentName: inspection.department || 'RECURSOS HUMANOS',
          propertyCode: inspection.property_code || '-',
          propertyName: inspection.property_name || '-'
        })
      } catch (e: any) {
        setError(e?.message || 'Error inesperado al cargar la inspección')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [inspectionId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Cargando inspección...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h1 className="text-lg font-bold text-slate-900 mb-2">No se pudo abrir la inspección</h1>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/inspections')}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium"
            >
              Volver a Inspecciones
            </button>
            <button
              onClick={() => router.refresh()}
              className="px-4 py-2 bg-white text-slate-800 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!ctx || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-600">No hay datos para mostrar.</p>
      </div>
    )
  }

  return (
    <GSHInspectionManager
      inspectionId={ctx.inspectionId}
      locationId={ctx.locationId}
      departmentName={ctx.departmentName}
      propertyCode={ctx.propertyCode}
      propertyName={ctx.propertyName}
      currentUser={currentUser}
      userName={userName}
    />
  )
}
