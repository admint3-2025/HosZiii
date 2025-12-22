import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createSupabaseServerClient()

  // Verificar autenticación
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Obtener el ticket
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .single()

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
  }

  // Verificar que el usuario es el solicitante
  if (ticket.requester_id !== user.id) {
    return NextResponse.json(
      { error: 'Solo el solicitante puede reabrir el ticket' },
      { status: 403 }
    )
  }

  // Verificar que el ticket esté cerrado
  if (ticket.status !== 'CLOSED') {
    return NextResponse.json(
      { error: 'El ticket no está cerrado' },
      { status: 400 }
    )
  }

  // Verificar que se pueda reabrir (mismo día del cierre)
  if (!ticket.closed_at) {
    return NextResponse.json(
      { error: 'El ticket no tiene fecha de cierre' },
      { status: 400 }
    )
  }

  const closedDate = new Date(ticket.closed_at)
  const today = new Date()

  // Comparar solo las fechas (ignorar horas)
  if (closedDate.toDateString() !== today.toDateString()) {
    return NextResponse.json(
      { error: 'Solo puedes reabrir el ticket el mismo día del cierre' },
      { status: 403 }
    )
  }

  // Reabrir el ticket
  const { error: updateError } = await supabase
    .from('tickets')
    .update({
      status: 'IN_PROGRESS',
      closed_at: null,
      closed_by: null,
      resolution: null,
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json(
      { error: 'Error al reabrir el ticket' },
      { status: 500 }
    )
  }

  // Agregar un comentario automático
  await supabase.from('ticket_comments').insert({
    ticket_id: id,
    author_id: user.id,
    body: '🔄 **Ticket reabierto**\n\nLa incidencia volvió a ocurrir. El ticket ha sido reabierto para continuar con la atención.',
    visibility: 'public',
  })

  return NextResponse.json({ success: true })
}
