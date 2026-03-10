import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendMail } from '@/lib/email/mailer'
import { getComplianceAging, type OpsComplianceItem } from '@/lib/ops/service'

type RecipientProfile = {
  id: string
  full_name: string | null
  role: string
  is_corporate: boolean | null
  department: string | null
  allowed_departments: string[] | null
}

const DEFAULT_TIMEZONE = process.env.OPS_ALERTS_TIMEZONE || 'America/Mexico_City'

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toUpperCase()
}

function toLocalIsoDate(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function shiftIsoDate(dateString: string, deltaDays: number) {
  const base = new Date(`${dateString}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + deltaDays)
  return base.toISOString().slice(0, 10)
}

function formatDateLabel(dateString: string) {
  const date = new Date(`${dateString}T12:00:00Z`)
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: DEFAULT_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
}

function escapeHtml(value: string | null | undefined) {
  if (!value) return ''
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function isOpenItem(item: OpsComplianceItem) {
  return item.estado !== 'completado' && item.estado !== 'cancelado'
}

function matchesDepartment(profile: RecipientProfile, department: string) {
  const target = normalize(department)
  if (!target) return false
  if (normalize(profile.department) === target) return true
  return (profile.allowed_departments ?? []).some((entry) => normalize(entry) === target)
}

function buildEmailForDepartment(params: {
  department: string
  dueDate: string
  dashboardUrl: string
  items: OpsComplianceItem[]
}) {
  const { department, dueDate, dashboardUrl, items } = params
  const totalImpact = items.reduce((sum, item) => sum + Number(item.impacto_financiero || 0), 0)
  const subject = `⚠️ Planes vencidos en ${department}: ${items.length} pendiente${items.length === 1 ? '' : 's'}`

  const text = [
    `ALERTA DE PLANES VENCIDOS`,
    '',
    `Departamento: ${department}`,
    `Fecha vencida: ${formatDateLabel(dueDate)}`,
    `Pendientes detectados: ${items.length}`,
    `Impacto estimado: ${formatMoney(totalImpact)}`,
    '',
    'DETALLE:',
    ...items.map((item) => `- ${item.plan_nombre} | ${item.centro_costo ?? 'Sin sede'} | ${item.estado} | ${formatMoney(Number(item.impacto_financiero || 0))}`),
    '',
    `Tablero: ${dashboardUrl}`,
  ].join('\n')

  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 14px; border-bottom:1px solid #e2e8f0; font-weight:600; color:#0f172a;">${escapeHtml(item.plan_nombre)}</td>
          <td style="padding:12px 14px; border-bottom:1px solid #e2e8f0; color:#475569;">${escapeHtml(item.centro_costo ?? 'Sin sede')}</td>
          <td style="padding:12px 14px; border-bottom:1px solid #e2e8f0; color:#475569;">${escapeHtml(item.estado)}</td>
          <td style="padding:12px 14px; border-bottom:1px solid #e2e8f0; text-align:right; color:#0f172a; font-weight:700;">${escapeHtml(formatMoney(Number(item.impacto_financiero || 0)))}</td>
        </tr>
      `,
    )
    .join('')

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin:0; padding:24px; background:#f8fafc; font-family:Segoe UI, Arial, sans-serif;">
      <div style="max-width:760px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
        <div style="padding:24px 28px; background:#0f172a; color:#ffffff;">
          <h1 style="margin:0; font-size:22px;">Alerta de planes vencidos</h1>
          <p style="margin:8px 0 0 0; font-size:14px; color:#cbd5e1;">${escapeHtml(department)} · vencimiento ${escapeHtml(formatDateLabel(dueDate))}</p>
        </div>
        <div style="padding:24px 28px;">
          <p style="margin:0 0 16px 0; font-size:14px; color:#334155; line-height:1.6;">
            Se detectaron compromisos que vencieron y siguen abiertos en el aging de planificación.
          </p>
          <div style="display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap;">
            <div style="padding:12px 14px; background:#fff7ed; border:1px solid #fdba74; border-radius:12px;">
              <div style="font-size:11px; color:#9a3412; text-transform:uppercase; font-weight:700;">Pendientes</div>
              <div style="font-size:24px; color:#7c2d12; font-weight:800;">${items.length}</div>
            </div>
            <div style="padding:12px 14px; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:12px;">
              <div style="font-size:11px; color:#065f46; text-transform:uppercase; font-weight:700;">Impacto</div>
              <div style="font-size:20px; color:#065f46; font-weight:800;">${escapeHtml(formatMoney(totalImpact))}</div>
            </div>
          </div>
          <table style="width:100%; border-collapse:collapse; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
            <thead style="background:#f8fafc;">
              <tr>
                <th style="padding:10px 14px; text-align:left; font-size:12px; color:#475569;">Plan</th>
                <th style="padding:10px 14px; text-align:left; font-size:12px; color:#475569;">Sede</th>
                <th style="padding:10px 14px; text-align:left; font-size:12px; color:#475569;">Estado</th>
                <th style="padding:10px 14px; text-align:right; font-size:12px; color:#475569;">Impacto</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div style="margin-top:24px; text-align:center;">
            <a href="${dashboardUrl}" style="display:inline-block; padding:12px 24px; border-radius:10px; background:#0f172a; color:#ffffff; text-decoration:none; font-weight:700;">Abrir planificación</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return { subject, text, html }
}

async function listRecipientsByDepartment(departments: string[]) {
  const admin = createSupabaseAdminClient()
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, full_name, role, is_corporate, department, allowed_departments')
    .or('role.eq.admin,role.eq.supervisor,is_corporate.eq.true')

  if (error) throw error

  const authResponse = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const emailByUserId = new Map(
    (authResponse.data?.users ?? [])
      .filter((user) => user.email)
      .map((user) => [user.id, user.email as string]),
  )

  const result = new Map<string, Array<{ id: string; email: string; name: string }>>()
  for (const department of departments) {
    const recipients = ((profiles ?? []) as RecipientProfile[])
      .filter((profile) => {
        if (profile.role === 'admin' || profile.is_corporate) return true
        return profile.role === 'supervisor' && matchesDepartment(profile, department)
      })
      .map((profile) => {
        const email = emailByUserId.get(profile.id)
        if (!email) return null
        return { id: profile.id, email, name: profile.full_name || email }
      })
      .filter((entry): entry is { id: string; email: string; name: string } => Boolean(entry))

    result.set(department, recipients)
  }

  return result
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const asOfDate = typeof body?.asOfDate === 'string' && body.asOfDate ? body.asOfDate : toLocalIsoDate()
    const overdueDate = shiftIsoDate(asOfDate, -1)

    const admin = createSupabaseAdminClient()
    const complianceItems = await getComplianceAging(admin, { asOfDate })
    const overdueItems = complianceItems.filter((item) => isOpenItem(item) && item.due_date === overdueDate)

    if (overdueItems.length === 0) {
      return NextResponse.json({ ok: true, asOfDate, overdueDate, emailsSent: 0, departments: 0, items: 0 })
    }

    const departments = Array.from(new Set(overdueItems.map((item) => normalize(item.departamento)).filter(Boolean)))
    const recipientsByDepartment = await listRecipientsByDepartment(departments)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const dashboardUrl = `${baseUrl}/planificacion`

    let emailsSent = 0

    await Promise.all(
      departments.map(async (department) => {
        const recipients = recipientsByDepartment.get(department) ?? []
        if (recipients.length === 0) return

        const items = overdueItems.filter((item) => normalize(item.departamento) === department)
        const emailTemplate = buildEmailForDepartment({
          department,
          dueDate: overdueDate,
          dashboardUrl,
          items,
        })

        await Promise.all(
          recipients.map(async (recipient) => {
            await sendMail({
              to: recipient.email,
              subject: emailTemplate.subject,
              html: emailTemplate.html,
              text: emailTemplate.text,
            })
            emailsSent += 1
          }),
        )
      }),
    )

    return NextResponse.json({
      ok: true,
      asOfDate,
      overdueDate,
      emailsSent,
      departments: departments.length,
      items: overdueItems.length,
    })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message ?? error) }, { status: 500 })
  }
}