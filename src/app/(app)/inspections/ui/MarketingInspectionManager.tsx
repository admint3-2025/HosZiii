'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import InspectionStatsDashboard from './InspectionStatsDashboard'
import InspectionDashboard from './InspectionDashboard'
import { InspectionsRRHHService, type InspectionRRHH, type InspectionRRHHArea } from '@/lib/services/inspections-rrhh.service'
import { InspectionRRHHPDFGenerator } from '@/lib/services/inspections-rrhh-pdf.service'
import { getMarketingInspectionTemplateAreas } from '@/lib/templates/inspection-marketing-template'
import type { User } from '@supabase/supabase-js'

interface MarketingInspectionManagerProps {
  propertyCode: string
  propertyName: string
  locationId: string
  departmentName: string
  currentUser: User
  userName: string
  inspectionId?: string
  mode?: 'create' | 'edit' | 'view'
  templateOverride?: InspectionRRHHArea[] | null
  isAdmin?: boolean
  isMarketing?: boolean
  filterByCurrentUser?: boolean
  onChangeProperty?: () => void
  onChangeDepartment?: () => void
}

function cloneTemplate(template: InspectionRRHHArea[]): InspectionRRHHArea[] {
  return template.map((area, areaIdx) => ({
    ...area,
    id: undefined,
    inspection_id: undefined,
    area_order: areaIdx,
    items: (area.items || []).map((item, itemIdx) => ({
      ...item,
      id: undefined,
      area_id: undefined,
      inspection_id: undefined,
      item_order: itemIdx,
      cumplimiento_valor: '',
      comentarios_valor: item.comentarios_valor || ''
    }))
  }))
}

