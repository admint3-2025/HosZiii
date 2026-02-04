import type { InspectionRRHHArea } from '@/lib/services/inspections-rrhh.service'

import { MARKETING_ENCORE_MODEL } from './inspection-marketing-template.data'

/**
 * Template de inspección Marketing
 *
 * Nota sobre calificación (modelo actual):
 * - La calificación promedio (average_score) se calcula con el AVG de calif_valor SOLO en items con cumplimiento='Cumple'.
 * - La métrica de cumplimiento (compliance_percentage) se calcula con Cumple/(Cumple+No Cumple).
 *
 * @param propertyCode - Código de la propiedad (ej. "EGDLS", "EQRO"). Si se omite, incluye todos los items.
 */
export function getMarketingInspectionTemplateAreas(propertyCode?: string): InspectionRRHHArea[] {
  const normalizeText = (text: string) => text.trim().replace(/\s+/g, ' ')

  const areas: InspectionRRHHArea[] = MARKETING_ENCORE_MODEL
    .filter(area => {
      // Si el área tiene appliesTo vacío, aplica a todas las propiedades
      if (!area.appliesTo || area.appliesTo.length === 0) return true
      // Si no se especificó propertyCode, incluir todo
      if (!propertyCode) return true
      // Verificar si la propiedad está en la lista
      return area.appliesTo.includes(propertyCode)
    })
    .map((area, areaIndex) => {
      const filteredItems = area.items
        .filter(item => {
          if (!item.appliesTo || item.appliesTo.length === 0) return true
          if (!propertyCode) return true
          return item.appliesTo.includes(propertyCode)
        })
      
      return {
        area_name: area.name,
        area_order: areaIndex,
        items: filteredItems.map((item, itemIndex) => ({
          item_order: itemIndex,
          descripcion: normalizeText(item.text),
          tipo_dato: 'Fijo' as const,
          cumplimiento_valor: '' as const,
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        }))
      }
    })
    .filter(area => area.items.length > 0) // Remover áreas sin items después del filtrado

  return areas
}
