import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  generateTicketsReportPdf,
  translateTicketPriorityEs,
  translateTicketStatusEs,
} from '@/lib/pdf/tickets-report'
import { loadZiiiLogoDataUrl } from '@/lib/pdf/ziii-logo'
import { formatTicketCode } from '@/lib/tickets/code'

export const runtime = 'nodejs'

const MEXICO_TZ = 'America/Mexico_City'

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)

  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '0')
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '1')
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '1')
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0')
  const second = Number(parts.find((part) => part.type === 'second')?.value ?? '0')

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  return asUtc - date.getTime()
}

function getMexicoDayStartUtc(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  const offset = getTimeZoneOffsetMs(guess, MEXICO_TZ)
  return new Date(guess.getTime() - offset).toISOString()
}

function getMexicoNextDayStartUtc(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const guess = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0))
  const offset = getTimeZoneOffsetMs(guess, MEXICO_TZ)
  return new Date(guess.getTime() - offset).toISOString()
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role
    if (!['admin', 'supervisor', 'auditor'].includes(role)) {
      return new Response('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const {
      locationId,
      locationName,
      locationCode,
      from,
      to,
      ticketIds,
      ticketType = 'IT',
      logoDataUrl,
      logoType,
    } = body as {
      locationId: string
      locationName: string
      locationCode: string
      from?: string
      to?: string
      ticketIds?: string[]
      ticketType?: 'IT' | 'MAINTENANCE'
      logoDataUrl?: string
      logoType?: 'PNG' | 'JPEG'
    }

    const selectedTicketIds = Array.isArray(ticketIds)
      ? ticketIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : []

    if (!locationId) return new Response('locationId required', { status: 400 })

    const { data: locationRecord } = await supabase
      .from('locations')
      .select('name, code, manager_name')
      .eq('id', locationId)
      .maybeSingle()

    const resolvedLocationName = String(locationRecord?.name || locationName || 'Sede').trim()
    const resolvedLocationCode = String(locationRecord?.code || locationCode || 'N/A').trim()
    const locationManagerName = String(locationRecord?.manager_name || '').trim()

    const tableName = ticketType === 'MAINTENANCE' ? 'tickets_maintenance' : 'tickets'

    let query = supabase
      .from(tableName)
      .select(`
        id,
        ticket_number,
        title,
        status,
        priority,
        requester_id,
        assigned_agent_id,
        created_at,
        closed_at,
        location_id
      `)
      .eq('location_id', locationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(0, 999)

    if (selectedTicketIds.length > 0) {
      query = query.in('id', selectedTicketIds) as typeof query
    }

    if (from) {
      const fromIso = getMexicoDayStartUtc(from)
      query = query.gte('created_at', fromIso) as typeof query
    }
    if (to) {
      const toIsoExclusive = getMexicoNextDayStartUtc(to)
      query = query.lt('created_at', toIsoExclusive) as typeof query
    }

    const { data: rawTickets, error } = await query
    if (error) return new Response(error.message, { status: 500 })

    const tickets = rawTickets ?? []

    // Fetch user profiles
    const userIds = [
      ...new Set([
        ...tickets.map((t: any) => t.requester_id),
        ...tickets.map((t: any) => t.assigned_agent_id),
      ].filter(Boolean)),
    ]

    const { data: users } = userIds.length
      ? await supabase.from('profiles').select('id,full_name').in('id', userIds)
      : { data: [] as any[] }
    const userMap = new Map((users ?? []).map((u: any) => [u.id, u]))

    // Stats
    const openCount = tickets.filter((t: any) =>
      !['CLOSED', 'CANCELLED', 'CANCELED', 'RESOLVED'].includes(t.status)
    ).length
    const closedCount = tickets.filter((t: any) => t.status === 'CLOSED').length

    const ticketsWithTimes = tickets.filter(
      (t: any) => t.closed_at && t.created_at && t.status === 'CLOSED'
    )
    const avgDays =
      ticketsWithTimes.length > 0
        ? ticketsWithTimes.reduce((acc: number, t: any) => {
            const days =
              (new Date(t.closed_at).getTime() - new Date(t.created_at).getTime()) /
              (1000 * 60 * 60 * 24)
            return acc + Math.max(0, days)
          }, 0) / ticketsWithTimes.length
        : 0

    const summary = [
      { label: 'Total', value: String(tickets.length) },
      { label: 'Abiertos', value: String(openCount) },
      { label: 'Cerrados', value: String(closedCount) },
      { label: 'Tiempo prom.', value: `${avgDays.toFixed(1)} días` },
    ]

    const rows = tickets.map((t: any) => {
      const requester = t.requester_id ? userMap.get(t.requester_id) : null
      const agent = t.assigned_agent_id ? userMap.get(t.assigned_agent_id) : null

      return {
        code: formatTicketCode({ ticket_number: t.ticket_number, created_at: t.created_at }),
        title: t.title ?? '',
        status: translateTicketStatusEs(t.status),
        priority: translateTicketPriorityEs(t.priority),
        requester: requester?.full_name || '',
        assignee: agent?.full_name || '',
        location: resolvedLocationCode,
        createdAt: t.created_at
          ? new Date(t.created_at).toLocaleDateString('es-MX', {
              timeZone: 'America/Mexico_City',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '',
      }
    })

    // Logo: use uploaded logo if provided, otherwise fall back to ZIII default
    let logo: { dataUrl: string; type: 'PNG' | 'JPEG' } | undefined
    if (logoDataUrl) {
      logo = { dataUrl: logoDataUrl, type: logoType ?? 'PNG' }
    } else {
      const defaultLogo = await loadZiiiLogoDataUrl()
      if (defaultLogo) logo = defaultLogo
    }

    const typeLabel = ticketType === 'MAINTENANCE' ? 'Mantenimiento' : 'IT'
    const dateRange =
      from || to
        ? `${from ? `Desde ${from}` : ''}${from && to ? '  |  ' : ''}${to ? `Hasta ${to}` : ''}`
        : ''

    const pdf = generateTicketsReportPdf({
      eyebrow: 'Reporte por sede',
      title: `Reporte de Tickets ${typeLabel}`,
      subtitle: resolvedLocationName,
      meta: `${resolvedLocationCode}${dateRange ? `  |  ${dateRange}` : ''}`,
      tableTitle: 'Detalle operativo de tickets',
      signature: {
        title: 'Firma de conformidad',
        name: locationManagerName || ' ',
        role: 'Responsable de la propiedad',
      },
      summary,
      rows,
      generatedAt: new Date(),
      logo,
      columns: [
        { key: 'code', label: 'Código', width: 110 },
        { key: 'title', label: 'Título', width: 280 },
        { key: 'status', label: 'Estado', width: 80 },
        { key: 'priority', label: 'Prioridad', width: 70 },
        { key: 'requester', label: 'Solicitante', width: 160 },
        { key: 'assignee', label: 'Asignado a', width: 140 },
        { key: 'createdAt', label: 'Creado', width: 90 },
      ],
    })

    const safeCode = resolvedLocationCode.replace(/[^a-zA-Z0-9-_]/g, '_')
    const nowDate = new Date().toISOString().slice(0, 10)
    const filename = `tickets-${typeLabel.toLowerCase()}-${safeCode}-${nowDate}.pdf`

    return new Response(new Blob([pdf], { type: 'application/pdf' }), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Error generating location PDF:', err)
    return new Response('Internal server error', { status: 500 })
  }
}
