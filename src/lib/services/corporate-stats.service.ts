import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export interface CorporateStats {
  // KPIs principales
  totalLocations: number
  totalUsers: number
  totalInspections: number
  avgComplianceScore: number
  
  // Inspecciones por estado
  inspectionsByStatus: {
    draft: number
    completed: number
    approved: number
    rejected: number
  }
  
  // Ranking de sedes por cumplimiento
  locationRanking: {
    location_id: string
    property_name: string
    property_code: string
    totalInspections: number
    avgScore: number
    trend: 'up' | 'down' | 'stable'
  }[]
  
  // Tendencia de cumplimiento (últimos 6 meses)
  complianceTrend: {
    month: string
    score: number
  }[]
  
  // Áreas críticas (bajo cumplimiento)
  criticalAreas: {
    area_name: string
    avgScore: number
    inspectionCount: number
  }[]
  
  // Usuarios activos en inspecciones
  activeInspectors: {
    user_id: string
    user_name: string
    inspectionsCount: number
    avgScore: number
  }[]
}

export class CorporateStatsService {
  /**
   * Obtiene todas las estadísticas corporativas
   */
  static async getFullStats(): Promise<{ data: CorporateStats | null; error: any }> {
    const supabase = createSupabaseBrowserClient()

    try {
      // 1. Total de sedes
      const { count: totalLocations } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })

      // 2. Total de usuarios (excluyendo admin general)
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('role', 'eq', 'admin')

      // 3. Total de inspecciones
      const { count: totalInspections } = await supabase
        .from('inspections_rrhh')
        .select('*', { count: 'exact', head: true })

      // 4. Inspecciones por estado
      const { data: statusCounts } = await supabase
        .from('inspections_rrhh')
        .select('status')

      const inspectionsByStatus = {
        draft: 0,
        completed: 0,
        approved: 0,
        rejected: 0
      }

      statusCounts?.forEach((i: any) => {
        if (i.status in inspectionsByStatus) {
          inspectionsByStatus[i.status as keyof typeof inspectionsByStatus]++
        }
      })

      // 5. Promedio global de cumplimiento
      const { data: avgData } = await supabase
        .from('inspections_rrhh')
        .select('average_score')
        .in('status', ['completed', 'approved'])

      const avgComplianceScore = avgData && avgData.length > 0
        ? Math.round((avgData.reduce((sum: number, i: any) => sum + (i.average_score || 0), 0) / avgData.length) * 10)
        : 0

      // 6. Ranking de sedes
      const { data: inspectionsWithLocation } = await supabase
        .from('inspections_rrhh')
        .select('location_id, property_name, property_code, average_score, status, inspection_date')
        .in('status', ['completed', 'approved'])
        .order('inspection_date', { ascending: false })

      const locationMap = new Map<string, {
        location_id: string
        property_name: string
        property_code: string
        scores: number[]
        dates: string[]
      }>()

      inspectionsWithLocation?.forEach((i: any) => {
        if (!locationMap.has(i.location_id)) {
          locationMap.set(i.location_id, {
            location_id: i.location_id,
            property_name: i.property_name,
            property_code: i.property_code,
            scores: [],
            dates: []
          })
        }
        const loc = locationMap.get(i.location_id)!
        loc.scores.push(i.average_score || 0)
        loc.dates.push(i.inspection_date)
      })

