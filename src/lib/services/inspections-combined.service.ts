import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

/**
 * Servicio para consultas combinadas de inspecciones de múltiples tipos
 * Útil para la bandeja general que muestra RRHH + GSH + otros módulos
 */

export type InspectionType = 'rrhh' | 'gsh' | 'ama' | 'cocina' | 'housekeeping'

export interface CombinedInspection {
  id: string
  location_id: string
  department: string
  inspector_user_id: string
  inspector_name: string
  inspection_date: string
  property_code: string
  property_name: string
  status: 'draft' | 'completed' | 'approved' | 'rejected'
  total_areas?: number
  total_items?: number
  items_cumple?: number
  items_no_cumple?: number
  items_na?: number
  items_pending?: number
  coverage_percentage?: number
  compliance_percentage?: number
  average_score?: number
  general_comments?: string
  created_at?: string
  updated_at?: string
  completed_at?: string
  // Metadatos para identificar el tipo
  inspection_type: InspectionType
}

export class InspectionsCombinedService {
  /**
   * Lista inspecciones de múltiples ubicaciones combinando todos los tipos implementados
   * @param locationIds - IDs de ubicaciones a consultar
   * @param inspectionTypes - Tipos de inspecciones a incluir (por defecto solo implementados)
   * @param limit - Límite de resultados
   * @param offset - Offset para paginación
   */
  static async listInspectionsMultiple(
    locationIds: string[],
    inspectionTypes: InspectionType[] = ['rrhh', 'gsh'],
    limit = 200,
    offset = 0
  ): Promise<{ data: CombinedInspection[] | null; error: any }> {
    const supabase = createSupabaseBrowserClient()

    if (locationIds.length === 0) {
      return { data: [], error: null }
    }

    try {
      const allInspections: CombinedInspection[] = []

      // Consultar cada tipo de inspección
      for (const type of inspectionTypes) {
        const tableName = `inspections_${type}`

        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .in('location_id', locationIds)
          .order('inspection_date', { ascending: false })

        if (error) {
          console.error(`Error consultando ${tableName}:`, error)
          // Continuar con otros tipos aunque uno falle
          continue
        }

        // Agregar tipo de inspección a cada registro
        const typedData = (data || []).map((inspection: any) => ({
          ...inspection,
          inspection_type: type
        }))

        allInspections.push(...typedData)
      }

      // Ordenar por fecha descendente
      allInspections.sort((a, b) => {
        const dateA = new Date(a.inspection_date).getTime()
        const dateB = new Date(b.inspection_date).getTime()
        return dateB - dateA
      })

      // Aplicar limit y offset
      const paginatedResults = allInspections.slice(offset, offset + limit)

      return { data: paginatedResults, error: null }
    } catch (error) {
      console.error('Error en listInspectionsMultiple:', error)
      return { data: null, error }
    }
  }

  /**
   * Lista inspecciones de una ubicación específica combinando todos los tipos
   * @param locationId - ID de la ubicación
   * @param inspectionTypes - Tipos de inspecciones a incluir
   * @param limit - Límite de resultados
   * @param offset - Offset para paginación
   */
  static async listInspections(
    locationId: string,
    inspectionTypes: InspectionType[] = ['rrhh', 'gsh'],
    limit = 50,
    offset = 0
  ): Promise<{ data: CombinedInspection[] | null; error: any }> {
    return this.listInspectionsMultiple([locationId], inspectionTypes, limit, offset)
  }

  /**
   * Obtiene estadísticas combinadas de todas las inspecciones de una ubicación
   */
  static async getLocationCombinedStats(
    locationId: string,
    inspectionTypes: InspectionType[] = ['rrhh', 'gsh']
  ): Promise<{ data: any; error: any }> {
    const supabase = createSupabaseBrowserClient()

    try {
      const stats = {
        total: 0,
        draft: 0,
        completed: 0,
        approved: 0,
        rejected: 0,
        byType: {} as Record<InspectionType, number>
      }

      for (const type of inspectionTypes) {
        const tableName = `inspections_${type}`

        const { data, error } = await supabase
          .from(tableName)
          .select('status')
          .eq('location_id', locationId)

        if (error) {
          console.error(`Error consultando stats de ${tableName}:`, error)
          continue
        }

        const typeCount = (data || []).length
        stats.byType[type] = typeCount
        stats.total += typeCount

        // Contar por estado
        ;(data || []).forEach((row: any) => {
          if (row.status === 'draft') stats.draft++
          else if (row.status === 'completed') stats.completed++
          else if (row.status === 'approved') stats.approved++
          else if (row.status === 'rejected') stats.rejected++
        })
      }

      return { data: stats, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Elimina una inspección según su tipo
   */
  static async deleteInspection(
    inspectionId: string,
    inspectionType: InspectionType
  ): Promise<{ data: boolean; error: any }> {
    const supabase = createSupabaseBrowserClient()
    const tableName = `inspections_${inspectionType}`

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', inspectionId)

    if (error) {
      return { data: false, error }
    }

    return { data: true, error: null }
  }

  /**
   * Actualiza el estado de una inspección según su tipo
   */
  static async updateInspectionStatus(
    inspectionId: string,
    inspectionType: InspectionType,
    status: 'draft' | 'completed' | 'approved' | 'rejected'
  ): Promise<{ data: any; error: any }> {
    const supabase = createSupabaseBrowserClient()
    const tableName = `inspections_${inspectionType}`

    const updates: any = { status }

    if (status === 'approved') {
      const { data: { user } } = await supabase.auth.getUser()
      updates.approved_at = new Date().toISOString()
      updates.approved_by_user_id = user?.id || null
    }

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', inspectionId)
      .select()
      .single()

    return { data, error }
  }
}
