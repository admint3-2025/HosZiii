/**
 * POST /api/corporativo/notify-rooms-out-of-service
 * Envía notificación a gerentes/responsables de una propiedad sobre habitaciones fuera de servicio
 * Body: { location_id, template_id?, includeLocationRecipients?, additionalEmails?, explanation? }
 */
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendMail } from '@/lib/email/mailer'
import { roomsOutOfServiceFollowUpEmailTemplate } from '@/lib/email/templates'
import { NextRequest } from 'next/server'

type TemplateId = 'retro_eta' | 'bloqueadas_largas' | 'mantenimiento_eta' | 'custom'

function isValidEmail(value: string) {
  const v = String(value || '').trim()
  if (!v) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function computeAgeParts(updatedAt: string | null | undefined) {
  if (!updatedAt) return { daysOut: 0, hoursOut: 0 }
  const now = Date.now()
  const ts = new Date(updatedAt).getTime()
  if (!Number.isFinite(ts)) return { daysOut: 0, hoursOut: 0 }
  const diffMs = Math.max(0, now - ts)
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const daysOut = Math.floor(diffHours / 24)
  const hoursOut = diffHours % 24
  return { daysOut, hoursOut }
}

function buildMessage(params: {
  templateId: TemplateId
  locationName: string
  maintenanceCount: number
  blockedCount: number
  maxDaysOut: number
  roomsCount: number
  scopeLabel: string
  customExplanation?: string
}) {
  const {
    templateId,
    locationName,
    maintenanceCount,
    blockedCount,
    maxDaysOut,
    roomsCount,
    scopeLabel,
    customExplanation,
  } = params

  const header = [
    'Hola equipo,',
    '',
    `Desde Corporativo solicitamos actualización sobre habitaciones fuera de servicio en: ${locationName}.`,
    `Total OOS (incluidas en este envío): ${roomsCount} (Mantenimiento: ${maintenanceCount}, Bloqueadas: ${blockedCount}) · Máx antigüedad: ${maxDaysOut}d.`,
    scopeLabel,
    'Tiempo máximo de respuesta sugerido: 2 horas.',
    '',
  ]

  const askRetroEta = [
    'Por favor enviar:',
    '1) Retro/causa por cada habitación',
    '2) Responsable asignado',
    '3) ETA (fecha/hora estimada de liberación o próximo hito)',
    '',
  ]

  const askMaintenance = [
    'Por favor confirmar para cada caso en mantenimiento:',
    '1) Causa / intervención en curso',
    '2) Ticket/orden de trabajo (si aplica)',
    '3) ETA de liberación',
    '',
  ]

  const askBlocked = [
    'Por favor confirmar para cada bloqueo:',
    '1) Justificación del bloqueo',
    '2) Condición/fecha de desbloqueo',
    '3) Responsable',
    '',
  ]

  if (templateId === 'custom') {
    const expl = (customExplanation || '').trim() || 'Solicitud de explicación sobre habitaciones fuera de servicio'
    return [...header, expl].join('\n')
  }

  const ask =
    templateId === 'mantenimiento_eta'
      ? askMaintenance
      : templateId === 'bloqueadas_largas'
        ? askBlocked
        : askRetroEta

  return [...header, ...ask].join('\n')
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_corporate, full_name')
    .eq('id', user.id)
    .single()

  // Solo admin o supervisor corporativo pueden enviar notificaciones
  if (!profile || !(profile.role === 'admin' || (profile.role === 'supervisor' && profile.is_corporate))) {
    return Response.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const location_id = body?.location_id as string | undefined
  const explanation = body?.explanation as string | undefined
  const template_id_raw = body?.template_id as string | undefined
  const dry_run = typeof body?.dry_run === 'boolean' ? (body.dry_run as boolean) : false
  const min_days_raw = body?.min_days
  const min_days = Number.isFinite(Number(min_days_raw)) ? Math.max(0, Number(min_days_raw)) : 3
  const managerEmailsRaw = (body?.managerEmails as string[] | undefined) ?? undefined
  const includeLocationRecipients =
    typeof body?.includeLocationRecipients === 'boolean'
      ? (body.includeLocationRecipients as boolean)
      : true
  const additionalEmailsRaw = (body?.additionalEmails as string[] | undefined) ?? []

  const template_id: TemplateId =
    template_id_raw === 'retro_eta' ||
    template_id_raw === 'bloqueadas_largas' ||
    template_id_raw === 'mantenimiento_eta'
      ? template_id_raw
      : explanation
        ? 'custom'
        : 'retro_eta'

  if (!location_id) {
    return Response.json({ error: 'location_id es requerido' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // Obtener información de la ubicación
  const { data: location } = await admin
    .from('locations')
    .select('id, name, code')
    .eq('id', location_id)
    .single()

  if (!location) {
    return Response.json({ error: 'Ubicación no encontrada' }, { status: 404 })
  }

  // Obtener gerentes/responsables de la propiedad
  const { data: managers } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .eq('location_id', location_id)
    .in('role', ['supervisor', 'admin'])

  const managerOptions = (managers ?? [])
    .map((m: any) => ({
      full_name: (m.full_name ?? null) as string | null,
      email: String(m.email || '').trim(),
    }))
    .filter((m) => !!m.email)
    .filter((m) => isValidEmail(m.email))

  const managerEmailSet = new Set(managerOptions.map((m) => m.email))

  let selectedManagerEmails: string[] = []
  if (includeLocationRecipients) {
    if (Array.isArray(managerEmailsRaw) && managerEmailsRaw.length) {
      const requested = managerEmailsRaw.map((e) => String(e || '').trim()).filter((e) => !!e)
      const invalid = requested.filter((e) => !isValidEmail(e))
      if (invalid.length) {
        return Response.json(
          { success: false, message: `Correo(s) inválido(s) en responsables: ${invalid.join(', ')}` },
          { status: 400 }
        )
      }

      const notAllowed = requested.filter((e) => !managerEmailSet.has(e))
      if (notAllowed.length) {
        return Response.json(
          { success: false, message: `Correo(s) no pertenecen a responsables de la sede: ${notAllowed.join(', ')}` },
          { status: 400 }
        )
      }

      selectedManagerEmails = Array.from(new Set(requested)).sort()
    } else {
      selectedManagerEmails = Array.from(managerEmailSet).sort()
    }
  }

  // Obtener habitaciones fuera de servicio
  const { data: outOfServiceRooms } = await admin
    .from('hk_rooms')
    .select('id, number, floor, status, updated_at')
    .eq('location_id', location_id)
    .in('status', ['mantenimiento', 'bloqueada'])
    .eq('is_active', true)

  if (!outOfServiceRooms || outOfServiceRooms.length === 0) {
    return Response.json({ 
      success: false, 
      message: 'No hay habitaciones fuera de servicio en esta propiedad' 
    }, { status: 400 })
  }

  const normalizedRooms = outOfServiceRooms.map((r) => {
    const age = computeAgeParts(r.updated_at)
    return {
      number: String(r.number ?? ''),
      floor: Number(r.floor ?? 0),
      status: String(r.status ?? ''),
      daysOut: age.daysOut,
      hoursOut: age.hoursOut,
    }
  })

  // Aplicar alcance según plantilla
  let scopedRooms = normalizedRooms
  let scopeLabel = 'Alcance: todas las habitaciones OOS (mantenimiento y bloqueadas).'

  if (template_id === 'mantenimiento_eta') {
    scopedRooms = normalizedRooms.filter(r => r.status === 'mantenimiento')
    scopeLabel = 'Alcance: solo habitaciones en mantenimiento.'
  } else if (template_id === 'bloqueadas_largas') {
    const onlyBlocked = normalizedRooms.filter(r => r.status === 'bloqueada')
    const longBlocked = onlyBlocked.filter(r => r.daysOut >= min_days)
    scopedRooms = longBlocked.length ? longBlocked : onlyBlocked
    scopeLabel = longBlocked.length
      ? `Alcance: bloqueadas con antigüedad ≥ ${min_days} días.`
      : `Alcance: bloqueadas (no hay casos ≥ ${min_days} días; se incluyen todas las bloqueadas).`
  }

  if (!scopedRooms.length) {
    return Response.json(
      {
        success: false,
        message:
          template_id === 'mantenimiento_eta'
            ? 'No hay habitaciones en mantenimiento para notificar con esta plantilla'
            : template_id === 'bloqueadas_largas'
              ? 'No hay habitaciones bloqueadas para notificar con esta plantilla'
              : 'No hay habitaciones fuera de servicio para notificar',
      },
      { status: 400 }
    )
  }

  const maintenanceCount = scopedRooms.filter(r => r.status === 'mantenimiento').length
  const blockedCount = scopedRooms.filter(r => r.status === 'bloqueada').length
  const maxDaysOut = scopedRooms.reduce((max, r) => Math.max(max, r.daysOut), 0)

  const messageText = buildMessage({
    templateId: template_id,
    locationName: location.name,
    maintenanceCount,
    blockedCount,
    maxDaysOut,
    roomsCount: scopedRooms.length,
    scopeLabel,
    customExplanation: explanation,
  })

  const additionalEmails = additionalEmailsRaw
    .map((e) => String(e || '').trim())
    .filter((e) => !!e)

  const invalidEmails = additionalEmails.filter((e) => !isValidEmail(e))
  if (invalidEmails.length) {
    return Response.json(
      { success: false, message: `Correo(s) inválido(s): ${invalidEmails.join(', ')}` },
      { status: 400 }
    )
  }

  let recipients: string[] = []

  if (includeLocationRecipients) {
    recipients = recipients.concat(selectedManagerEmails)
  }

  recipients = recipients.concat(additionalEmails)
  const uniqueRecipients = Array.from(new Set(recipients))

  if (!uniqueRecipients.length) {
    return Response.json(
      { success: false, message: 'No se encontraron destinatarios válidos para esta propiedad' },
      { status: 400 }
    )
  }

  const now = new Date()

  try {
    const template = roomsOutOfServiceFollowUpEmailTemplate({
      locationCode: String((location as any).code || 'N/A'),
      locationName: location.name,
      senderName: profile.full_name || 'Corporativo',
      templateId: template_id === 'custom' ? 'retro_eta' : template_id,
      messageText,
      roomsCount: scopedRooms.length,
      maintenanceCount,
      blockedCount,
      maxDaysOut,
      rooms: scopedRooms,
      sentAtIso: now.toISOString(),
    })

    if (dry_run) {
      return Response.json({
        ok: true,
        subject: template.subject,
        recipients: uniqueRecipients,
        managerOptions,
        selectedManagerEmails,
        meta: {
          template_id,
          includeLocationRecipients,
          additionalEmails,
          min_days,
          scopeLabel,
          rooms_count: scopedRooms.length,
        },
      })
    }

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

    return Response.json({
      success: true,
      message: `Notificación enviada a ${uniqueRecipients.length} destinatario(s)`,
      sentTo: uniqueRecipients,
      preview: {
        template_id,
        includeLocationRecipients,
        additionalEmails,
        messageText,
      },
    })
  } catch (error) {
    return Response.json({
      error: 'Error al enviar notificación',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
