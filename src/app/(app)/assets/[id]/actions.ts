'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateAssetWithLocationChange(
  assetId: string,
  updateData: {
    asset_tag: string
    asset_type: string
    status: string
    serial_number: string | null
    model: string | null
    brand: string | null
    department: string | null
    purchase_date: string | null
    warranty_end_date: string | null
    location: string | null
    location_id: string | null
    assigned_to: string | null
    notes: string | null
    processor: string | null
    ram_gb: number | null
    storage_gb: number | null
    os: string | null
    image_url?: string | null
  },
  locationChangeReason?: string
) {
  const supabase = await createSupabaseServerClient()

  try {
    // Usar la función RPC que maneja todo en una sola transacción
    const { error } = await supabase.rpc('update_asset_with_location_reason', {
      p_asset_id: assetId,
      p_asset_tag: updateData.asset_tag,
      p_asset_type: updateData.asset_type,
      p_status: updateData.status,
      p_serial_number: updateData.serial_number,
      p_model: updateData.model,
      p_brand: updateData.brand,
      p_department: updateData.department,
      p_purchase_date: updateData.purchase_date,
      p_warranty_end_date: updateData.warranty_end_date,
      p_location: updateData.location,
      p_location_id: updateData.location_id,
      p_notes: updateData.notes,
      p_assigned_to: updateData.assigned_to,
      p_processor: updateData.processor,
      p_ram_gb: updateData.ram_gb,
      p_storage_gb: updateData.storage_gb,
      p_os: updateData.os,
      p_image_url: updateData.image_url || null,
      p_location_change_reason: locationChangeReason || null
    })

    if (error) {
      console.error('Error updating asset:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/assets/${assetId}`)
    revalidatePath('/assets')

    return { success: true }
  } catch (error) {
    console.error('Error in updateAssetWithLocationChange:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}
