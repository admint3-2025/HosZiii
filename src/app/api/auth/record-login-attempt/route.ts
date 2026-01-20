import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSmtpConfig, sendMail } from '@/lib/email/mailer'

function getRequestIp(req: NextRequest): string | null {
  const headers = req.headers
  const maybeXff = headers.get('x-forwarded-for')
  const ip =
    (maybeXff && maybeXff.split(',')[0].trim())
    || headers.get('cf-connecting-ip')
    || headers.get('x-real-ip')
    || headers.get('x-client-ip')
    || null
  return ip
}

function sanitizeText(input: unknown, maxLen: number): string | null {
  if (typeof input !== 'string') return null
  const s = input.trim()
  if (!s) return null
  // Keep it compact and avoid control characters.
  const cleaned = s.replace(/[\u0000-\u001F\u007F]/g, '').slice(0, maxLen)
  return cleaned || null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    const email = sanitizeText(body?.email, 320)
    const success = body?.success === true
    const error = sanitizeText(body?.error, 500)
    const userAgent = sanitizeText(body?.userAgent, 500) || sanitizeText(req.headers.get('user-agent'), 500)
    const ip = getRequestIp(req)

    // If it's a success attempt, prefer to attach the authenticated user_id.
    // If not authenticated (or failure), user_id will be null.
    const serverClient = await createSupabaseServerClient()
    const { data: authData } = await serverClient.auth.getUser()
    const userId = authData?.user?.id || null

    const admin = createSupabaseAdminClient()

    // Basic anti-spam: skip duplicates for same (ip,email,success) within last 30 seconds.
    // This keeps the table useful even if someone brute-forces.
    const now = new Date()
    const windowStart = new Date(now.getTime() - 30_000).toISOString()

    // Email alert throttling: at most one alert per (email, ip) every 10 minutes.
    const alertRecipient = 'ziiihelpdesk@gmail.com'
    const alertWindowStart = new Date(now.getTime() - 10 * 60_000).toISOString()
    let shouldSendAlert = !success && !!email

    if (ip && email) {
      const { data: recent } = await admin
        .from('login_audits')
        .select('id')
        .eq('ip', ip)
        .eq('email', email)
        .eq('success', success)
        .gte('created_at', windowStart)
        .limit(1)

      if ((recent || []).length > 0) {
        return NextResponse.json({ ok: true, skipped: true })
      }

      if (shouldSendAlert) {
        const { data: recentAlerts } = await admin
          .from('login_audits')
          .select('id')
          .eq('ip', ip)
          .eq('email', email)
          .eq('success', false)
          .gte('created_at', alertWindowStart)
          .limit(1)

        if ((recentAlerts || []).length > 0) {
          shouldSendAlert = false
        }
      }
    }

    // Insert audit row. Be backward-compatible if DB hasn't been migrated yet.
    const insertV2 = {
      user_id: userId,
      ip,
      user_agent: userAgent,
      event: 'LOGIN',
      success,
      email,
      error: success ? null : error,
    }
    const insertV1 = {
      user_id: userId,
      ip,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
    }

    const { error: insertErr } = await admin.from('login_audits').insert(insertV2 as any)
    if (insertErr) {
      // Fallback to older schema (only base columns)
      await admin.from('login_audits').insert(insertV1 as any)
    }

    // Email alert (only to ziiihelpdesk@gmail.com)
    if (shouldSendAlert && getSmtpConfig()) {
      const when = new Date().toISOString()
      const subj = `⚠️ Alerta: intento de inicio de sesión fallido (${email})`
      const safeIp = ip || '—'
      const safeUa = userAgent || '—'
      const safeErr = error || '—'

      const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.4">
          <h2 style="margin:0 0 8px">Intento de inicio de sesión fallido</h2>
          <p style="margin:0 0 12px">Se detectó un intento fallido de inicio de sesión.</p>
          <table style="border-collapse:collapse">
            <tr><td style="padding:4px 10px 4px 0"><b>Correo</b></td><td style="padding:4px 0">${email}</td></tr>
            <tr><td style="padding:4px 10px 4px 0"><b>IP</b></td><td style="padding:4px 0">${safeIp}</td></tr>
            <tr><td style="padding:4px 10px 4px 0"><b>Error</b></td><td style="padding:4px 0">${safeErr}</td></tr>
            <tr><td style="padding:4px 10px 4px 0"><b>User-Agent</b></td><td style="padding:4px 0">${safeUa}</td></tr>
            <tr><td style="padding:4px 10px 4px 0"><b>Fecha</b></td><td style="padding:4px 0">${when}</td></tr>
          </table>
          <p style="margin:12px 0 0;color:#64748b;font-size:12px">Este correo se envía solo a ${alertRecipient}. (Antispam: 1 alerta/10min por IP+correo)</p>
        </div>
      `.trim()

      const text = `Intento de inicio de sesión fallido\nCorreo: ${email}\nIP: ${safeIp}\nError: ${safeErr}\nUser-Agent: ${safeUa}\nFecha: ${when}`

      try {
        await sendMail({ to: alertRecipient, subject: subj, html, text })
      } catch {
        // Ignore email errors (logging still recorded)
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
