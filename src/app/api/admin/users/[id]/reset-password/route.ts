import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendMail, getSmtpConfig } from '@/lib/email/mailer'
import { temporaryPasswordEmailTemplate } from '@/lib/email/templates'

function generateSecurePassword(length = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%&*'
  const all = lowercase + uppercase + numbers + symbols

  let password = ''
  // Asegurar al menos uno de cada tipo
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  // Completar con caracteres aleatorios
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }

  // Mezclar caracteres
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

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

  const { data: targetProfile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', id)
    .single()

  const fullName = targetProfile?.full_name || email

  // Generar contraseña temporal segura
  const tempPassword = generateSecurePassword(12)

  // Actualizar contraseña del usuario
  const { error: updateError } = await admin.auth.admin.updateUserById(id, {
    password: tempPassword,
  })

  if (updateError) return new Response(updateError.message, { status: 400 })

  const smtpConfigured = Boolean(getSmtpConfig())
  let sent = false

  if (smtpConfigured) {
    try {
      const tpl = temporaryPasswordEmailTemplate({
        appName: 'ZIII HoS',
        userName: fullName,
        userEmail: email,
        temporaryPassword: tempPassword,
        loginUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      })

      await sendMail({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      })
      sent = true
    } catch (e) {
      console.error('Error sending temp password email:', e)
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
      method: 'temporary_password',
      delivery: sent ? 'smtp' : 'manual',
    },
  })

  return Response.json({ 
    sent, 
    temporaryPassword: sent ? null : tempPassword,
    message: sent 
      ? 'Contraseña temporal enviada por correo' 
      : 'Contraseña temporal generada (copiar manualmente)'
  })
}
