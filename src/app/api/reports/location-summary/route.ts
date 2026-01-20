import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendMail } from '@/lib/email/mailer'
import { locationSummaryEmailTemplate } from '@/lib/email/templates'

const OPEN_STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'NEEDS_INFO', 'WAITING_THIRD_PARTY']

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar rol (solo admin / supervisor pueden enviar reportes de sede)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'supervisor')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const locationId = body?.locationId as string | undefined
    const ticketType = (body?.ticketType as string | undefined) ?? 'IT' // 'IT' o 'MAINTENANCE'
    const includeLocationRecipients =
      typeof body?.includeLocationRecipients === 'boolean'
        ? (body.includeLocationRecipients as boolean)
        : true
    const additionalEmailsRaw = (body?.additionalEmails as string[] | undefined) ?? []

    if (!locationId) {
      return NextResponse.json({ error: 'locationId requerido' }, { status: 400 })
    }

    // Determinar la tabla según el tipo de ticket
    const ticketsTable = ticketType === 'MAINTENANCE' ? 'tickets_maintenance' : 'tickets'
    const maintenanceStatuses = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_PARTS', 'NEEDS_INFO']
    const relevantStatuses = ticketType === 'MAINTENANCE' ? maintenanceStatuses : OPEN_STATUSES

    // Obtener estadísticas calculadas dinámicamente
    let statsRow: any = null

    if (ticketType === 'MAINTENANCE') {
      // Calcular estadísticas para mantenimiento
      const { data: allTickets, error: allTicketsError } = await supabase
        .from('tickets_maintenance')
        .select('id, status, created_at, closed_at')
        .eq('location_id', locationId)
        .is('deleted_at', null)

      if (allTicketsError) {
        return NextResponse.json({ error: 'Error obteniendo tickets de mantenimiento' }, { status: 500 })
      }

      const tickets = allTickets || []
      const totalTickets = tickets.length
      const openTickets = tickets.filter(t => t.status !== 'CLOSED').length
      const closedTickets = tickets.filter(t => t.status === 'CLOSED').length
      
      // Calcular promedio de resolución
      const closedWithDates = tickets.filter(t => t.status === 'CLOSED' && t.closed_at)
      const avgResolutionDays = closedWithDates.length > 0
        ? closedWithDates.reduce((sum, t) => {
            const created = new Date(t.created_at).getTime()
            const closed = new Date(t.closed_at!).getTime()
            return sum + ((closed - created) / (1000 * 60 * 60 * 24))
          }, 0) / closedWithDates.length
        : 0

      // Obtener información de la sede
      const { data: location } = await supabase
        .from('locations')
        .select('code, name')
        .eq('id', locationId)
        .single()

      statsRow = {
        location_id: locationId,
        location_code: location?.code || 'N/A',
        location_name: location?.name || 'Desconocida',
        total_tickets: totalTickets,
        open_tickets: openTickets,
        closed_tickets: closedTickets,
        avg_resolution_days: avgResolutionDays
      }
    } else {
      // Usar vista para IT
      const { data, error: statsError } = await supabase
        .from('location_incident_stats')
        .select('*')
        .eq('location_id', locationId)
        .maybeSingle()

      if (statsError || !data) {
        return NextResponse.json({ error: 'No se encontraron estadísticas para la sede' }, { status: 404 })
      }
      statsRow = data
    }

    if (!statsRow) {
      return NextResponse.json({ error: 'No se encontraron estadísticas para la sede' }, { status: 404 })
    }

    // Obtener tickets abiertos más relevantes de la sede
    const { data: openTickets, error: ticketsError } = await supabase
      .from(ticketsTable)
      .select('id, ticket_number, title, status, priority, created_at')
      .eq('location_id', locationId)
      .is('deleted_at', null)
      .in('status', relevantStatuses)
      .order('created_at', { ascending: true })
      .limit(10)

    if (ticketsError) {
      console.error('[location-summary] Error obteniendo tickets abiertos:', ticketsError)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const now = new Date()

    const openTicketsList = (openTickets ?? []).map((t) => {
      const created = t.created_at ? new Date(t.created_at as string) : now
      const diffMs = now.getTime() - created.getTime()
      const ageDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

      return {
        ticketNumber: String(t.ticket_number ?? ''),
        title: String(t.title ?? ''),
        priority: String(t.priority ?? 'Media'),
        status: String(t.status ?? ''),
        ageDays,
        ticketUrl: `${baseUrl}/tickets/${t.id}`,
      }
    })

    // Obtener destinatarios desde función de usuarios notificables, filtrando por sede
    const { data: notifiable, error: notifiableError } = await supabase.rpc(
      'get_notifiable_users_with_locations'
    )

    if (notifiableError) {
      console.error('[location-summary] Error obteniendo usuarios notificables:', notifiableError)
    }

    const locationCode: string = statsRow.location_code
    const locationName: string = statsRow.location_name

    let recipients: string[] = []

    if (includeLocationRecipients) {
      const fromLocation = (notifiable ?? [])
        .filter((u: any) => !!u.email)
        .filter((u: any) => {
          const codesRaw = String(u.location_codes ?? '')
          if (!codesRaw) return false
          const codes = codesRaw.split(',').map((c) => c.trim())
          return codes.includes('Todas') || codes.includes(locationCode)
        })
        .map((u: any) => String(u.email))

      recipients = recipients.concat(fromLocation)
    }

    const additionalEmails = additionalEmailsRaw
      .map((e) => String(e || '').trim())
      .filter((e) => !!e)

    recipients = recipients.concat(additionalEmails)

    const uniqueRecipients = Array.from(new Set(recipients))

    if (!uniqueRecipients.length) {
      return NextResponse.json(
        { error: 'No se encontraron destinatarios válidos para esta sede' },
        { status: 400 }
      )
    }

    const summaryLabel = ticketType === 'MAINTENANCE' 
      ? 'Resumen ejecutivo de mantenimiento por sede'
      : 'Resumen ejecutivo de incidencias por sede'

    const template = locationSummaryEmailTemplate({
      locationCode,
      locationName,
      summaryLabel,
      totalTickets: Number(statsRow.total_tickets ?? 0),
      openTickets: Number(statsRow.open_tickets ?? 0),
      closedTickets: Number(statsRow.closed_tickets ?? 0),
      avgResolutionDays: Number(statsRow.avg_resolution_days ?? 0),
      openTicketsList,
    })

    // Enviar el correo a todos los responsables identificados
    await Promise.all(
      uniqueRecipients.map((email) =>
        sendMail({
          to: email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        })
      )
    )

    return NextResponse.json({ ok: true, sentTo: uniqueRecipients })
  } catch (error) {
    console.error('[location-summary] Error inesperado:', error)
    return NextResponse.json({ error: 'Error interno al generar el reporte' }, { status: 500 })
  }
}
