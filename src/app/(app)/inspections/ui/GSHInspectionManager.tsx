'use client'

import { useEffect, useState } from 'react'
import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import InspectionStatsDashboard from './InspectionStatsDashboard'
import InspectionDashboard from './InspectionDashboard'
import { InspectionsGSHService, type InspectionGSH, type InspectionGSHArea } from '@/lib/services/inspections-gsh.service'
import { InspectionGSHPDFGenerator } from '@/lib/services/inspections-gsh-pdf.service'
import type { User } from '@supabase/supabase-js'
import { getGSHInspectionTemplate } from '@/lib/templates/inspection-gsh-template'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

interface GSHInspectionManagerProps {
  inspectionId?: string
  locationId: string
  departmentName: string
  propertyCode: string
  propertyName: string
  currentUser: User
  userName: string
  mode?: 'create' | 'edit' | 'view'
  templateOverride?: InspectionGSHArea[] | null
  isAdmin?: boolean
  isGSH?: boolean
  filterByCurrentUser?: boolean
  onChangeProperty?: () => void
  onChangeDepartment?: () => void
}

function cloneTemplate(template: InspectionGSHArea[]): InspectionGSHArea[] {
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

// Template de GSH (importado desde archivo de template)
const GSH_TEMPLATE: InspectionGSHArea[] = getGSHInspectionTemplate().areas


export default function GSHInspectionManager(props: GSHInspectionManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [inspection, setInspection] = useState<InspectionGSH | null>(null)
  const [generalComments, setGeneralComments] = useState('')
  const [trendData, setTrendData] = useState<number[]>([85, 88, 87, 90, 89, 90])
  const [stats, setStats] = useState<any>(null)
  const [showFormulario, setShowFormulario] = useState(!!props.inspectionId)
  const [showSelector, setShowSelector] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showNavigationModal, setShowNavigationModal] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const pendingActionRef = useRef<(() => void) | null>(null)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [pendingDraftInspection, setPendingDraftInspection] = useState<any>(null)
  const [showNewInspectionModal, setShowNewInspectionModal] = useState(false)

  // Interceptar navegación global
  useEffect(() => {
    // Listener para clicks en links
    const handleLinkClick = (e: MouseEvent) => {
      if (!showFormulario || !hasUnsavedChanges) return

      const target = (e.target as HTMLElement).closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      if (!href) return

      // Solo permitir navegación sin advertencia a la misma inspección actual
      // Cualquier otra navegación (incluyendo inbox, dashboard, etc.) requiere confirmación
      const currentInspectionPath = props.inspectionId ? `/inspections/gsh/${props.inspectionId}` : null
      if (currentInspectionPath && href === currentInspectionPath) return

      e.preventDefault()
      e.stopPropagation()
      setShowNavigationModal(true)
      setPendingNavigation(href)
    }

    // Listener para beforeunload
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
  }, [showFormulario, hasUnsavedChanges])

  // Permite que componentes externos (ej. tabs Tablero/Nueva en corporativo)
  // pidan una navegación/acción protegida por el modal de cambios sin guardar.
  useEffect(() => {
    const handler = (evt: Event) => {
      const ce = evt as CustomEvent<{ onProceed?: () => void; href?: string }>
      const onProceed = ce?.detail?.onProceed
      const href = ce?.detail?.href

      // Si no hay formulario abierto o no hay cambios, proceder inmediatamente
      if (!showFormulario || !hasUnsavedChanges) {
        if (onProceed) onProceed()
        else if (href) router.push(href)
        return
      }

      // Abrir modal y guardar acción pendiente
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

  // Cargar estadísticas al montar
  useEffect(() => {
    // Si ya tenemos un inspectionId específico (viene de bandeja/URL), cargar directamente
    if (props.inspectionId) {
      loadInspection(props.inspectionId)
      return
    }
    
    // Solo cargar stats y mostrar modales si NO hay inspectionId
    loadStats()
  }, [props.inspectionId])

  const loadStats = async () => {
    const filterByCurrentUser = props.filterByCurrentUser ?? true
    const { data } = await InspectionsGSHService.getLocationStats(props.locationId, filterByCurrentUser)
    console.log('📊 loadStats data:', data)
    if (data) {
      setStats(data)

      // En vista corporativa (sin filtro por usuario), mantener el tablero en modo KPIs/lista
      // y no forzar modales/selección de borradores.
      if (!filterByCurrentUser) {
        return
      }
      
      // Si hay inspecciones recientes, analizar y cargar
      if (data.recentInspections && data.recentInspections.length > 0) {
        console.log('✅ Hay inspecciones:', data.recentInspections.length)
        // Priorizar inspecciones en borrador (draft)
        const draftInspections = data.recentInspections.filter((insp: any) => insp.status === 'draft')
        
        // Si hay inspecciones en borrador
        if (draftInspections.length > 0) {
          // Si hay solo una draft, mostrar modal para preguntar
          if (draftInspections.length === 1 && data.recentInspections.length === 1) {
            setPendingDraftInspection(draftInspections[0])
            setShowDraftModal(true)
            return
          }
          // Si hay varias o mix de draft/completadas, mostrar selector con destaque
          setShowSelector(true)
          return
        }
        
        // Si todas están completadas, mostrar selector
        if (data.recentInspections.length === 1) {
          setTimeout(() => loadInspection(data.recentInspections[0].id), 100)
          return
        }
        
        setShowSelector(true)
        return
      }
      
      // Si no hay inspecciones, mostrar modal de confirmación
      console.log('🆕 No hay inspecciones, mostrando modal')
      setShowNewInspectionModal(true)
    }
  }

  const handleNewInspection = () => {
    setShowNewInspectionModal(false)
    const baseTemplate = props.templateOverride && props.templateOverride.length > 0
      ? props.templateOverride
      : GSH_TEMPLATE

    // Crear nueva inspección
    const newInspection: InspectionGSH = {
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

  const handleBackToDashboard = () => {
    setShowFormulario(false)
    setInspection(null)
    loadStats()
  }

  const loadInspection = async (id: string) => {
    setLoading(true)
    const { data, error } = await InspectionsGSHService.getInspectionById(id)
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
    const { data } = await InspectionsGSHService.getRecentInspectionsTrend(props.locationId, 5)
    if (data && data.length > 0) {
      setTrendData(data)
    }
  }

  const handleSave = async (completeInspection = false): Promise<boolean> => {
    console.log('🟢🟢🟢 HANDLESAVE LLAMADO - completeInspection:', completeInspection)
    
    if (!inspection) {
      console.error('handleSave: No hay inspección para guardar')
      alert('Error: No hay inspección cargada para guardar')
      return false
    }

    setSaving(true)

    try {
      // Actualizar comentarios
      inspection.general_comments = generalComments

      if (completeInspection) {
        inspection.status = 'completed'
      }

      if (inspection.id) {
        // Actualizar existente
        console.log('Guardando inspección existente:', inspection.id)
        console.log('=== DATOS QUE SE VAN A GUARDAR ===')
        console.log('Areas:', inspection.areas.length)
        inspection.areas.forEach((area, aIdx) => {
          console.log(`Área ${aIdx}: ${area.area_name}`)
          area.items.forEach((item, iIdx) => {
            console.log(`  Item ${iIdx}: cumplimiento=${item.cumplimiento_valor}, calif=${item.calif_valor}, comentarios=${item.comentarios_valor}`)
          })
        })
        const { data, error } = await InspectionsGSHService.updateInspectionItems(
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

        if (completeInspection) {
          console.log('🔵 Completando inspección y enviando notificaciones...')
          
          // Llamar al endpoint que hará AMBAS cosas: completar + notificar
          // Esto garantiza que el status esté actualizado cuando se verifiquen los items críticos
          try {
            const completeResponse = await fetch('/api/inspections/complete-and-notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ inspectionId: inspection.id, inspectionType: 'gsh' })
            })
            
            console.log('📬 Respuesta recibida, status:', completeResponse.status)
            
            if (completeResponse.ok) {
              const result = await completeResponse.json()
              console.log('✅ Respuesta:', result)
              
              // Recargar la inspección completa desde la BD para obtener el status actualizado
              console.log('🔄 Recargando inspección desde BD...')
              await loadInspection(inspection.id)
              
              // Marcar como sin cambios pendientes
              setHasUnsavedChanges(false)
              
              if (result.criticalItemsCount > 0) {
                alert(`✅ Inspección completada.\n\n⚠️ Se detectaron ${result.criticalItemsCount} ítems críticos (< 8/10).\n\nSe han enviado notificaciones a ${result.adminsNotified} administradores.`)
              } else {
                alert('✅ Inspección completada exitosamente.')
              }
            } else {
              const errorText = await completeResponse.text()
              console.error('❌ Error al completar:', errorText)
              alert('Error al completar la inspección. Por favor intenta de nuevo.')
              setSaving(false)
              return false
            }
          } catch (completeError) {
            console.error('❌ Error en complete-and-notify:', completeError)
            alert('Error al completar la inspección. Por favor intenta de nuevo.')
            setSaving(false)
            return false
          }
        }

        console.log('Inspección guardada exitosamente')
        setSaving(false)
        return true
      } else {
        // Crear nueva
        console.log('Creando nueva inspección')
        const { data, error } = await InspectionsGSHService.createInspection(inspection)

        if (error) {
          console.error('Error al crear:', error)
          alert('Error al crear inspección: ' + (error.message || 'Desconocido'))
          setSaving(false)
          return false
        }

        if (data) {
          console.log('Inspección creada:', data.id)
          setInspection(data)
          
          // Si se debe completar, llamar al endpoint de notificaciones
          if (completeInspection) {
            console.log('🔵 Completando inspección recién creada y enviando notificaciones...')
            
            try {
              const completeResponse = await fetch('/api/inspections/complete-and-notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inspectionId: data.id, inspectionType: 'gsh' })
              })
              
              console.log('📬 Respuesta recibida, status:', completeResponse.status)
              
              if (completeResponse.ok) {
                const result = await completeResponse.json()
                console.log('✅ Respuesta:', result)
                
                if (data.id) {
                  await loadInspection(data.id)
                }
                setHasUnsavedChanges(false)
                
                if (result.criticalItemsCount > 0) {
                  alert(`✅ Inspección completada.\n\n⚠️ Se detectaron ${result.criticalItemsCount} ítems críticos (< 8/10).\n\nSe han enviado notificaciones a ${result.adminsNotified} administradores.`)
                } else {
                  alert('✅ Inspección completada exitosamente.')
                }
              } else {
                const errorText = await completeResponse.text()
                console.error('❌ Error al completar:', errorText)
                alert('Error al completar la inspección. Por favor intenta de nuevo.')
                setSaving(false)
                return false
              }
            } catch (completeError) {
              console.error('❌ Error en complete-and-notify:', completeError)
              alert('Error al completar la inspección. Por favor intenta de nuevo.')
              setSaving(false)
              return false
            }
          }
          
          setSaving(false)
          return true
        }
      }
    } catch (error: any) {
      console.error('Save error:', error)
      alert('Error al guardar: ' + (error.message || 'Desconocido'))
      setSaving(false)
      return false
    }

    setSaving(false)
    return false
  }

  const handleGeneratePDF = async () => {
    if (!inspection) return

    const supabase = createSupabaseBrowserClient()
    const inspectionWithSignedEvidence: InspectionGSH = {
      ...inspection,
      areas: await Promise.all(
        (inspection.areas || []).map(async (area: any) => ({
          ...area,
          items: await Promise.all(
            (area.items || []).map(async (item: any) => {
              const evidences = (item.evidences || [])
              if (evidences.length === 0) return item

              const updatedEvidences = await Promise.all(
                evidences.map(async (ev: any) => {
                  if (ev?.signed_url) return ev
                  if (!ev?.storage_path) return ev
                  const { data, error } = await supabase.storage
                    .from('inspection-evidences')
                    .createSignedUrl(String(ev.storage_path), 3600)
                  if (error || !data?.signedUrl) return { ...ev, signed_url: null }
                  return { ...ev, signed_url: data.signedUrl }
                })
              )

              return { ...item, evidences: updatedEvidences }
            })
          )
        }))
      )
    }

    const storageKey = `inspection:pdf:brandLogo:${inspection.property_code || 'default'}`
    const previous = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null
    const input = typeof window !== 'undefined'
      ? window.prompt(
          "Logo del cliente para el PDF (opcional).\n\n- Escribe una URL https://...\n- O una clave interna (ej: alzen)\n- O 'none' para no mostrar logo\n\nDeja vacío para usar el último/default.",
          previous ?? 'alzen'
        )
      : null

    const normalized = (input ?? '').trim()
    const selected = normalized.length > 0 ? normalized : (previous ?? 'alzen')

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, selected)
    }

    const lower = selected.toLowerCase()
    const brandLogoKey = lower === 'none' ? null : !selected.startsWith('http') ? selected : null
    const brandLogoUrl = lower === 'none' ? null : selected.startsWith('http') ? selected : null

    const generator = new InspectionGSHPDFGenerator({ brandLogoKey, brandLogoUrl })
    await generator.download(inspectionWithSignedEvidence)
  }

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

  if (!inspection) {
    // Si estamos cargando una inspección existente, mostrar spinner
    if (props.inspectionId && loading) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3"></div>
            <p className="text-slate-600">Cargando inspección...</p>
          </div>
        </div>
      )
    }
    
    // Si no hay inspección y se intenta cargar una, mostrar error
    if (props.inspectionId && !loading) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-600 mb-4">No se pudo cargar la inspección</p>
            <button
              onClick={() => window.location.href = '/inspections'}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Volver a Inspecciones
            </button>
          </div>
        </div>
      )
    }
    
    // Si hay múltiples inspecciones, mostrar selector
    if (showSelector && stats?.recentInspections && stats.recentInspections.length > 1) {
      const draftInspections = stats.recentInspections.filter((insp: any) => insp.status === 'draft')
      const hasDrafts = draftInspections.length > 0
      
      return (
        <div className="min-h-screen bg-slate-50 p-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Mis Inspecciones</h1>
              <p className="text-slate-600">Selecciona una inspección para continuar o ver</p>
              
              {hasDrafts && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-900 font-semibold text-sm">
                    ⚠️ Tienes inspecciones en borrador que puedes continuar
                  </p>
                </div>
              )}
            </div>
            
            <div className="grid gap-3">
              {stats.recentInspections.map((insp: any) => (
                <button
                  key={insp.id}
                  onClick={() => {
                    setShowSelector(false)
                    loadInspection(insp.id)
                  }}
                  className={`text-left p-4 rounded-lg transition-all ${
                    insp.status === 'draft' 
                      ? 'bg-blue-50 border-2 border-blue-400 hover:border-blue-500 hover:shadow-md' 
                      : 'bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{insp.inspector_name}</h3>
                        {insp.status === 'draft' && (
                          <span className="text-xs font-bold text-white bg-blue-600 px-2 py-1 rounded">
                            EN PROCESO
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        {new Date(insp.inspection_date).toLocaleDateString('es-MX', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-slate-900">
                        {insp.average_score ? `${Math.round(insp.average_score * 10)}%` : '—'}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        insp.status === 'draft'
                          ? 'bg-slate-100 text-slate-700'
                          : insp.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : insp.status === 'approved'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-rose-100 text-rose-700'
                      }`}>
                        {insp.status === 'draft' ? 'Borrador' :
                         insp.status === 'completed' ? 'Completada' :
                         insp.status === 'approved' ? 'Aprobada' :
                         insp.status === 'rejected' ? 'Rechazada' : insp.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
              
              <button
                onClick={handleNewInspection}
                className="mt-4 p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                + Nueva Inspección
              </button>
            </div>
          </div>
        </div>
      )
    }
    
    // Si no hay inspectionId, mostrar el dashboard de estadísticas
    return (
      <InspectionStatsDashboard
        departmentName={props.departmentName}
        propertyCode={props.propertyCode}
        propertyName={props.propertyName}
        locationId={props.locationId}
        stats={stats}
        onNewInspection={handleNewInspection}
        isAdmin={props.isAdmin}
        isGSH={props.isGSH}
        onChangeProperty={props.onChangeProperty}
        onChangeDepartment={props.onChangeDepartment}
      />
    )
  }

  // Convertir inspection a formato del dashboard
  const dashboardData = inspection.areas.map((area) => ({
    area: area.area_name,
    items: area.items.map((item, idx) => ({
      id: idx + 1,
      db_id: item.id,
      descripcion: item.descripcion,
      tipo_dato: item.tipo_dato,
      cumplimiento_valor: item.cumplimiento_valor,
      cumplimiento_editable: item.cumplimiento_editable,
      calif_valor: item.calif_valor,
      calif_editable: item.calif_editable,
      comentarios_valor: item.comentarios_valor,
      comentarios_libre: item.comentarios_libre,
      evidences: (item as any).evidences || []
    })),
    calificacion_area_fija: area.calculated_score || 0
  }))

  const handleEvidenceUpsert = (itemDbId: string, evidence: any) => {
    setHasUnsavedChanges(true)
    setInspection((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        areas: prev.areas.map((area) => ({
          ...area,
          items: area.items.map((item) => {
            if (item.id !== itemDbId) return item
            const existing = (item as any).evidences || []
            const withoutSlot = existing.filter((e: any) => e?.slot !== evidence?.slot)
            return { ...item, evidences: [...withoutSlot, evidence] }
          })
        }))
      }
    })
  }

  const handleEvidenceRemove = (itemDbId: string, slot: 1 | 2) => {
    setHasUnsavedChanges(true)
    setInspection((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        areas: prev.areas.map((area) => ({
          ...area,
          items: area.items.map((item) => {
            if (item.id !== itemDbId) return item
            const existing = (item as any).evidences || []
            return { ...item, evidences: existing.filter((e: any) => e?.slot !== slot) }
          })
        }))
      }
    })
  }

  const handleUpdateItem = (areaName: string, itemId: number, field: string, value: any) => {
    console.log('=== handleUpdateItem LLAMADO ===', { areaName, itemId, field, value })
    setHasUnsavedChanges(true) // Marcar que hay cambios sin guardar
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
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Cargando Inspección</h3>
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
        <div>
          <InspectionDashboard
            departmentName={props.departmentName}
            propertyCode={props.propertyCode}
            propertyName={props.propertyName}
            inspectionId={inspection.id}
            inspectionType="gsh"
            inspectionData={dashboardData}
            onUpdateItem={handleUpdateItem}
            generalComments={generalComments}
            onUpdateGeneralComments={setGeneralComments}
            trendData={trendData}
            onSave={handleSave}
            onGeneratePDF={handleGeneratePDF}
            saving={saving}
            inspectionStatus={inspection.status}
            onUnsavedChanges={setHasUnsavedChanges}
            onEvidenceUpsert={handleEvidenceUpsert}
            onEvidenceRemove={handleEvidenceRemove}
            onBack={() => {
              const goBack = props.onChangeProperty || (() => {
                window.location.href = '/inspections'
              })

              if (hasUnsavedChanges && showFormulario) {
                pendingActionRef.current = goBack
                setPendingNavigation(null)
                setShowNavigationModal(true)
                return
              }

              goBack()
            }}
          />
        </div>
      ) : !showNewInspectionModal ? (
        /* Si no hay formulario abierto, mostrar el dashboard de estadísticas */
        <InspectionStatsDashboard
          departmentName={props.departmentName}
          propertyCode={props.propertyCode}
          propertyName={props.propertyName}
          locationId={props.locationId}
          stats={stats}
          onNewInspection={handleNewInspection}
          isAdmin={props.isAdmin}
          isGSH={props.isGSH}
          onChangeProperty={props.onChangeProperty}
          onChangeDepartment={props.onChangeDepartment}
        />
      ) : null}

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
              <h3 className="text-lg font-bold text-slate-900">
                Cambios sin guardar
              </h3>
            </div>

            <p className="text-slate-600 mb-6">
              Tienes cambios sin guardar en la inspección. ¿Qué deseas hacer?
            </p>

            <div className="space-y-3">
              <button
                disabled={saving}
                onClick={async () => {
                  const success = await handleSave(false) // Guardar como borrador
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
                  const success = await handleSave(true) // Guardar y completar
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

      {/* Modal de Borrador Detectado */}
      {showDraftModal && pendingDraftInspection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Inspección en Progreso
              </h3>
            </div>

            <p className="text-slate-600 mb-2">
              Tienes una inspección iniciada que no has completado.
            </p>
            <p className="text-slate-500 text-sm mb-6">
              ¿Deseas continuar donde la dejaste o crear una nueva?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  loadInspection(pendingDraftInspection.id)
                  setShowDraftModal(false)
                  setPendingDraftInspection(null)
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Continuar Inspección
              </button>

              <button
                onClick={() => {
                  handleNewInspection()
                  setShowDraftModal(false)
                  setPendingDraftInspection(null)
                }}
                className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear Nueva Inspección
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación - Nueva Inspección */}
      {showNewInspectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Iniciar Inspección
              </h3>
            </div>

            <p className="text-slate-600 mb-2">
              ¿Deseas iniciar una nueva inspección para esta propiedad?
            </p>
            <p className="text-slate-500 text-sm mb-6">
              {props.propertyCode} • {props.propertyName}
            </p>

            <div className="space-y-3">
              <button
                onClick={handleNewInspection}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Sí, Iniciar Inspección
              </button>

              <button
                onClick={() => {
                  setShowNewInspectionModal(false)
                  window.location.href = '/inspections'
                }}
                className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
