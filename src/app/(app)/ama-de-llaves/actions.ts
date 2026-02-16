'use server'

import { createMaintenanceTicket } from '@/app/(app)/mantenimiento/tickets/new/actions'

export async function createExpressMaintenanceTicketForRoom(params: {
  hkRoomId: string
  locationId: string | null
  roomNumber?: string | null
  title?: string | null
  description?: string | null
}) {
  const roomLabel = (params.roomNumber || '').trim()

  const title = (params.title || '').trim() || `Habitación ${roomLabel || ''} · Mantenimiento`.trim()

  const description =
    (params.description || '').trim() ||
    [
      'Creación express desde Ama de Llaves.',
      roomLabel ? `Habitación: ${roomLabel}` : null,
      'Motivo: (pendiente de completar)',
    ]
      .filter(Boolean)
      .join('\n')

  const res = await createMaintenanceTicket({
    title,
    description,
    category_id: null,
    impact: 3,
    urgency: 3,
    priority: 3,
    support_level: 2,
    location_id: params.locationId || undefined,
    hk_room_id: params.hkRoomId,
  })

  return res
}
