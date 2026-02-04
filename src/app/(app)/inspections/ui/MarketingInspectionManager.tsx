'use client'

import { useEffect, useState } from 'react'
import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import InspectionStatsDashboard from './InspectionStatsDashboard'
import InspectionDashboard from './InspectionDashboard'
import { InspectionsRRHHService, type InspectionRRHH, type InspectionRRHHArea } from '@/lib/services/inspections-rrhh.service'
import { InspectionRRHHPDFGenerator } from '@/lib/services/inspections-rrhh-pdf.service'
import type { User } from '@supabase/supabase-js'

interface MarketingInspectionManagerProps {
  propertyCode: string
  propertyName: string
  locationId: string
  departmentName: string
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

// Template de inspección para Marketing
const MARKETING_TEMPLATE: InspectionRRHHArea[] = [
  {
    area_name: "Identidad de Marca",
    area_order: 0,
    items: [
      { item_order: 0, descripcion: "Manual de identidad corporativa actualizado", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Uso correcto de logotipos y colores institucionales", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "Consistencia visual en todos los puntos de contacto", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 3, descripcion: "Señalización y branding en instalaciones", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Presencia Digital",
    area_order: 1,
    items: [
      { item_order: 0, descripcion: "Sitio web actualizado y funcional", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Optimización SEO implementada", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "Contenido web relevante y actualizado", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 3, descripcion: "Sistema de reservas online operativo", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 4, descripcion: "Google My Business actualizado", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Redes Sociales",
    area_order: 2,
    items: [
      { item_order: 0, descripcion: "Calendario de contenidos mensual", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Frecuencia de publicación según estrategia", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "Engagement y respuesta a comentarios", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 3, descripcion: "Calidad del contenido visual", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 4, descripcion: "Crecimiento de seguidores y alcance", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Campañas y Promociones",
    area_order: 3,
    items: [
      { item_order: 0, descripcion: "Plan de campañas del periodo", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Materiales promocionales actualizados", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "Seguimiento de resultados de campañas", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 3, descripcion: "Coordinación con otros departamentos", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Email Marketing",
    area_order: 4,
    items: [
      { item_order: 0, descripcion: "Base de datos de clientes actualizada", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Campañas de email programadas", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "Segmentación de audiencias", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 3, descripcion: "Métricas de apertura y conversión", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Fotografía y Contenido Visual",
    area_order: 5,
    items: [
      { item_order: 0, descripcion: "Banco de imágenes actualizado", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Calidad profesional de fotografías", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "Material audiovisual (videos, reels)", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 3, descripcion: "Repositorio organizado de assets", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Alianzas y Colaboraciones",
    area_order: 6,
    items: [
      { item_order: 0, descripcion: "Alianzas estratégicas activas", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Colaboraciones con influencers/bloggers", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "Participación en eventos locales", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 3, descripcion: "Relaciones con medios de comunicación", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Reputación Online",
    area_order: 7,
    items: [
      { item_order: 0, descripcion: "Monitoreo de reseñas en plataformas (TripAdvisor, Google, etc.)", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Respuesta oportuna a comentarios negativos", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "Estrategia para mejorar ratings", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 3, descripcion: "Gestión de crisis de reputación", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Métricas y Análisis",
    area_order: 8,
    items: [
      { item_order: 0, descripcion: "Dashboard de KPIs actualizado", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Análisis mensual de resultados", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "ROI de campañas documentado", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 3, descripcion: "Reportes ejecutivos para dirección", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  },
  {
    area_name: "Capacitación y Herramientas",
    area_order: 9,
    items: [
      { item_order: 0, descripcion: "Equipo capacitado en herramientas digitales", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 1, descripcion: "Software y licencias actualizadas", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 2, descripcion: "Procesos documentados y estandarizados", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true },
      { item_order: 3, descripcion: "Actualización en tendencias de marketing", tipo_dato: "Fijo", cumplimiento_valor: "", cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: "", comentarios_libre: true }
    ]
  }
]

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

  const dashboardRef = useRef<{ getCurrentUser: () => Promise<User | null> }>(null)

  // Template a usar (override o default)
  const baseTemplate = props.templateOverride || MARKETING_TEMPLATE

  // Cargar stats e inspección inicial
  useEffect(() => {
    if (props.inspectionId) {
      loadInspection(props.inspectionId)
    } else {
      loadStats()
    }
  }, [props.inspectionId, props.locationId])

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

  const handleNewInspection = async () => {
    const user = dashboardRef.current ? await dashboardRef.current.getCurrentUser() : null
    if (!user) {
      alert('Usuario no identificado')
      return
    }

    const newInspection: InspectionRRHH = {
      location_id: props.locationId,
      department: props.departmentName,
      inspector_user_id: user.id,
      inspector_name: user.email || 'Inspector',
      inspection_date: new Date().toISOString().split('T')[0],
      property_code: props.propertyCode,
      property_name: props.propertyName,
      status: 'draft',
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

  const handleGeneratePDF = async () => {
    if (!inspection) return
    
    // Guardar cambios antes de generar PDF
    await handleSaveInspection()
    
    const generator = new InspectionRRHHPDFGenerator()
    await generator.download(inspection)
  }

  const handleFieldChange = (areaId: number, itemId: number, field: string, value: any) => {
    console.log('handleFieldChange llamado:', { areaId, itemId, field, value })
    setHasUnsavedChanges(true)
    setInspection((prev) => {
      if (!prev) return prev
      const updated = {
        ...prev,
        areas: prev.areas.map((area, aIdx) => {
          if (aIdx + 1 !== areaId) return area
          console.log('Área encontrada:', { aIdx, areaId, area_name: area.area_name })
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

  // Convertir inspection a formato del dashboard
  if (!inspection) {
    return null
  }

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
    </div>
  )
}
