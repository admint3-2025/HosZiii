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

/**
 * Determines if a recipient should receive notifications for a ticket category.
 * 
 * For supervisors: checks hub_visible_modules (source of truth for module access)
 * For agents: checks asset_category (their technical specialization)
 * For admins: always true
 */
export function recipientMatchesTicketCategory(params: {
  recipientAssetCategory: string | null | undefined
  ticketCategory: TicketAssetCategory
  recipientRole?: string | null | undefined
  recipientHubModules?: Record<string, string | boolean> | null | undefined
}): boolean {
  const { recipientAssetCategory, ticketCategory, recipientRole, recipientHubModules } = params

  // Admins get everything
  if (recipientRole === 'admin') return true
  // If the ticket has no category, don't filter
  if (!ticketCategory) return true

  // For supervisors: use hub_visible_modules as source of truth
  if (recipientRole === 'supervisor') {
    if (!recipientHubModules) return false
    // Map ticket category to module ID
    const moduleId = ticketCategory === 'IT' ? 'it-helpdesk' : 'mantenimiento'
    const access = recipientHubModules[moduleId]
    // Only supervisors with 'supervisor' level access to the module get notifications
    return access === 'supervisor'
  }

  // For agents (agent_l1, agent_l2): use asset_category (their specialization)
  if (!recipientAssetCategory) return false
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
