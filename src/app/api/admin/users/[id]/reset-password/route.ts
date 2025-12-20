import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendMail, getSmtpConfig } from '@/lib/email/mailer'
import { passwordRecoveryEmailTemplate } from '@/lib/email/templates'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 })

  const admin = createSupabaseAdminClient()

  const { data, error } = await admin.auth.admin.getUserById(id)
  if (error) return new Response(error.message, { status: 400 })

  const email = data.user?.email
  if (!email) return new Response('User has no email', { status: 400 })

  const origin = new URL(request.url).origin
  const redirectTo = `${origin}/auth/reset`

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })
  if (linkErr) return new Response(linkErr.message, { status: 400 })

  const actionLink = linkData?.properties?.action_link
  if (!actionLink) return new Response('No action link generated', { status: 500 })

  const smtpConfigured = Boolean(getSmtpConfig())
  let sent = false
  if (smtpConfigured) {
    try {
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
      sent = true
    } catch {
      sent = false
    }
  }

  await admin.from('audit_log').insert({
    entity_type: 'user',
    entity_id: id,
    action: 'RESET_PASSWORD',
    actor_id: user.id,
    metadata: {
      email,
      redirectTo,
      delivery: sent ? 'smtp' : 'manual',
    },
  })

  return Response.json({ sent, actionLink: sent ? null : actionLink })
}
