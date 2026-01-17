import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export type InspectionRRHHStatus = 'draft' | 'completed' | 'approved' | 'rejected'

export interface InspectionRRHHItem {
  id?: string
  area_id?: string
  inspection_id?: string
  item_order: number
  descripcion: string
  tipo_dato: string
  cumplimiento_valor: '' | 'Cumple' | 'No Cumple' | 'N/A'
  cumplimiento_editable: boolean
  calif_valor: number
  calif_editable: boolean
  comentarios_valor: string
  comentarios_libre: boolean
}

export interface InspectionRRHHArea {
  id?: string
  inspection_id?: string
  area_name: string
  area_order: number
  calculated_score?: number
  items: InspectionRRHHItem[]
}

export interface InspectionRRHH {
  id?: string
  location_id: string
  department: string
  inspector_user_id?: string
  inspector_name: string
  inspection_date: string
  property_code: string
  property_name: string
  status: InspectionRRHHStatus
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
  areas: InspectionRRHHArea[]
}

export class InspectionsRRHHService {
  /**
   * Crea una nueva inspección con áreas e items
   */
  static async createInspection(data: InspectionRRHH): Promise<{ data: InspectionRRHH | null; error: any }> {
    const supabase = createSupabaseBrowserClient()

    try {
      // 1. Crear la inspección principal
      const { data: inspection, error: inspectionError } = await supabase
        .from('inspections_rrhh')
        .insert({
          location_id: data.location_id,
          department: data.department,
          inspector_user_id: data.inspector_user_id,
          inspector_name: data.inspector_name,
          inspection_date: data.inspection_date,
          property_code: data.property_code,
          property_name: data.property_name,
          status: data.status,
          general_comments: data.general_comments || ''
        })
        .select('id')
        .single()

      if (inspectionError || !inspection) {
        return { data: null, error: inspectionError }
      }

      const inspectionId = inspection.id

      // 2. Crear áreas
      for (const area of data.areas) {
        const { data: areaData, error: areaError } = await supabase
          .from('inspections_rrhh_areas')
          .insert({
            inspection_id: inspectionId,
            area_name: area.area_name,
            area_order: area.area_order
          })
          .select('id')
          .single()

        if (areaError || !areaData) {
          return { data: null, error: areaError }
        }

        // 3. Crear items del área
        const itemsToInsert = area.items.map((item) => ({
          inspection_id: inspectionId,
          area_id: areaData.id,
          item_order: item.item_order,
          descripcion: item.descripcion,
          tipo_dato: item.tipo_dato,
          cumplimiento_valor: item.cumplimiento_valor,
          cumplimiento_editable: item.cumplimiento_editable,
          calif_valor: item.calif_valor,
          calif_editable: item.calif_editable,
          comentarios_valor: item.comentarios_valor,
          comentarios_libre: item.comentarios_libre
        }))

        const { error: itemsError } = await supabase
          .from('inspections_rrhh_items')
          .insert(itemsToInsert)

        if (itemsError) {
          return { data: null, error: itemsError }
        }
      }

      // 4. Obtener la inspección completa
      const result = await this.getInspectionById(inspectionId)
      return result
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Obtiene una inspección por ID con todas sus áreas e items
   */
  static async getInspectionById(inspectionId: string): Promise<{ data: InspectionRRHH | null; error: any }> {
    const supabase = createSupabaseBrowserClient()

    try {
      // Obtener inspección
      const { data: inspection, error: inspectionError } = await supabase
        .from('inspections_rrhh')
        .select('*')
        .eq('id', inspectionId)
        .single()

      if (inspectionError || !inspection) {
        return { data: null, error: inspectionError }
      }

      // Obtener áreas
      const { data: areas, error: areasError } = await supabase
        .from('inspections_rrhh_areas')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('area_order')

      if (areasError) {
        return { data: null, error: areasError }
      }

      // Obtener items de todas las áreas
      const { data: items, error: itemsError } = await supabase
        .from('inspections_rrhh_items')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('item_order')

      if (itemsError) {
        return { data: null, error: itemsError }
      }

      // Construir estructura
      const areasWithItems: InspectionRRHHArea[] = (areas || []).map((area: any) => ({
        id: area.id,
        inspection_id: area.inspection_id,
        area_name: area.area_name,
        area_order: area.area_order,
        calculated_score: area.calculated_score,
        items: (items || [])
          .filter((item: any) => item.area_id === area.id)
          .map((item: any) => ({
            id: item.id,
            area_id: item.area_id,
            inspection_id: item.inspection_id,
            item_order: item.item_order,
            descripcion: item.descripcion,
            tipo_dato: item.tipo_dato,
            cumplimiento_valor: item.cumplimiento_valor,
            cumplimiento_editable: item.cumplimiento_editable,
            calif_valor: item.calif_valor,
            calif_editable: item.calif_editable,
            comentarios_valor: item.comentarios_valor,
            comentarios_libre: item.comentarios_libre
          }))
      }))

      const result: InspectionRRHH = {
        ...inspection,
        areas: areasWithItems
      }

      return { data: result, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Actualiza los items de una inspección
   */
  static async updateInspectionItems(
    inspectionId: string,
    areas: InspectionRRHHArea[],
    generalComments?: string
  ): Promise<{ data: boolean; error: any }> {
    const supabase = createSupabaseBrowserClient()

    try {
      // Actualizar cada item
      for (const area of areas) {
        for (const item of area.items) {
          if (!item.id) continue

          const { error: itemError } = await supabase
            .from('inspections_rrhh_items')
            .update({
              cumplimiento_valor: item.cumplimiento_valor,
              calif_valor: item.calif_valor,
              comentarios_valor: item.comentarios_valor
            })
            .eq('id', item.id)

          if (itemError) {
            return { data: false, error: itemError }
          }
        }
      }

      // Actualizar comentarios generales si se proporcionan
      if (generalComments !== undefined) {
        const { error: commentsError } = await supabase
          .from('inspections_rrhh')
          .update({ general_comments: generalComments })
          .eq('id', inspectionId)

        if (commentsError) {
          return { data: false, error: commentsError }
        }
      }

      return { data: true, error: null }
    } catch (error) {
      return { data: false, error }
    }
  }

  /**
   * Actualiza el estado de una inspección
   */
  static async updateInspectionStatus(
    inspectionId: string,
    status: InspectionRRHHStatus
  ): Promise<{ data: boolean; error: any }> {
    const supabase = createSupabaseBrowserClient()

    const updateData: any = { status }
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('inspections_rrhh')
      .update(updateData)
      .eq('id', inspectionId)

    if (error) {
      return { data: false, error }
    }

    return { data: true, error: null }
  }

  /**
   * Lista inspecciones de una ubicación
   */
  static async listInspections(
    locationId: string,
    limit = 50,
    offset = 0
  ): Promise<{ data: any[] | null; error: any }> {
    const supabase = createSupabaseBrowserClient()

    const { data, error } = await supabase
      .from('inspections_rrhh')
      .select('*')
      .eq('location_id', locationId)
      .order('inspection_date', { ascending: false })
      .range(offset, offset + limit - 1)

    return { data, error }
  }

  /**
   * Lista inspecciones de múltiples ubicaciones
   */
  static async listInspectionsMultiple(
    locationIds: string[],
    limit = 200,
    offset = 0
  ): Promise<{ data: any[] | null; error: any }> {
    const supabase = createSupabaseBrowserClient()

    if (locationIds.length === 0) {
      return { data: [], error: null }
    }

    const { data, error } = await supabase
      .from('inspections_rrhh')
      .select('*')
      .in('location_id', locationIds)
      .order('inspection_date', { ascending: false })
      .range(offset, offset + limit - 1)

    return { data, error }
  }

  /**
   * Obtiene las últimas N inspecciones para trend data
   */
  static async getRecentInspectionsTrend(
    locationId: string,
    count = 6
  ): Promise<{ data: number[]; error: any }> {
    const supabase = createSupabaseBrowserClient()

    const { data, error } = await supabase
      .from('inspections_rrhh')
      .select('average_score')
      .eq('location_id', locationId)
      .eq('status', 'completed')
      .order('inspection_date', { ascending: false })
      .limit(count)

    if (error) {
      return { data: [], error }
    }

    // Convertir scores (0-10) a porcentajes (0-100) y revertir orden
    const scores = (data || [])
      .map((i: any) => Math.round((i.average_score || 0) * 10))
      .reverse()

    return { data: scores, error: null }
  }

  /**
   * Obtiene estadísticas generales de inspecciones de una ubicación
   */
  static async getLocationStats(
    locationId: string
  ): Promise<{ data: any; error: any }> {
    const supabase = createSupabaseBrowserClient()

    // Total de inspecciones
    const { count: totalCount, error: countError } = await supabase
      .from('inspections_rrhh')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)

    if (countError) {
      return { data: null, error: countError }
    }

    // Inspecciones pendientes de aprobar
    const { count: pendingCount } = await supabase
      .from('inspections_rrhh')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .eq('status', 'completed')

    // Promedio histórico
    const { data: avgData } = await supabase
      .from('inspections_rrhh')
      .select('average_score')
      .eq('location_id', locationId)
      .in('status', ['completed', 'approved'])

    const avgScore = avgData && avgData.length > 0
      ? Math.round((avgData.reduce((sum: number, i: any) => sum + (i.average_score || 0), 0) / avgData.length) * 10)
      : 0

    // Últimas 5 inspecciones
    const { data: recentInspections } = await supabase
      .from('inspections_rrhh')
      .select('*')
      .eq('location_id', locationId)
      .order('inspection_date', { ascending: false })
      .limit(5)

    return {
      data: {
        totalInspections: totalCount || 0,
        pendingApproval: pendingCount || 0,
        averageScore: avgScore,
        recentInspections: recentInspections || []
      },
      error: null
    }
  }
}
