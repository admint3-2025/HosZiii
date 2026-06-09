'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import {
  InspectionTemplatesService,
  type InspectionTemplateArea,
  type InspectionTemplateDefinition,
} from '@/lib/services/inspection-templates.service'
import { getGSHInspectionTemplate } from '@/lib/templates/inspection-gsh-template'
import { getRRHHInspectionTemplateAreas } from '@/lib/templates/inspection-rrhh-template'
import { getMarketingInspectionTemplateAreas } from '@/lib/templates/inspection-marketing-template'
import { getDivisionCuartosInspectionTemplateAreas } from '@/lib/templates/inspection-division-cuartos-template'
import { getMantenimientoInspectionTemplateAreas } from '@/lib/templates/inspection-mantenimiento-template'
import { getSistemasInspectionTemplateAreas } from '@/lib/templates/inspection-sistemas-template'
import { getAlimentosBebidasInspectionTemplateAreas } from '@/lib/templates/inspection-alimentos-bebidas-template'
import { getAmaLlavesInspectionTemplateAreas } from '@/lib/templates/inspection-ama-llaves-template'
import { getContabilidadInspectionTemplateAreas } from '@/lib/templates/inspection-contabilidad-template'

type Department = {
  id: string
  name: string
}

type EditableTemplateItem = InspectionTemplateArea['items'][number] & {
  localId: string
}

type EditableTemplateArea = Omit<InspectionTemplateArea, 'items'> & {
  localId: string
  items: EditableTemplateItem[]
}

const DEPARTMENTS: Department[] = [
  { id: 'rrhh', name: 'RECURSOS HUMANOS' },
  { id: 'gsh', name: 'GSH' },
  { id: 'cuartos', name: 'DIV. CUARTOS' },
  { id: 'mantenimiento', name: 'MANTENIMIENTO' },
  { id: 'sistemas', name: 'SISTEMAS' },
  { id: 'alimentos', name: 'ALIMENTOS Y BEBIDAS' },
  { id: 'llaves', name: 'AMA DE LLAVES' },
  { id: 'contabilidad', name: 'CONTABILIDAD' },
  { id: 'marketing', name: 'MARKETING' },
]