      const locationRanking = Array.from(locationMap.values())
        .map(loc => {
          const avgScore = Math.round((loc.scores.reduce((a, b) => a + b, 0) / loc.scores.length) * 10)
          // Calcular tendencia comparando últimas 2 inspecciones
          let trend: 'up' | 'down' | 'stable' = 'stable'
          if (loc.scores.length >= 2) {
            const diff = loc.scores[0] - loc.scores[1]
            trend = diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'stable'
          }
          return {
            location_id: loc.location_id,
            property_name: loc.property_name,
            property_code: loc.property_code,
            totalInspections: loc.scores.length,
            avgScore,
            trend
          }
        })
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 10)

      // 7. Tendencia de cumplimiento por mes (últimos 6 meses)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const { data: trendData } = await supabase
        .from('inspections_rrhh')
        .select('inspection_date, average_score')
        .in('status', ['completed', 'approved'])
        .gte('inspection_date', sixMonthsAgo.toISOString().split('T')[0])
        .order('inspection_date', { ascending: true })

      const monthlyMap = new Map<string, number[]>()
      trendData?.forEach((i: any) => {
        const date = new Date(i.inspection_date)
        const monthKey = date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, [])
        }
        monthlyMap.get(monthKey)!.push(i.average_score || 0)
      })

      const complianceTrend = Array.from(monthlyMap.entries()).map(([month, scores]) => ({
        month,
        score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10)
      }))

      // 8. Áreas críticas (promedio bajo)
      const { data: areasData } = await supabase
        .from('inspections_rrhh_areas')
        .select('area_name, calculated_score, inspection_id')

      const areaMap = new Map<string, number[]>()
      areasData?.forEach((a: any) => {
        if (!areaMap.has(a.area_name)) {
          areaMap.set(a.area_name, [])
        }
        areaMap.get(a.area_name)!.push(a.calculated_score || 0)
      })

      const criticalAreas = Array.from(areaMap.entries())
        .map(([area_name, scores]) => ({
          area_name,
          avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10),
          inspectionCount: scores.length
        }))
        .filter(a => a.avgScore < 80)
        .sort((a, b) => a.avgScore - b.avgScore)
        .slice(0, 5)

      // 9. Inspectores activos
      const { data: inspectorsData } = await supabase
        .from('inspections_rrhh')
        .select('inspector_user_id, inspector_name, average_score')
        .in('status', ['completed', 'approved'])

      const inspectorMap = new Map<string, { name: string; scores: number[] }>()
      inspectorsData?.forEach((i: any) => {
        if (!i.inspector_user_id) return
        if (!inspectorMap.has(i.inspector_user_id)) {
          inspectorMap.set(i.inspector_user_id, { name: i.inspector_name, scores: [] })
        }
        inspectorMap.get(i.inspector_user_id)!.scores.push(i.average_score || 0)
      })

      const activeInspectors = Array.from(inspectorMap.entries())
        .map(([user_id, data]) => ({
          user_id,
          user_name: data.name,
          inspectionsCount: data.scores.length,
          avgScore: Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10)
        }))
        .sort((a, b) => b.inspectionsCount - a.inspectionsCount)
        .slice(0, 5)

      return {
        data: {
          totalLocations: totalLocations || 0,
          totalUsers: totalUsers || 0,
          totalInspections: totalInspections || 0,
          avgComplianceScore,
          inspectionsByStatus,
          locationRanking,
          complianceTrend,
          criticalAreas,
          activeInspectors
        },
        error: null
      }
    } catch (error) {
      console.error('Error fetching corporate stats:', error)
      return { data: null, error }
    }
  }

  /**
   * Obtiene las últimas inspecciones para revisión
   */
  static async getPendingReviews(): Promise<{ data: any[]; error: any }> {
    const supabase = createSupabaseBrowserClient()

    const { data, error } = await supabase
      .from('inspections_rrhh')
      .select('id, property_name, property_code, inspector_name, inspection_date, average_score, status')
      .eq('status', 'completed')
      .order('inspection_date', { ascending: false })
      .limit(10)

    return { data: data || [], error }
  }

  /**
   * Aprueba una inspección
   */
  static async approveInspection(inspectionId: string): Promise<{ error: any }> {
    const supabase = createSupabaseBrowserClient()

    const { error } = await supabase
      .from('inspections_rrhh')
      .update({ status: 'approved' })
      .eq('id', inspectionId)

    return { error }
  }

  /**
   * Rechaza una inspección
   */
  static async rejectInspection(inspectionId: string): Promise<{ error: any }> {
    const supabase = createSupabaseBrowserClient()

    const { error } = await supabase
      .from('inspections_rrhh')
      .update({ status: 'rejected' })
      .eq('id', inspectionId)

    return { error }
  }
}
