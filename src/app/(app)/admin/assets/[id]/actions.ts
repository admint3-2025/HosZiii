'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateAssetWithLocationChange(
  assetId: string,
  updateData: {
    asset_code: string
    asset_type: string | null
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
  const adminClient = createSupabaseAdminClient()

  try {
    // Obtener el usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    // Obtener valores anteriores para registrar cambios
    const { data: oldAsset, error: fetchError } = await adminClient
      .from('assets_it')
      .select('*, asset_location:locations!location_id(id, name, code)')
      .eq('id', assetId)
      .single()

    if (fetchError || !oldAsset) {
      console.error('Error fetching old asset:', fetchError)
      return { success: false, error: 'No se encontró el activo' }
    }

    // Verificar si hay cambio de ubicación sin razón
    if (oldAsset.location_id !== updateData.location_id && !locationChangeReason?.trim()) {
      return { success: false, error: 'LOCATION_CHANGE_REQUIRES_REASON' }
    }

    const now = new Date().toISOString()

    const baseUpdatePayload: Record<string, any> = {
      asset_code: updateData.asset_code,
      name: updateData.asset_code,
      category: updateData.asset_type,
      status: updateData.status?.toUpperCase() || 'ACTIVE',
      serial_number: updateData.serial_number,
      model: updateData.model,
      brand: updateData.brand,
      department: updateData.department,
      location_id: updateData.location_id,
      assigned_to_user_id: updateData.assigned_to,
      purchase_date: updateData.purchase_date,
      warranty_expiry: updateData.warranty_end_date,
      notes: updateData.notes,
      image_url: updateData.image_url,
      updated_at: now,
      updated_by: user.id,
    }

    const tryUpdate = async (client: typeof supabase | typeof adminClient) => {
      let res = await (client as any).from('assets_it').update(baseUpdatePayload).eq('id', assetId)
      if (res?.error?.message?.includes("'updated_by'") || res?.error?.message?.includes('updated_by')) {
        const { updated_by: _ignored, ...withoutUpdatedBy } = baseUpdatePayload
        res = await (client as any).from('assets_it').update(withoutUpdatedBy).eq('id', assetId)
      }
      return res
    }

    let updateRes = await tryUpdate(supabase)
    if (updateRes?.error) {
      updateRes = await tryUpdate(adminClient)
    }

    if (updateRes?.error) {
      console.error('Error updating assets_it:', updateRes.error)
      return { success: false, error: updateRes.error.message }
    }

    revalidatePath(`/admin/assets/${assetId}`)
    revalidatePath('/admin/assets')

    return { success: true }
  } catch (error) {
    console.error('Error in updateAssetWithLocationChange:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}
