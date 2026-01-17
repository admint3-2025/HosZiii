import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function HomePage() {
  // Evita llamar a Supabase aquí (puede disparar refresh token inválido).
  // El middleware decide acceso real; aquí solo hacemos un enrutamiento simple.
  const cookieStore = await cookies()
  const hasAuthCookie = cookieStore.getAll().some((c) => c.name.startsWith('ziii-session'))
  redirect(hasAuthCookie ? '/mantenimiento' : '/login')
}
