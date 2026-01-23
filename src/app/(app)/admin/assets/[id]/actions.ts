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

    // Actualizar directamente en assets_it usando el cliente admin
    const { error: updateError } = await adminClient
      .from('assets_it')
      .update({
        asset_code: updateData.asset_code,
        name: updateData.asset_code, // Usar asset_code como nombre por defecto
        category: updateData.asset_type,
        status: updateData.status?.toUpperCase() || 'ACTIVE',
        serial_number: updateData.serial_number,
        model: updateData.model,
        brand: updateData.brand,
        location_id: updateData.location_id,
        assigned_to_user_id: updateData.assigned_to,
        purchase_date: updateData.purchase_date,
        warranty_expiry: updateData.warranty_end_date,
        notes: updateData.notes,
        image_url: updateData.image_url,
        updated_at: new Date().toISOString(),
        // updated_by: user.id, // Comentado temporalmente - el trigger usa auth.uid()
      })
      .eq('id', assetId)

    if (updateError) {
      console.error('Error updating asset_it:', updateError)
      return { success: false, error: updateError.message }
    }

    // Registrar cambios en asset_changes si hay cambios relevantes
    const changes: any[] = []
    const changedAt = new Date().toISOString()

    // Cambio de ubicación
    if (oldAsset.location_id !== updateData.location_id) {
      changes.push({
        asset_id: assetId,
        asset_tag: updateData.asset_code,
        field_name: 'location_id',
        change_type: 'UPDATE',
        old_value: oldAsset.asset_location?.code || oldAsset.location_id || 'Sin sede',
        new_value: updateData.location_id || 'Sin sede',
        changed_by: user.id,
        changed_at: changedAt,
      })
    }

    // Cambio de estado
    if (oldAsset.status?.toUpperCase() !== updateData.status?.toUpperCase()) {
      changes.push({
        asset_id: assetId,
        asset_tag: updateData.asset_code,
        field_name: 'status',
        change_type: 'UPDATE',
        old_value: oldAsset.status,
        new_value: updateData.status?.toUpperCase(),
        changed_by: user.id,
        changed_at: changedAt,
      })
    }

    // Cambio de asignación
    if (oldAsset.assigned_to_user_id !== updateData.assigned_to) {
      changes.push({
        asset_id: assetId,
        asset_tag: updateData.asset_code,
        field_name: 'assigned_to',
        change_type: 'UPDATE',
        old_value: oldAsset.assigned_to_user_id || 'Sin asignar',
        new_value: updateData.assigned_to || 'Sin asignar',
        changed_by: user.id,
        changed_at: changedAt,
      })
    }

    // Cambio de imagen
    if (oldAsset.image_url !== updateData.image_url) {
      changes.push({
        asset_id: assetId,
        asset_tag: updateData.asset_code,
        field_name: 'image_url',
        change_type: 'UPDATE',
        old_value: oldAsset.image_url || 'Sin imagen',
        new_value: updateData.image_url || 'Imagen eliminada',
        changed_by: user.id,
        changed_at: changedAt,
      })
    }

    // Insertar cambios en asset_changes
    if (changes.length > 0) {
      const { error: changesError } = await adminClient
        .from('asset_changes')
        .insert(changes)

      if (changesError) {
        console.error('Error inserting asset_changes (non-fatal):', changesError)
        // No retornamos error porque el activo se actualizó correctamente
      }
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
