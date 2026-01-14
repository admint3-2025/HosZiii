import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSmtpConfig, sendMail } from '@/lib/email/mailer'
import { passwordResetRequestEmailTemplate } from '@/lib/email/templates'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const email = typeof (body as any)?.email === 'string' ? (body as any).email.trim() : ''
  if (!email) return new Response('Email is required', { status: 400 })

  const admin = createSupabaseAdminClient()

  // Verificar si el usuario existe
  const { data: userData, error: userError } = await admin.auth.admin.listUsers()
  
  if (userError) {
    return Response.json({ ok: true }) // No revelar si el usuario existe
  }

  const userExists = userData.users.some((u) => u.email?.toLowerCase() === email.toLowerCase())
  
  if (!userExists) {
    return Response.json({ ok: true }) // No revelar que el usuario no existe
  }

  // Obtener información del usuario
  const requestingUser = userData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', requestingUser?.id)
    .single()

  const fullName = profile?.full_name || email

  // Obtener todos los administradores
  const { data: admins } = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'admin')

  if (admins && admins.length > 0) {
    // Crear notificaciones push para administradores
    const notifications = admins.map((adminProfile) => ({
      user_id: adminProfile.id,
      type: 'PASSWORD_RESET_REQUEST' as const,
      title: 'Solicitud de restablecimiento de contraseña',
      message: `${fullName} (${email}) ha solicitado restablecer su contraseña`,
      metadata: {
        requesting_user_email: email,
        requesting_user_name: fullName,
        requesting_user_id: requestingUser?.id,
      },
    }))

    await admin.from('notifications').insert(notifications)

    // Enviar correos a administradores si SMTP está configurado
    const smtpConfigured = Boolean(getSmtpConfig())
    if (smtpConfigured) {
      const { data: adminProfiles } = await admin.auth.admin.listUsers()
      const adminEmails = adminProfiles.users
        .filter((u) => admins.some((a) => a.id === u.id) && u.email)
        .map((u) => u.email!)

      const tpl = passwordResetRequestEmailTemplate({
        appName: 'ZIII HoS',
        requestingUserName: fullName,
        requestingUserEmail: email,
        adminPanelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/users`,
      })

      for (const adminEmail of adminEmails) {
        try {
          await sendMail({
            to: adminEmail,
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
          })
        } catch (e) {
          console.error(`Error sending notification to admin ${adminEmail}:`, e)
        }
      }
    }
  }

  // Auditoría
  await admin.from('audit_log').insert({
    entity_type: 'user',
    entity_id: requestingUser?.id || null,
    action: 'PASSWORD_RESET_REQUESTED',
    actor_id: requestingUser?.id || null,
    metadata: {
      email,
      full_name: fullName,
      admins_notified: admins?.length || 0,
    },
  })

  return Response.json({ ok: true })
}
