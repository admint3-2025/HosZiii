/**
 * Hook: useAssetCategoryFilter
 * Propósito: Obtener la categoría de activos del usuario actual y filtrar activos
 * Uso: En AssetList, CreateTicketForm, y otros componentes que necesiten filtrar por categoría
 */

'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export type AssetCategoryType = 'IT' | 'MAINTENANCE' | null

interface UserAssetAccess {
  userRole: string
  assetCategory: AssetCategoryType
  canViewAllAssets: boolean // true si es admin o tiene categoría null
}

/**
 * Hook para obtener los permisos de activos del usuario actual
 */
export function useAssetCategoryFilter() {
  const [access, setAccess] = useState<UserAssetAccess | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserAccess = async () => {
      try {
        const supabase = await createSupabaseBrowserClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setAccess(null)
          setLoading(false)
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, asset_category')
          .eq('id', user.id)
          .single()

        if (profileError) {
          setError(profileError.message)
          setLoading(false)
          return
        }

        const isAdmin = profile?.role === 'admin'
        const assetCategory = profile?.asset_category as AssetCategoryType

        setAccess({
          userRole: profile?.role || 'user',
          assetCategory,
          canViewAllAssets: isAdmin || !assetCategory, // null = acceso a todos
        })

        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchUserAccess()
  }, [])

  return { access, loading, error }
}

/**
 * Hook para obtener los tipos de activos disponibles según la categoría del usuario
 */
export function useAvailableAssetTypes() {
  const { access, loading } = useAssetCategoryFilter()
  const [assetTypes, setAssetTypes] = useState<string[]>([])
  const [typesLoading, setTypesLoading] = useState(true)

  useEffect(() => {
    if (!access || loading) return

    const fetchAssetTypes = async () => {
      try {
        const supabase = await createSupabaseBrowserClient()

        let query = supabase
          .from('asset_type_categories')
          .select('asset_type')
          .eq('is_active', true)

        // Filtrar por categoría si el usuario tiene una asignada
        if (access.assetCategory && !access.canViewAllAssets) {
          query = query.eq('category', access.assetCategory)
        }

        const { data, error } = await query

        if (error) throw error

        setAssetTypes((data || []).map(item => item.asset_type))
      } catch (err) {
        console.error('Error fetching asset types:', err)
        setAssetTypes([])
      } finally {
        setTypesLoading(false)
      }
    }

    fetchAssetTypes()
  }, [access, loading])

  return { assetTypes, typesLoading, category: access?.assetCategory }
}

/**
 * Función helper: construir cláusula WHERE para filtrar activos por categoría
 * Uso: Para queries SQL en server actions
 */
export function buildAssetCategoryFilter(category: AssetCategoryType): string {
  if (!category || category === null) {
    return ''
  }

  if (category === 'IT') {
    return `AND a.asset_type IN (
      'DESKTOP', 'LAPTOP', 'TABLET', 'PHONE', 'MONITOR', 
      'PRINTER', 'SCANNER', 'SERVER', 'UPS', 'PROJECTOR'
    )`
  }

  if (category === 'MAINTENANCE') {
    return `AND a.asset_type IN (
      'AIR_CONDITIONING', 'HVAC_SYSTEM', 'BOILER',
      'REFRIGERATOR', 'KITCHEN_EQUIPMENT',
      'WASHING_MACHINE', 'DRYER',
      'WATER_HEATER', 'PUMP', 'GENERATOR', 'ELEVATOR',
      'FURNITURE', 'FIXTURE', 'CLEANING_EQUIPMENT', 'SECURITY_SYSTEM',
      'FIRE_SYSTEM', 'PLUMBING', 'ELECTRICAL', 'LIGHTING', 'VEHICLE', 'OTHER'
    )`
  }

  return ''
}

/**
 * Hook para filtrar una lista de activos según la categoría del usuario
 */
export function useFilteredAssets<T extends { asset_type: string }>(
  allAssets: T[]
) {
  const { access, loading } = useAssetCategoryFilter()
  const [filtered, setFiltered] = useState<T[]>(allAssets)

  useEffect(() => {
    if (loading || !access) return

    if (access.canViewAllAssets) {
      setFiltered(allAssets)
    } else if (access.assetCategory) {
      setFiltered(
        allAssets.filter(asset => {
          const categoryMap: Record<string, string[]> = {
            IT: [
              'DESKTOP', 'LAPTOP', 'TABLET', 'PHONE', 'MONITOR',
              'PRINTER', 'SCANNER', 'SERVER', 'UPS', 'PROJECTOR',
            ],
            MAINTENANCE: [
              'AIR_CONDITIONING', 'HVAC_SYSTEM', 'BOILER',
              'REFRIGERATOR', 'KITCHEN_EQUIPMENT',
              'WASHING_MACHINE', 'DRYER',
              'WATER_HEATER', 'PUMP', 'GENERATOR', 'ELEVATOR',
              'FURNITURE', 'FIXTURE', 'CLEANING_EQUIPMENT', 'SECURITY_SYSTEM',
              'FIRE_SYSTEM', 'PLUMBING', 'ELECTRICAL', 'LIGHTING', 'VEHICLE', 'OTHER',
            ],
          }

          const allowedTypes = categoryMap[access.assetCategory || 'IT'] || []
          return allowedTypes.includes(asset.asset_type)
        })
      )
    } else {
      setFiltered(allAssets)
    }
  }, [allAssets, access, loading])

  return { filtered, loading }
}

/**
 * Hook para obtener el label de categoría en español
 */
export function useCategoryLabel(category: AssetCategoryType): string {
  const labels: Record<string, string> = {
    IT: 'Tecnologia (IT)',
    MAINTENANCE: 'Mantenimiento',
    '': 'Todos los Activos',
  }

  return labels[category || ''] || 'Categoría desconocida'
}

/**
 * Hook para obtener clases dinámicas del badge
 */
export function useCategoryBadgeClass(category: AssetCategoryType): { classes: string; label: string } {
  if (category === 'IT') {
    return {
      classes: 'inline-block px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800',
      label: 'IT',
    }
  }

  if (category === 'MAINTENANCE') {
    return {
      classes: 'inline-block px-3 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800',
      label: 'Mantenimiento',
    }
  }

  return {
    classes: 'inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium',
    label: 'Administrador (Todos)',
  }
}
