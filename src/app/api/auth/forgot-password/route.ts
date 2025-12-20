import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSmtpConfig, sendMail } from '@/lib/email/mailer'
import { passwordRecoveryEmailTemplate } from '@/lib/email/templates'

export async function POST(request: Request) {
  const smtpConfigured = Boolean(getSmtpConfig())
  if (!smtpConfigured) {
    return new Response('SMTP is not configured', { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const email = typeof (body as any)?.email === 'string' ? (body as any).email.trim() : ''
  if (!email) return new Response('Email is required', { status: 400 })

  const origin = new URL(request.url).origin
  const redirectTo = `${origin}/auth/reset`

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  // Avoid user enumeration: if the user does not exist, still respond OK.
  if (error) {
    const msg = (error as any)?.message ? String((error as any).message) : String(error)
    if (msg.toLowerCase().includes('user') && msg.toLowerCase().includes('not')) {
      return Response.json({ ok: true })
    }
    return new Response(msg, { status: 400 })
  }

  const actionLink = data?.properties?.action_link
  if (!actionLink) return new Response('No action link generated', { status: 500 })

  const tpl = passwordRecoveryEmailTemplate({
    appName: 'ZIII Helpdesk',
    actionUrl: actionLink,
  })

  await sendMail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  })

  return Response.json({ ok: true })
}