const makeLocalId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random()}`
}

const mapInspectionAreasToEditable = (areas: any[]): EditableTemplateArea[] => {
  return areas.map((area, areaIdx) => ({
    localId: makeLocalId(),
    area_name: area.area_name,
    area_order: typeof area.area_order === 'number' ? area.area_order : areaIdx,
    items: (area.items || []).map((item: any, itemIdx: number) => ({
      localId: makeLocalId(),
      item_order: typeof item.item_order === 'number' ? item.item_order : itemIdx,
      descripcion: item.descripcion,
      tipo_dato: item.tipo_dato || 'Fijo',
      cumplimiento_editable: item.cumplimiento_editable ?? true,
      calif_editable: item.calif_editable ?? true,
      comentarios_libre: item.comentarios_libre ?? true,
      default_calif: typeof item.calif_valor === 'number' ? item.calif_valor : 0,
      default_comments: item.comentarios_valor ?? '',
    })),
  }))
}

const toServiceAreas = (areas: EditableTemplateArea[]): InspectionTemplateArea[] => {
  return areas.map((area, areaIdx) => ({
    area_name: area.area_name,
    area_order: areaIdx,
    items: area.items.map((item, itemIdx) => ({
      item_order: itemIdx,
      descripcion: item.descripcion,
      tipo_dato: item.tipo_dato,
      cumplimiento_editable: item.cumplimiento_editable,
      calif_editable: item.calif_editable,
      comentarios_libre: item.comentarios_libre,
      default_calif: item.default_calif,
      default_comments: item.default_comments,
    })),
  }))
}

const getDefaultTemplateByDepartment = (departmentId: string) => {
  switch (departmentId) {
    case 'rrhh':
      return getRRHHInspectionTemplateAreas()
    case 'gsh':
      return getGSHInspectionTemplate().areas
    case 'marketing':
      return getMarketingInspectionTemplateAreas()
    case 'cuartos':
      return getDivisionCuartosInspectionTemplateAreas()
    case 'mantenimiento':
      return getMantenimientoInspectionTemplateAreas()
    case 'sistemas':
      return getSistemasInspectionTemplateAreas()
    case 'alimentos':
      return getAlimentosBebidasInspectionTemplateAreas()
    case 'llaves':
      return getAmaLlavesInspectionTemplateAreas()
    case 'contabilidad':
      return getContabilidadInspectionTemplateAreas()
    default:
      return []
  }
}

export default function InspectionTemplatesAdminPage() {
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(DEPARTMENTS[0])
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [areas, setAreas] = useState<EditableTemplateArea[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedDepartmentName = useMemo(
    () => selectedDepartment?.name ?? '',
    [selectedDepartment]
  )

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Debes iniciar sesión para administrar plantillas.')
        setLoading(false)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      const admin = profile?.role === 'admin'
      setIsAdmin(admin)
      if (!admin) {
        setError('Solo administradores pueden gestionar plantillas.')
      }
      setLoading(false)
    }

    loadProfile()
  }, [])

  useEffect(() => {
    if (!selectedDepartment || !isAdmin) return
    let cancelled = false

    const loadTemplate = async () => {
      setTemplateLoading(true)
      const { data, error: loadError } = await InspectionTemplatesService.getTemplateDefinition(
        selectedDepartment.id
      )
      if (cancelled) return
      if (loadError) {
        setError(loadError.message || 'No se pudo cargar la plantilla.')
        setTemplateLoading(false)
        return
      }

      if (data) {
        setTemplateId(data.templateId)
        setAreas(
          data.areas.map((area) => ({
            ...area,
            localId: makeLocalId(),
            items: area.items.map((item) => ({
              ...item,
              localId: makeLocalId(),
            })),
          }))
        )
      } else {
        setTemplateId(null)
        setAreas([])
      }
      setDirty(false)
      setTemplateLoading(false)
      setError(null)
    }

    loadTemplate()
    return () => { cancelled = true }
  }, [selectedDepartment?.id, isAdmin])

  const handleImportDefault = () => {
    if (!selectedDepartment) return
    const defaultAreas = getDefaultTemplateByDepartment(selectedDepartment.id)
    setAreas(mapInspectionAreasToEditable(defaultAreas))
    setDirty(true)
  }

  const updateAreaName = (areaId: string, value: string) => {
    setAreas((prev) =>
      prev.map((area) =>
        area.localId === areaId ? { ...area, area_name: value } : area
      )
    )
    setDirty(true)
  }

  const updateItemField = (areaId: string, itemId: string, field: keyof EditableTemplateItem, value: any) => {
    setAreas((prev) =>
      prev.map((area) => {
        if (area.localId !== areaId) return area
        return {
          ...area,
          items: area.items.map((item) =>
            item.localId === itemId ? { ...item, [field]: value } : item
          ),
        }
      })
    )
    setDirty(true)
  }

  const addArea = () => {
    setAreas((prev) => [
      ...prev,
      {
        localId: makeLocalId(),
        area_name: 'Nueva área',
        area_order: prev.length,
        items: [],
      },
    ])
    setDirty(true)
  }

  const deleteArea = (areaId: string) => {
    if (!window.confirm('¿Eliminar esta área y sus ítems?')) return
    setAreas((prev) => prev.filter((area) => area.localId !== areaId))
    setDirty(true)
  }

  const addItem = (areaId: string) => {
    setAreas((prev) =>
      prev.map((area) =>
        area.localId === areaId
          ? {
              ...area,
              items: [
                ...area.items,
                {
                  localId: makeLocalId(),
                  item_order: area.items.length,
                  descripcion: 'Nuevo ítem',
                  tipo_dato: 'Fijo',
                  cumplimiento_editable: true,
                  calif_editable: true,
                  comentarios_libre: true,
                  default_calif: 0,
                  default_comments: '',
                },
              ],
            }
          : area
      )
    )
    setDirty(true)
  }

  const deleteItem = (areaId: string, itemId: string) => {
    if (!window.confirm('¿Eliminar este ítem?')) return
    setAreas((prev) =>
      prev.map((area) =>
        area.localId === areaId
          ? { ...area, items: area.items.filter((item) => item.localId !== itemId) }
          : area
      )
    )
    setDirty(true)
  }

  const moveArea = (areaId: string, direction: -1 | 1) => {
    setAreas((prev) => {
      const idx = prev.findIndex((area) => area.localId === areaId)
      if (idx < 0) return prev
      const nextIdx = idx + direction
      if (nextIdx < 0 || nextIdx >= prev.length) return prev
      const copy = [...prev]
      const [item] = copy.splice(idx, 1)
      copy.splice(nextIdx, 0, item)
      return copy
    })
    setDirty(true)
  }

  const moveItem = (areaId: string, itemId: string, direction: -1 | 1) => {
    setAreas((prev) =>
      prev.map((area) => {
        if (area.localId !== areaId) return area
        const idx = area.items.findIndex((item) => item.localId === itemId)
        if (idx < 0) return area
        const nextIdx = idx + direction
        if (nextIdx < 0 || nextIdx >= area.items.length) return area
        const items = [...area.items]
        const [item] = items.splice(idx, 1)
        items.splice(nextIdx, 0, item)
        return { ...area, items }
      })
    )
    setDirty(true)
  }

  const handleSave = async () => {
    if (!selectedDepartment) return
    setSaving(true)
    const payload: InspectionTemplateDefinition = {
      templateId,
      departmentId: selectedDepartment.id,
      departmentName: selectedDepartment.name,
      areas: toServiceAreas(areas),
    }
    const { error: saveError } = await InspectionTemplatesService.saveTemplateDefinition(payload)
    if (saveError) {
      setError(saveError.message || 'No se pudo guardar la plantilla.')
      setSaving(false)
      return
    }
    setSaving(false)
    setError(null)
    setDirty(false)
    const { data } = await InspectionTemplatesService.getTemplateDefinition(selectedDepartment.id)
    setTemplateId(data?.templateId ?? null)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-slate-500">Cargando...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {error || 'Sin permisos para esta sección.'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Plantillas de inspecciones</h1>
        <p className="text-sm text-slate-500">
          Administra áreas e ítems por departamento. Los cambios aplican a nuevas inspecciones.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DEPARTMENTS.map((dept) => (
          <button
            key={dept.id}
            onClick={() => setSelectedDepartment(dept)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              selectedDepartment?.id === dept.id
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {dept.name}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">
          {selectedDepartmentName}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImportDefault}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Cargar plantilla base
          </button>
          <button
            onClick={addArea}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Agregar área
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {templateLoading ? (
        <div className="text-sm text-slate-500">Cargando plantilla...</div>
      ) : areas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          No hay plantilla cargada. Usa &quot;Cargar plantilla base&quot; o agrega áreas manualmente.
        </div>
      ) : (
        <div className="space-y-4">
          {areas.map((area, areaIndex) => (
            <div key={area.localId} className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center gap-2 border-b border-slate-100 p-3">
                <input
                  value={area.area_name}
                  onChange={(e) => updateAreaName(area.localId, e.target.value)}
                  className="flex-1 text-sm font-semibold text-slate-700 border border-slate-200 rounded-md px-2 py-1"
                />
                <button
                  onClick={() => moveArea(area.localId, -1)}
                  className="px-2 py-1 text-xs border border-slate-200 rounded-md text-slate-500"
                  title="Mover arriba"
                  disabled={areaIndex === 0}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveArea(area.localId, 1)}
                  className="px-2 py-1 text-xs border border-slate-200 rounded-md text-slate-500"
                  title="Mover abajo"
                  disabled={areaIndex === areas.length - 1}
                >
                  ↓
                </button>
                <button
                  onClick={() => addItem(area.localId)}
                  className="px-2 py-1 text-xs border border-slate-200 rounded-md text-slate-500"
                >
                  + Ítem
                </button>
                <button
                  onClick={() => deleteArea(area.localId)}
                  className="px-2 py-1 text-xs border border-rose-200 rounded-md text-rose-600"
                >
                  Eliminar
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {area.items.map((item, itemIndex) => (
                  <div key={item.localId} className="flex flex-col gap-2 p-3 md:flex-row md:items-center">
                    <input
                      value={item.descripcion}
                      onChange={(e) => updateItemField(area.localId, item.localId, 'descripcion', e.target.value)}
                      className="flex-1 text-sm text-slate-700 border border-slate-200 rounded-md px-2 py-1"
                    />
                    <label className="flex items-center gap-2 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={item.calif_editable}
                        onChange={(e) => updateItemField(area.localId, item.localId, 'calif_editable', e.target.checked)}
                      />
                      Calif editable
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={item.cumplimiento_editable}
                        onChange={(e) => updateItemField(area.localId, item.localId, 'cumplimiento_editable', e.target.checked)}
                      />
                      Cumplimiento editable
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={item.comentarios_libre}
                        onChange={(e) => updateItemField(area.localId, item.localId, 'comentarios_libre', e.target.checked)}
                      />
                      Comentarios libres
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveItem(area.localId, item.localId, -1)}
                        className="px-2 py-1 text-xs border border-slate-200 rounded-md text-slate-500"
                        disabled={itemIndex === 0}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveItem(area.localId, item.localId, 1)}
                        className="px-2 py-1 text-xs border border-slate-200 rounded-md text-slate-500"
                        disabled={itemIndex === area.items.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => deleteItem(area.localId, item.localId)}
                        className="px-2 py-1 text-xs border border-rose-200 rounded-md text-rose-600"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                {area.items.length === 0 && (
                  <div className="p-3 text-sm text-slate-400">Sin ítems.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
