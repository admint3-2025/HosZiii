export type TicketAssetCategory = 'IT' | 'MAINTENANCE' | null

export const IT_ASSET_TYPES = [
  'DESKTOP',
  'LAPTOP',
  'TABLET',
  'PHONE',
  'MONITOR',
  'PRINTER',
  'SCANNER',
  'SERVER',
  'UPS',
  'PROJECTOR',
] as const

export const MAINTENANCE_ASSET_TYPES = [
  'AIR_CONDITIONING',
  'HVAC_SYSTEM',
  'BOILER',
  'REFRIGERATOR',
  'KITCHEN_EQUIPMENT',
  'WASHING_MACHINE',
  'DRYER',
  'WATER_HEATER',
  'PUMP',
  'GENERATOR',
  'ELEVATOR',
  'FURNITURE',
  'FIXTURE',
  'CLEANING_EQUIPMENT',
  'SECURITY_SYSTEM',
  'FIRE_SYSTEM',
  'PLUMBING',
  'ELECTRICAL',
  'LIGHTING',
  'VEHICLE',
  'OTHER',
] as const

export function inferTicketAssetCategory(assetType: string | null | undefined): TicketAssetCategory {
  if (!assetType) return null

  if ((IT_ASSET_TYPES as readonly string[]).includes(assetType)) return 'IT'
  if ((MAINTENANCE_ASSET_TYPES as readonly string[]).includes(assetType)) return 'MAINTENANCE'

  return null
}

export function getServiceLabelForTicketCategory(category: TicketAssetCategory): string {
  return category === 'MAINTENANCE' ? 'Operación y mantenimiento' : 'Mesa de Ayuda ITIL'
}

export function recipientMatchesTicketCategory(params: {
  recipientAssetCategory: string | null | undefined
  ticketCategory: TicketAssetCategory
  recipientRole?: string | null | undefined
}): boolean {
  const { recipientAssetCategory, ticketCategory, recipientRole } = params

  if (recipientRole === 'admin') return true
  if (!ticketCategory) return true
  if (!recipientAssetCategory) return true

  return recipientAssetCategory === ticketCategory
}

type SupabaseLike = {
  from: (table: string) => any
}

export async function fetchTicketAssetCategory(
  supabase: SupabaseLike,
  ticketId: string,
): Promise<TicketAssetCategory> {
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('asset_id')
    .eq('id', ticketId)
    .single()

  if (ticketError || !ticket?.asset_id) return null

  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('asset_type')
    .eq('id', ticket.asset_id)
    .single()

  if (assetError) return null

  return inferTicketAssetCategory(asset?.asset_type)
}
