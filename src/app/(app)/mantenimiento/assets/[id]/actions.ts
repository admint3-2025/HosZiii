'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateMaintenanceAsset(
  assetId: string,
  updateData: {
    asset_code?: string
    name?: string
    description?: string
    category?: string
    brand?: string | null
    model?: string | null
    serial_number?: string | null
    status: string
    location_id?: string | null
    assigned_to_user_id?: string | null
    purchase_date?: string | null
    warranty_expiry?: string | null
    cost?: number | null
    notes?: string | null
    image_url?: string | null
  }
) {
  console.log('[updateMaintenanceAsset] Called with:', { assetId, updateData })
  
  const supabase = await createSupabaseServerClient()

  try {
    // Clean up the data - remove undefined values to avoid overwriting with undefined
    const cleanedData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }
    
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        cleanedData[key] = value
      }
    }
    
    console.log('[updateMaintenanceAsset] Cleaned data:', cleanedData)

    const { data, error } = await supabase
      .from('assets_maintenance')
      .update(cleanedData)
      .eq('id', assetId)
      .select()

    console.log('[updateMaintenanceAsset] Result:', { data, error })

    if (error) {
      console.error('[updateMaintenanceAsset] Error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/mantenimiento/assets/${assetId}`)
    revalidatePath('/mantenimiento/assets')

    return { success: true }
  } catch (error) {
    console.error('[updateMaintenanceAsset] Exception:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}
