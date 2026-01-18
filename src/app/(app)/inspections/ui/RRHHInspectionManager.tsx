'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import InspectionStatsDashboard from './InspectionStatsDashboard'
import InspectionDashboard from './InspectionDashboard'
import { InspectionsRRHHService, type InspectionRRHH, type InspectionRRHHArea } from '@/lib/services/inspections-rrhh.service'
import { InspectionRRHHPDFGenerator } from '@/lib/services/inspections-rrhh-pdf.service'
import type { User } from '@supabase/supabase-js'

interface RRHHInspectionManagerProps {
  inspectionId?: string
  locationId: string
  departmentName: string
  propertyCode: string
  propertyName: string
  currentUser: User
  userName: string
  mode?: 'create' | 'edit' | 'view'
  templateOverride?: InspectionRRHHArea[] | null
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

// Datos de template inicial (las 10 áreas de RRHH)
const RRHH_TEMPLATE: InspectionRRHHArea[] = [
  {
    area_name: "Planificación y control de plantilla",
    area_order: 0,
    items: [
      { item_order: 0, descripcion: "Seguimiento vacantes actuales", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Uso de plataformas para posteo de vacantes", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "% Rotación actual de plantilla aceptable", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Plan de inducción a colaboradores",
    area_order: 1,
    items: [
      { item_order: 0, descripcion: "Inducción de personal de nuevo ingreso", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Inducción al puesto (Formato espejo y líder)", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "Salarios emocionales", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 3, descripcion: "Conocimiento de Reglamento Interno", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 4, descripcion: "Entrega de PIN Nuevo Ingreso", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Evaluación y gestión de desempeño",
    area_order: 2,
    items: [
      { item_order: 0, descripcion: "Aplicación de evaluación de desempeño", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Seguimiento puntual de renovaciones", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Reconocimiento y recompensas",
    area_order: 3,
    items: [
      { item_order: 0, descripcion: "Festejo Cumpleaños", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Celebración Colaborador del Mes", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "Celebración aniversarios", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Prevención Social y laboral",
    area_order: 4,
    items: [
      { item_order: 0, descripcion: "Integración de comisiones mixtas", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Tarjetas checadoras completas", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "Recibos de nómina completos", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 3, descripcion: "Papeletas de vacaciones", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 4, descripcion: "Tiempo adicional autorizado", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Áreas comunes colaboradores",
    area_order: 5,
    items: [
      { item_order: 0, descripcion: "Comedor de colaboradores", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Vestidores/Lockers", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "Baños colaboradores", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 3, descripcion: "Oficinas", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Calendario Actividades",
    area_order: 6,
    items: [
      { item_order: 0, descripcion: "Actividad de mes", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Capacitaciones del mes", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Expedientes",
    area_order: 7,
    items: [
      { item_order: 0, descripcion: "Documentación completa colaborador", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Retención Infonavit", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "Retención Foncacot", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 3, descripcion: "Aceptación Fondo de ahorro", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 4, descripcion: "Anexo sindicato", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 5, descripcion: "Política salarios emocionales", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 6, descripcion: "Formato inducción", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 7, descripcion: "Perfil de puesto", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 8, descripcion: "Contratos determinado/indeterminado", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Imagen",
    area_order: 8,
    items: [
      { item_order: 0, descripcion: "Higiene personal", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Uniforme completo (Conforme a la política)", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "Uso de gafete/PIN nuevo ingreso", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 3, descripcion: "Uso de Cubrebocas", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Vinculaciones y oferta académica",
    area_order: 9,
    items: [
      { item_order: 0, descripcion: "Vinculaciones con dependencias gubernamentales", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Vinculaciones con Universidades Locales", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "Vinculaciones con dependencias no lucrativas", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  }
]

export default function RRHHInspectionManager(props: RRHHInspectionManagerProps) {
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

      // Permitir links a inspecciones
      if (href === '/inspections' || href.startsWith('/inspections/')) return

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

  // Cargar estadísticas al montar
  useEffect(() => {
    loadStats()
    
    if (props.inspectionId) {
      loadInspection(props.inspectionId)
    }
  }, [props.inspectionId])

  const loadStats = async () => {
    const { data } = await InspectionsRRHHService.getLocationStats(props.locationId)
    console.log('📊 loadStats data:', data)
    if (data) {
      setStats(data)
      
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
      : RRHH_TEMPLATE

    // Crear nueva inspección
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

  const handleBackToDashboard = () => {
    setShowFormulario(false)
    setInspection(null)
    loadStats()
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
    const { data } = await InspectionsRRHHService.getRecentInspectionsTrend(props.locationId, 5)
    if (data && data.length > 0) {
      setTrendData(data)
    }
  }

  const handleSave = async (completeInspection = false) => {
    if (!inspection) return

    setSaving(true)

    try {
      // Actualizar comentarios
      inspection.general_comments = generalComments

      if (completeInspection) {
        inspection.status = 'completed'
      }

      if (inspection.id) {
        // Actualizar existente
        const { data, error } = await InspectionsRRHHService.updateInspectionItems(
          inspection.id,
          inspection.areas,
          generalComments
        )

        if (error) {
          alert('Error al guardar: ' + (error.message || 'Desconocido'))
          setSaving(false)
          return
        }

        if (completeInspection) {
          await InspectionsRRHHService.updateInspectionStatus(inspection.id, 'completed')
        }

        alert('Inspección guardada exitosamente')
        
        // Recargar para tener stats actualizadas
        await loadInspection(inspection.id)
      } else {
        // Crear nueva
        const { data, error } = await InspectionsRRHHService.createInspection(inspection)

        if (error) {
          alert('Error al crear inspección: ' + (error.message || 'Desconocido'))
          setSaving(false)
          return
        }

        if (data) {
          alert('Inspección creada exitosamente')
          setInspection(data)
          
          // Redirigir a modo edición
          router.push(`/inspections/rrhh/${data.id}`)
        }
      }
    } catch (error: any) {
      console.error('Save error:', error)
      alert('Error al guardar: ' + (error.message || 'Desconocido'))
    }

    setSaving(false)
  }

  const handleGeneratePDF = async () => {
    if (!inspection) return

    const generator = new InspectionRRHHPDFGenerator()
    await generator.download(inspection)
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
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Seleccionar Inspección</h1>
              <p className="text-slate-600">Hay múltiples inspecciones para esta propiedad</p>
              
              {hasDrafts && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-900 font-semibold text-sm">
                    ⚠️ Tienes inspecciones iniciadas que puedes reanudar
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
      />
    )
  }

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

  const handleUpdateItem = (areaName: string, itemId: number, field: string, value: any) => {
    setInspection((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        areas: prev.areas.map((area) => {
          if (area.area_name !== areaName) return area
          return {
            ...area,
            items: area.items.map((item, idx) => {
              if (idx + 1 !== itemId) return item
              return { ...item, [field]: value }
            })
          }
        })
      }
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
            onBack={() => {
              window.location.href = '/inspections'
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
                onClick={() => {
                  setHasUnsavedChanges(false)
                  handleSave(false)
                  setTimeout(() => {
                    router.push(pendingNavigation || '/inspections')
                    setShowNavigationModal(false)
                    setPendingNavigation(null)
                  }, 800)
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Guardar como Borrador
              </button>

              <button
                onClick={() => {
                  setHasUnsavedChanges(false)
                  handleSave(true)
                  setTimeout(() => {
                    router.push(pendingNavigation || '/inspections')
                    setShowNavigationModal(false)
                    setPendingNavigation(null)
                  }, 800)
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Guardar y Completar
              </button>

              <button
                onClick={() => {
                  setHasUnsavedChanges(false)
                  setShowNavigationModal(false)
                  setPendingNavigation(null)
                  router.push(pendingNavigation || '/inspections')
                }}
                className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
              >
                Descartar Cambios
              </button>

              <button
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