export default function MarketingInspectionManager(props: MarketingInspectionManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [inspection, setInspection] = useState<InspectionRRHH | null>(null)
  const [generalComments, setGeneralComments] = useState('')
  const [trendData, setTrendData] = useState<number[]>([85, 88, 87, 90, 89, 90])
  const [stats, setStats] = useState<any>(null)
  const [showFormulario, setShowFormulario] = useState(!!props.inspectionId)
  const [showSelector, setShowSelector] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showNavigationModal, setShowNavigationModal] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const pendingActionRef = useRef<(() => void) | null>(null)

  // Template a usar (override o default)
  const baseTemplate = props.templateOverride || getMarketingInspectionTemplateAreas()

  // Cargar stats e inspección inicial
  useEffect(() => {
    if (props.inspectionId) {
      loadInspection(props.inspectionId)
    } else {
      loadStats()
    }
  }, [props.inspectionId, props.locationId])

  // Interceptar navegación global cuando hay cambios sin guardar
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      if (!showFormulario || !hasUnsavedChanges) return

      const target = (e.target as HTMLElement).closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      if (!href) return

      // Permitir navegar al mismo detalle actual
      const currentInspectionPath = props.inspectionId ? `/inspections/marketing/${props.inspectionId}` : null
      if (currentInspectionPath && href === currentInspectionPath) return

      e.preventDefault()
      e.stopPropagation()
      setShowNavigationModal(true)
      setPendingNavigation(href)
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && showFormulario) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    document.addEventListener('click', handleLinkClick, true)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('click', handleLinkClick, true)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges, props.inspectionId, showFormulario])

  // Permite que componentes externos pidan una navegación protegida por el modal
  useEffect(() => {
    const handler = (evt: Event) => {
      const ce = evt as CustomEvent<{ onProceed?: () => void; href?: string }>
      const onProceed = ce?.detail?.onProceed
      const href = ce?.detail?.href

      if (!showFormulario || !hasUnsavedChanges) {
        if (onProceed) onProceed()
        else if (href) router.push(href)
        return
      }

      pendingActionRef.current = onProceed || null
      setPendingNavigation(href || null)
      setShowNavigationModal(true)
    }

    window.addEventListener('ziii:inspection-navigate', handler as EventListener)
    return () => window.removeEventListener('ziii:inspection-navigate', handler as EventListener)
  }, [hasUnsavedChanges, router, showFormulario])

  const proceedAfterUnsavedModal = () => {
    const action = pendingActionRef.current
    pendingActionRef.current = null
    if (action) {
      action()
      return
    }

    const destination = pendingNavigation || '/inspections/inbox'
    setPendingNavigation(null)
    router.push(destination)
  }

  const loadStats = async () => {
    setLoading(true)
    // Aquí cargarías las estadísticas reales desde la API
    // Por ahora usamos datos de ejemplo
    setStats({
      total: 10,
      completed: 5,
      pending: 5,
      avgScore: 88
    })
    setLoading(false)
  }

  const handleNewInspection = () => {
    const newInspection: InspectionRRHH = {
      location_id: props.locationId,
      department: props.departmentName,
      inspector_user_id: props.currentUser.id,
      inspector_name: props.userName,
      inspection_date: new Date().toISOString(),
      property_code: props.propertyCode,
      property_name: props.propertyName,
      status: 'draft',
      general_comments: '',
      areas: cloneTemplate(baseTemplate)
    }
    setInspection(newInspection)
    setShowFormulario(true)
    loadTrendData()
  }

  const goBackToDashboard = () => {
    setShowFormulario(false)
    setInspection(null)
    loadStats()
  }

  const handleBackToDashboard = () => {
    if (hasUnsavedChanges && showFormulario) {
      pendingActionRef.current = goBackToDashboard
      setPendingNavigation(null)
      setShowNavigationModal(true)
      return
    }
    goBackToDashboard()
  }

  const loadInspection = async (id: string) => {
    setLoading(true)
    const { data, error } = await InspectionsRRHHService.getInspectionById(id)
    if (error) {
      console.error('Error loading inspection:', error)
      alert('Error al cargar la inspección')
      setLoading(false)
      return
    }
    if (data) {
      setInspection(data)
      setGeneralComments(data.general_comments || '')
      loadTrendData()
      setShowFormulario(true)
    }
    setLoading(false)
  }

  const loadTrendData = async () => {
    // Aquí cargarías los datos de tendencia desde la API
    setTrendData([85, 88, 87, 90, 89, 90])
  }

  const handleSaveInspection = async () => {
    if (!inspection) return false

    setSaving(true)
    try {
      if (inspection.id) {
        // Actualizar inspección existente
        console.log('Guardando inspección existente:', inspection.id)
        console.log('=== DATOS QUE SE VAN A GUARDAR ===')
        console.log('Areas:', inspection.areas.length)
        inspection.areas.forEach((area, aIdx) => {
          console.log(`Área ${aIdx}: ${area.area_name}`)
          area.items.forEach((item, iIdx) => {
            console.log(`  Item ${iIdx}: cumplimiento=${item.cumplimiento_valor}, calif=${item.calif_valor}, comentarios=${item.comentarios_valor}`)
          })
        })
        const { data, error } = await InspectionsRRHHService.updateInspectionItems(
          inspection.id,
          inspection.areas,
          generalComments
        )

        if (error) {
          console.error('Error al guardar:', error)
          alert('Error al guardar: ' + (error.message || 'Desconocido'))
          setSaving(false)
          return false
        }

        console.log('Guardado exitoso')
        setHasUnsavedChanges(false)
        setSaving(false)
        return true
      } else {
        // Crear nueva inspección
        console.log('Creando nueva inspección')
        const dataToSave = {
          ...inspection,
          general_comments: generalComments
        }

        const { data, error } = await InspectionsRRHHService.createInspection(dataToSave)

        if (error) {
          console.error('Error al crear:', error)
          alert('Error al crear inspección: ' + (error.message || 'Desconocido'))
          setSaving(false)
          return false
        }

        if (data) {
          console.log('Inspección creada con ID:', data.id)
          setInspection(data)
          setHasUnsavedChanges(false)
          setSaving(false)
          return true
        }

        setSaving(false)
        return false
      }
    } catch (err) {
      console.error('Error inesperado al guardar:', err)
      alert('Error inesperado')
      setSaving(false)
      return false
    }
  }

  const handleFinalizeInspection = async () => {
    if (!inspection) return

    // Guardar antes de finalizar
    const saved = await handleSaveInspection()
    if (!saved) return

    if (!inspection.id) {
      alert('No se puede finalizar sin ID de inspección')
      return
    }

    const confirmacion = confirm('¿Deseas finalizar esta inspección? Ya no podrás editarla.')
    if (!confirmacion) return

    const { data, error } = await InspectionsRRHHService.updateInspectionStatus(inspection.id, 'completed')
    if (error) {
      console.error('Error al finalizar:', error)
      alert('Error al finalizar inspección')
      return
    }

    alert('Inspección finalizada exitosamente')
    setInspection({ ...inspection, status: 'completed' })
    setShowFormulario(false)
    loadStats()
  }

  const handleSaveFromModal = async (complete: boolean) => {
    if (!inspection) return false

    const saved = await handleSaveInspection()
    if (!saved) return false

    if (!complete) return true

    if (!inspection.id) return false

    const { error } = await InspectionsRRHHService.updateInspectionStatus(inspection.id, 'completed')
    if (error) {
      console.error('Error al finalizar:', error)
      alert('Error al finalizar inspección')
      return false
    }

    setInspection((prev) => (prev ? { ...prev, status: 'completed' } : prev))
    return true
  }

  const handleGeneratePDF = async () => {
    if (!inspection) return
    
    // Guardar cambios antes de generar PDF
    await handleSaveInspection()
    
    const generator = new InspectionRRHHPDFGenerator()
    await generator.download(inspection)
  }

  const handleUpdateItem = (areaName: string, itemId: number, field: string, value: any) => {
    console.log('=== handleUpdateItem LLAMADO ===', { areaName, itemId, field, value })
    setHasUnsavedChanges(true)
    setInspection((prev) => {
      if (!prev) return prev
      console.log('Areas disponibles:', prev.areas.map(a => a.area_name))
      const updated = {
        ...prev,
        areas: prev.areas.map((area) => {
          if (area.area_name !== areaName) return area
          console.log('Área encontrada:', area.area_name)
          return {
            ...area,
            items: area.items.map((item, idx) => {
              if (idx + 1 !== itemId) return item
              console.log('Item encontrado:', { idx, itemId, field, value, itemActual: item })
              return { ...item, [field]: value }
            })
          }
        })
      }
      console.log('Nuevo estado inspection.areas[0].items[0]:', updated.areas[0]?.items[0])
      return updated
    })
  }

  return (
    <div>
      {/* Loading con barra de progreso */}
      {loading && (
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
          <div className="w-full max-w-md px-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
                <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Cargando inspección</h2>
              <p className="text-sm text-slate-500">Preparando formulario...</p>
            </div>
            
            {/* Barra de progreso */}
            <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-slate-700 via-slate-900 to-slate-700 rounded-full animate-[loading_1.5s_ease-in-out_infinite]"
                   style={{ width: '40%' }}>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Si formulario abierto O hay inspección cargada, mostrar el formulario */}
      {showFormulario && inspection ? (
        /* Mostrar el formulario rellenable */
        (() => {
          // Convertir inspection a formato del dashboard
          const dashboardData = inspection.areas.map((area) => ({
            area: area.area_name,
            items: area.items.map((item, idx) => ({
              id: idx + 1,
              descripcion: item.descripcion,
              tipo_dato: item.tipo_dato,
              cumplimiento_valor: item.cumplimiento_valor,
              cumplimiento_editable: item.cumplimiento_editable,
              calif_valor: item.calif_valor,
              calif_editable: item.calif_editable,
              comentarios_valor: item.comentarios_valor,
              comentarios_libre: item.comentarios_libre
            })),
            calificacion_area_fija: area.calculated_score || 0
          }))

          return (
            <div>
              <InspectionDashboard
                departmentName={props.departmentName}
                propertyCode={props.propertyCode}
                propertyName={props.propertyName}
                inspectionData={dashboardData}
                onUpdateItem={handleUpdateItem}
                trendData={trendData}
                onSave={handleSaveInspection}
                onGeneratePDF={handleGeneratePDF}
                generalComments={generalComments}
                onUpdateGeneralComments={setGeneralComments}
                saving={saving}
                inspectionStatus={inspection.status}
                onUnsavedChanges={setHasUnsavedChanges}
                onBack={handleBackToDashboard}
              />
            </div>
          )
        })()
      ) : (
        /* Mostrar dashboard de estadísticas */
        <InspectionStatsDashboard
          departmentName={props.departmentName}
          propertyCode={props.propertyCode}
          propertyName={props.propertyName}
          locationId={props.locationId}
          stats={stats}
          onNewInspection={handleNewInspection}
          isAdmin={props.isAdmin}
          isRRHH={props.isMarketing}
          onChangeProperty={props.onChangeProperty}
          onChangeDepartment={props.onChangeDepartment}
        />
      )}

      {/* Modal Global de Confirmación de Cambios Sin Guardar */}
      {showNavigationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2m0-16h.01M12 3a9 9 0 110 18 9 9 0 010-18z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Cambios sin guardar</h3>
            </div>

            <p className="text-slate-600 mb-6">Tienes cambios sin guardar en la inspección. ¿Qué deseas hacer?</p>

            <div className="space-y-3">
              <button
                disabled={saving}
                onClick={async () => {
                  const success = await handleSaveFromModal(false)
                  if (success) {
                    setHasUnsavedChanges(false)
                    setShowNavigationModal(false)
                    proceedAfterUnsavedModal()
                  }
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Guardar como Borrador'}
              </button>

              <button
                disabled={saving}
                onClick={async () => {
                  const success = await handleSaveFromModal(true)
                  if (success) {
                    setHasUnsavedChanges(false)
                    setShowNavigationModal(false)
                    proceedAfterUnsavedModal()
                  }
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Guardar y Completar'}
              </button>

              <button
                disabled={saving}
                onClick={() => {
                  setHasUnsavedChanges(false)
                  setShowNavigationModal(false)
                  proceedAfterUnsavedModal()
                }}
                className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:opacity-50"
              >
                Descartar Cambios
              </button>

              <button
                disabled={saving}
                onClick={() => {
                  setShowNavigationModal(false)
                  setPendingNavigation(null)
                }}
                className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Continuar Editando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
