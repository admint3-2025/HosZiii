import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import type { InspectionRRHHArea } from '@/lib/services/inspections-rrhh.service'

export type InspectionTemplateItem = {
  id?: string
  item_order: number
  descripcion: string
  tipo_dato: string
  cumplimiento_editable: boolean
  calif_editable: boolean
  comentarios_libre: boolean
  default_calif: number
  default_comments: string
  applies_to?: string[] | null
}

export type InspectionTemplateArea = {
  id?: string
  area_name: string
  area_order: number
  applies_to?: string[] | null
  items: InspectionTemplateItem[]
}

export type InspectionTemplateDefinition = {
  templateId: string | null
  departmentId: string
  departmentName?: string | null
  areas: InspectionTemplateArea[]
}

const isApplicable = (appliesTo?: string[] | null, propertyCode?: string) => {
  if (!appliesTo || appliesTo.length === 0) return true
  if (!propertyCode) return true
  return appliesTo.includes(propertyCode)
}

export class InspectionTemplatesService {
  static async getTemplateDefinition(
    departmentId: string
  ): Promise<{ data: InspectionTemplateDefinition | null; error: any }> {
    const supabase = createSupabaseBrowserClient()

    const { data: template, error } = await supabase
      .from('inspection_templates')
      .select(
        `
          id,
          department_id,
          department_name,
          areas:inspection_template_areas(
            id,
            area_name,
            area_order,
            applies_to,
            items:inspection_template_items(
              id,
              item_order,
              descripcion,
              tipo_dato,
              cumplimiento_editable,
              calif_editable,
              comentarios_libre,
              default_calif,
              default_comments,
              applies_to
            )
          )
        `
      )
      .eq('department_id', departmentId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return { data: null, error }
    if (!template) return { data: null, error: null }

    const areas: InspectionTemplateArea[] = (template.areas || [])
      .map((area: any) => ({
        id: area.id,
        area_name: area.area_name,
        area_order: area.area_order,
        applies_to: area.applies_to ?? null,
        items: (area.items || [])
          .map((item: any) => ({
            id: item.id,
            item_order: item.item_order,
            descripcion: item.descripcion,
            tipo_dato: item.tipo_dato || 'Fijo',
            cumplimiento_editable: item.cumplimiento_editable ?? true,
            calif_editable: item.calif_editable ?? true,
            comentarios_libre: item.comentarios_libre ?? true,
            default_calif: typeof item.default_calif === 'number' ? item.default_calif : Number(item.default_calif || 0),
            default_comments: item.default_comments ?? '',
            applies_to: item.applies_to ?? null
          }))
          .sort((a: InspectionTemplateItem, b: InspectionTemplateItem) => a.item_order - b.item_order)
      }))
      .sort((a: InspectionTemplateArea, b: InspectionTemplateArea) => a.area_order - b.area_order)

    return {
      data: {
        templateId: template.id,
        departmentId: template.department_id,
        departmentName: template.department_name ?? null,
        areas,
      },
      error: null,
    }
  }

  static async getTemplateAreasForDepartment(
    departmentId: string,
    propertyCode?: string
  ): Promise<{ data: InspectionRRHHArea[] | null; error: any }> {
    const { data, error } = await this.getTemplateDefinition(departmentId)
    if (error || !data) return { data: null, error }

    const filteredAreas = data.areas
      .filter((area) => isApplicable(area.applies_to, propertyCode))
      .map((area, areaIdx) => ({
        area_name: area.area_name,
        area_order: areaIdx,
        items: area.items
          .filter((item) => isApplicable(item.applies_to, propertyCode))
          .map((item, itemIdx) => ({
            item_order: itemIdx,
            descripcion: item.descripcion,
            tipo_dato: item.tipo_dato || 'Fijo',
            cumplimiento_valor: '' as const,
            cumplimiento_editable: item.cumplimiento_editable ?? true,
            calif_valor: typeof item.default_calif === 'number' ? item.default_calif : 0,
            calif_editable: item.calif_editable ?? true,
            comentarios_valor: item.default_comments ?? '',
            comentarios_libre: item.comentarios_libre ?? true
          }))
      }))
      .filter((area) => area.items.length > 0)

    return { data: filteredAreas, error: null }
  }

  static async saveTemplateDefinition(
    payload: InspectionTemplateDefinition
  ): Promise<{ data: boolean; error: any }> {
    const supabase = createSupabaseBrowserClient()

    const trimmedAreas = payload.areas.map((area, idx) => ({
      area_name: area.area_name.trim(),
      area_order: idx,
      applies_to: area.applies_to ?? null,
      items: area.items.map((item, itemIdx) => ({
        item_order: itemIdx,
        descripcion: item.descripcion.trim(),
        tipo_dato: item.tipo_dato || 'Fijo',
        cumplimiento_editable: item.cumplimiento_editable ?? true,
        calif_editable: item.calif_editable ?? true,
        comentarios_libre: item.comentarios_libre ?? true,
        default_calif: typeof item.default_calif === 'number' ? item.default_calif : 0,
        default_comments: item.default_comments ?? '',
        applies_to: item.applies_to ?? null,
      })),
    }))

    const emptyArea = trimmedAreas.find((area) => !area.area_name)
    if (emptyArea) return { data: false, error: new Error('Todas las áreas deben tener nombre.') }

    const emptyItem = trimmedAreas.flatMap((area) => area.items).find((item) => !item.descripcion)
    if (emptyItem) return { data: false, error: new Error('Todos los ítems deben tener descripción.') }

    let templateId = payload.templateId
    if (!templateId) {
      const { data: inserted, error: insertError } = await supabase
        .from('inspection_templates')
        .insert({
          department_id: payload.departmentId,
          department_name: payload.departmentName ?? null,
          is_active: true,
        })
        .select('id')
        .single()

      if (insertError || !inserted) return { data: false, error: insertError }
      templateId = inserted.id
    } else {
      const { error: updateError } = await supabase
        .from('inspection_templates')
        .update({
          department_name: payload.departmentName ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)

      if (updateError) return { data: false, error: updateError }

      const { error: deleteError } = await supabase
        .from('inspection_template_areas')
        .delete()
        .eq('template_id', templateId)

      if (deleteError) return { data: false, error: deleteError }
    }

    for (const area of trimmedAreas) {
      const { data: areaRow, error: areaError } = await supabase
        .from('inspection_template_areas')
        .insert({
          template_id: templateId,
          area_name: area.area_name,
          area_order: area.area_order,
          applies_to: area.applies_to ?? null,
        })
        .select('id')
        .single()

      if (areaError || !areaRow) return { data: false, error: areaError }

      const itemsToInsert = area.items.map((item) => ({
        area_id: areaRow.id,
        item_order: item.item_order,
        descripcion: item.descripcion,
        tipo_dato: item.tipo_dato || 'Fijo',
        cumplimiento_editable: item.cumplimiento_editable ?? true,
        calif_editable: item.calif_editable ?? true,
        comentarios_libre: item.comentarios_libre ?? true,
        default_calif: typeof item.default_calif === 'number' ? item.default_calif : 0,
        default_comments: item.default_comments ?? '',
        applies_to: item.applies_to ?? null,
      }))

      const { error: itemError } = await supabase
        .from('inspection_template_items')
        .insert(itemsToInsert)

      if (itemError) return { data: false, error: itemError }
    }

    return { data: true, error: null }
  }
}
