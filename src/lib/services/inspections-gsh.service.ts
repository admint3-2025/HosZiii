import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export type InspectionGSHStatus = 'draft' | 'completed' | 'approved' | 'rejected'

export type InspectionItemEvidenceSlot = 1 | 2

export interface InspectionGSHItemEvidence {
  id: string
  inspection_id: string
  item_id: string
  slot: InspectionItemEvidenceSlot
  storage_path: string
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  uploaded_by: string | null
  created_at: string
  signed_url?: string | null
}

export interface InspectionGSHItem {
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
  evidences?: InspectionGSHItemEvidence[]
}

export interface InspectionGSHArea {
  id?: string
  inspection_id?: string
  area_name: string
  area_order: number
  calculated_score?: number
  items: InspectionGSHItem[]
}

export interface InspectionGSH {
  id?: string
  location_id: string
  department: string
  inspector_user_id?: string
  inspector_name: string
  inspection_date: string
  property_code: string
  property_name: string
  status: InspectionGSHStatus
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
  areas: InspectionGSHArea[]
}

export class InspectionsGSHService {
  /**
   * Crea una nueva inspección con áreas e items
   */
  static async createInspection(data: InspectionGSH): Promise<{ data: InspectionGSH | null; error: any }> {
    const supabase = createSupabaseBrowserClient()

    try {
      console.log('🔵 [GSH] Creando inspección:', {
        location_id: data.location_id,
        inspector_user_id: data.inspector_user_id,
        areas: data.areas.length
      })

      // 1. Crear la inspección principal
      const { data: inspection, error: inspectionError } = await supabase
        .from('inspections_gsh')
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
        .select()

      console.log('🔵 [GSH] Resultado insert inspección:', { inspection, inspectionError })

      if (inspectionError || !inspection || inspection.length === 0) {
        console.error('❌ [GSH] Error al crear inspección:', inspectionError)
        return { data: null, error: inspectionError }
      }

      const inspectionId = inspection[0].id
      console.log('✅ [GSH] Inspección creada:', inspectionId)

      // 2. Crear áreas
      for (const area of data.areas) {
        console.log('🔵 [GSH] Creando área:', area.area_name)
        
        const { data: areaData, error: areaError } = await supabase
          .from('inspections_gsh_areas')
          .insert({
            inspection_id: inspectionId,
            area_name: area.area_name,
            area_order: area.area_order
          })
          .select()

        if (areaError || !areaData || areaData.length === 0) {
          console.error('❌ [GSH] Error al crear área:', areaError)
          return { data: null, error: areaError }
        }

        const areaId = areaData[0].id
        console.log('✅ [GSH] Área creada:', areaId)

        // 3. Crear items del área
        const itemsToInsert = area.items.map((item) => ({
          inspection_id: inspectionId,
          area_id: areaId,
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

        console.log(`🔵 [GSH] Creando ${itemsToInsert.length} items para área ${area.area_name}`)

        const { error: itemsError } = await supabase
          .from('inspections_gsh_items')
          .insert(itemsToInsert)

        if (itemsError) {
          console.error('❌ [GSH] Error al crear items:', itemsError)
          return { data: null, error: itemsError }
        }

        console.log(`✅ [GSH] Items creados para área ${area.area_name}`)
      }

      console.log('✅ [GSH] Inspección completa creada, obteniendo datos...')

      // 4. Obtener la inspección completa
      const result = await this.getInspectionById(inspectionId)
      return result
    } catch (error) {
      console.error('❌ [GSH] Error en createInspection:', error)
      return { data: null, error }
    }
  }

  /**
   * Obtiene una inspección por ID con todas sus áreas e items
   */
  static async getInspectionById(inspectionId: string): Promise<{ data: InspectionGSH | null; error: any }> {
    const supabase = createSupabaseBrowserClient()

    try {
      // Obtener inspección
      const { data: inspection, error: inspectionError } = await supabase
        .from('inspections_gsh')
        .select('*')
        .eq('id', inspectionId)
        .single()

      if (inspectionError || !inspection) {
        return { data: null, error: inspectionError }
      }

      // Obtener áreas
      const { data: areas, error: areasError } = await supabase
        .from('inspections_gsh_areas')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('area_order')

      if (areasError) {
        return { data: null, error: areasError }
      }

      // Obtener items de todas las áreas
      const { data: items, error: itemsError } = await supabase
        .from('inspections_gsh_items')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('item_order')

      if (itemsError) {
        return { data: null, error: itemsError }
      }

      // Obtener evidencias (hasta 2 por item)
      const { data: evidences, error: evidencesError } = await supabase
        .from('inspections_gsh_item_evidences')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('slot')

      if (evidencesError) {
        return { data: null, error: evidencesError }
      }

      const evidencesByItem = new Map<string, InspectionGSHItemEvidence[]>()
      for (const ev of (evidences || []) as any[]) {
        const itemId = String(ev.item_id)
        const arr = evidencesByItem.get(itemId) ?? []
        arr.push({
          id: String(ev.id),
          inspection_id: String(ev.inspection_id),
          item_id: String(ev.item_id),
          slot: Number(ev.slot) as any,
          storage_path: String(ev.storage_path),
          file_name: ev.file_name ?? null,
          file_size: typeof ev.file_size === 'number' ? ev.file_size : (ev.file_size ? Number(ev.file_size) : null),
          mime_type: ev.mime_type ?? null,
          uploaded_by: ev.uploaded_by ?? null,
          created_at: String(ev.created_at),
          signed_url: null
        })
        evidencesByItem.set(itemId, arr)
      }

      // Construir estructura
      const areasWithItems: InspectionGSHArea[] = (areas || []).map((area: any) => ({
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
            comentarios_libre: item.comentarios_libre,
            evidences: evidencesByItem.get(String(item.id)) ?? []
          }))
      }))

      const result: InspectionGSH = {
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
    areas: InspectionGSHArea[],
    generalComments?: string
  ): Promise<{ data: boolean; error: any }> {
    const supabase = createSupabaseBrowserClient()

    try {
      console.log('updateInspectionItems [GSH] - Iniciando guardado para inspección:', inspectionId)
      console.log('updateInspectionItems [GSH] - Total de áreas:', areas.length)
      
      let itemsActualizados = 0
      let itemsSinId = 0

      // Actualizar cada item
      for (const area of areas) {
        console.log(`updateInspectionItems [GSH] - Área "${area.area_name}": ${area.items.length} items`)
        
        for (const item of area.items) {
          if (!item.id) {
            itemsSinId++
            console.warn('updateInspectionItems [GSH] - Item sin ID:', item.descripcion)
            continue
          }

          console.log(`updateInspectionItems [GSH] - Actualizando item ${item.id}:`, {
            cumplimiento: item.cumplimiento_valor,
            calif: item.calif_valor,
            comentarios: item.comentarios_valor?.substring(0, 30)
          })

          const { error: itemError, data: updateResult } = await supabase
            .from('inspections_gsh_items')
            .update({
              cumplimiento_valor: item.cumplimiento_valor,
              calif_valor: item.calif_valor,
              comentarios_valor: item.comentarios_valor
            })
            .eq('id', item.id)
            .select()

          console.log(`updateInspectionItems [GSH] - Resultado update item ${item.id}:`, updateResult)

          if (itemError) {
            console.error('updateInspectionItems [GSH] - Error al actualizar item:', item.id, itemError)
            return { data: false, error: itemError }
          }
          
          itemsActualizados++
        }
      }

      console.log(`updateInspectionItems [GSH] - Items actualizados: ${itemsActualizados}, sin ID: ${itemsSinId}`)

      // Recalcular métricas
      const total_areas = areas.length
      const total_items = areas.reduce((acc, area) => acc + (area.items?.length || 0), 0)
      const items_cumple = areas.reduce(
        (acc, area) => acc + area.items.filter(i => i.cumplimiento_valor === 'Cumple').length,
        0
      )
      const items_no_cumple = areas.reduce(
        (acc, area) => acc + area.items.filter(i => i.cumplimiento_valor === 'No Cumple').length,
        0
      )
      const items_na = areas.reduce((acc, area) => acc + area.items.filter(i => i.cumplimiento_valor === 'N/A').length, 0)
      const items_pending = areas.reduce((acc, area) => acc + area.items.filter(i => !i.cumplimiento_valor).length, 0)

      const evaluatedItems = items_cumple + items_no_cumple + items_na
      const applicableEvaluated = items_cumple + items_no_cumple
      const coverage_percentage = total_items > 0 ? Math.round((evaluatedItems / total_items) * 100) : 0
      const compliance_percentage = applicableEvaluated > 0 ? Math.round((items_cumple / applicableEvaluated) * 100) : 0

      const areaScores = areas.map(area => {
        const cumpleItems = area.items.filter(item => item.cumplimiento_valor === 'Cumple')
        if (cumpleItems.length === 0) return 0
        const sum = cumpleItems.reduce((acc, item) => acc + (item.calif_valor || 0), 0)
        return sum / cumpleItems.length
      })
      const average_score = total_areas > 0 ? Number((areaScores.reduce((a, b) => a + b, 0) / total_areas).toFixed(2)) : 0

      const updatePayload: any = {
        total_areas,
        total_items,
        items_cumple,
        items_no_cumple,
        items_na,
        items_pending,
        coverage_percentage,
        compliance_percentage,
        average_score,
      }
      if (generalComments !== undefined) {
        updatePayload.general_comments = generalComments
      }

      console.log('updateInspectionItems [GSH] - Actualizando métricas de inspección')
      const { error: inspectionUpdateError } = await supabase
        .from('inspections_gsh')
        .update(updatePayload)
        .eq('id', inspectionId)

      if (inspectionUpdateError) {
        console.error('updateInspectionItems [GSH] - Error al actualizar métricas:', inspectionUpdateError)
        return { data: false, error: inspectionUpdateError }
      }

      console.log('updateInspectionItems [GSH] - Guardado completado exitosamente')
      return { data: true, error: null }
    } catch (error) {
      console.error('updateInspectionItems [GSH] - Error inesperado:', error)
      return { data: false, error }
    }
  }

  /**
   * Actualiza el estado de una inspección
   */
  static async updateInspectionStatus(
    inspectionId: string,
    status: InspectionGSHStatus
  ): Promise<{ data: boolean; error: any }> {
    const supabase = createSupabaseBrowserClient()

    const updateData: any = { status }
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('inspections_gsh')
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
      .from('inspections_gsh')
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
      .from('inspections_gsh')
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
      .from('inspections_gsh')
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
    locationId: string,
    filterByCurrentUser = false
  ): Promise<{ data: any; error: any }> {
    const supabase = createSupabaseBrowserClient()
    
    let currentUserId: string | null = null
    if (filterByCurrentUser) {
      const { data: { user } } = await supabase.auth.getUser()
      currentUserId = user?.id || null
    }

    let countQuery = supabase
      .from('inspections_gsh')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)
    if (currentUserId) countQuery = countQuery.eq('inspector_user_id', currentUserId)
    
    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      return { data: null, error: countError }
    }

    let pendingQuery = supabase
      .from('inspections_gsh')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .eq('status', 'completed')
    if (currentUserId) pendingQuery = pendingQuery.eq('inspector_user_id', currentUserId)
    
    const { count: pendingCount } = await pendingQuery

    let avgQuery = supabase
      .from('inspections_gsh')
      .select('average_score')
      .eq('location_id', locationId)
      .in('status', ['completed', 'approved'])
    if (currentUserId) avgQuery = avgQuery.eq('inspector_user_id', currentUserId)
    
    const { data: avgData } = await avgQuery

    const avgScore = avgData && avgData.length > 0
      ? Math.round((avgData.reduce((sum: number, i: any) => sum + (i.average_score || 0), 0) / avgData.length) * 10)
      : 0

    let recentQuery = supabase
      .from('inspections_gsh')
      .select('*')
      .eq('location_id', locationId)
      .order('inspection_date', { ascending: false })
      .limit(5)
    if (currentUserId) recentQuery = recentQuery.eq('inspector_user_id', currentUserId)
    
    const { data: recentInspections } = await recentQuery

    return {
      data: {
        totalInspections: totalCount || 0,
        pendingApproval: pendingCount || 0,
        averageScore: avgScore,
        recentInspections: recentInspections || [],
        currentUserId
      },
      error: null
    }
  }

