import type { InspectionRRHHArea } from '@/lib/services/inspections-rrhh.service'

import { MARKETING_ENCORE_MODEL } from './inspection-marketing-template.data'

/**
 * Template de inspección Marketing
 *
 * Nota sobre calificación (modelo actual):
 * - La calificación promedio (average_score) se calcula con el AVG de calif_valor SOLO en items con cumplimiento='Cumple'.
 * - La métrica de cumplimiento (compliance_percentage) se calcula con Cumple/(Cumple+No Cumple).
 */
export function getMarketingInspectionTemplateAreas(): InspectionRRHHArea[] {
  const normalizeText = (text: string) => text.trim().replace(/\s+/g, ' ')

  return Object.entries(MARKETING_ENCORE_MODEL)
    .filter(([, items]) => (items || []).length > 0)
    .map(([areaName, itemDescriptions], areaIndex) => ({
      area_name: areaName,
      area_order: areaIndex,
      items: (itemDescriptions || [])
        .filter(Boolean)
        .map((raw, itemIndex) => ({
          item_order: itemIndex,
          descripcion: normalizeText(raw),
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        }))
    }))
}
