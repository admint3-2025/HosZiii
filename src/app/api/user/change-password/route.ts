import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  
  const user = await getSafeServerUser()

  if (!user) return new Response('Unauthorized', { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { currentPassword, newPassword } = body

  if (!currentPassword || typeof currentPassword !== 'string') {
    return new Response('Contraseña actual requerida', { status: 400 })
  }

  if (!newPassword || typeof newPassword !== 'string') {
    return new Response('Nueva contraseña requerida', { status: 400 })
  }

  if (newPassword.length < 8) {
    return new Response('La nueva contraseña debe tener al menos 8 caracteres', { status: 400 })
  }

  if (currentPassword === newPassword) {
    return new Response('La nueva contraseña debe ser diferente a la actual', { status: 400 })
  }

  // Verificar contraseña actual intentando hacer signIn
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })

  if (signInError) {
    return new Response('Contraseña actual incorrecta', { status: 400 })
  }

  // Actualizar contraseña
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    return new Response(updateError.message, { status: 400 })
  }

  // Auditoría
  await supabase.from('audit_log').insert({
    entity_type: 'user',
    entity_id: user.id,
    action: 'CHANGE_PASSWORD',
    actor_id: user.id,
    metadata: {
      email: user.email,
      self_service: true,
    },
  })

  return Response.json({ success: true })
}