  /**
   * Obtiene estadísticas agregadas de inspecciones para múltiples sedes
   */
  static async getLocationsStats(
    locationIds: string[],
    options?: {
      filterByCurrentUser?: boolean
      department?: string
      recentLimit?: number
    }
  ): Promise<{ data: any; error: any }> {
    const supabase = createSupabaseBrowserClient()

    if (!locationIds || locationIds.length === 0) {
      return {
        data: {
          totalInspections: 0,
          pendingApproval: 0,
          averageScore: 0,
          recentInspections: [],
          currentUserId: null
        },
        error: null
      }
    }

    const filterByCurrentUser = options?.filterByCurrentUser ?? false
    const department = options?.department
    const recentLimit = options?.recentLimit ?? 10

    let currentUserId: string | null = null
    if (filterByCurrentUser) {
      const { data: { user } } = await supabase.auth.getUser()
      currentUserId = user?.id || null
    }

    const applyFilters = (query: any) => {
      query = query.in('location_id', locationIds)
      if (department) query = query.eq('department', department)
      if (currentUserId) query = query.eq('inspector_user_id', currentUserId)
      return query
    }

    let countQuery = supabase
      .from('inspections_gsh')
      .select('*', { count: 'exact', head: true })
    countQuery = applyFilters(countQuery)
    const { count: totalCount, error: countError } = await countQuery
    if (countError) return { data: null, error: countError }

    let pendingQuery = supabase
      .from('inspections_gsh')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
    pendingQuery = applyFilters(pendingQuery)
    const { count: pendingCount } = await pendingQuery

    let avgQuery = supabase
      .from('inspections_gsh')
      .select('average_score')
      .in('status', ['completed', 'approved'])
    avgQuery = applyFilters(avgQuery)
    const { data: avgData } = await avgQuery
    const avgScore = avgData && avgData.length > 0
      ? Math.round((avgData.reduce((sum: number, i: any) => sum + (i.average_score || 0), 0) / avgData.length) * 10)
      : 0

    let recentQuery = supabase
      .from('inspections_gsh')
      .select('*')
      .order('inspection_date', { ascending: false })
      .limit(recentLimit)
    recentQuery = applyFilters(recentQuery)
    const { data: recentInspections, error: recentError } = await recentQuery
    if (recentError) return { data: null, error: recentError }

    return {
      data: {
        totalInspections: totalCount || 0,
        pendingApproval: pendingCount || 0,
        averageScore: avgScore,
        recentInspections: recentInspections || [],
        currentUserId
      },
      error: null
    }
  }
}
