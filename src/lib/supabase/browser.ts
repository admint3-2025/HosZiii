import { createBrowserClient } from '@supabase/ssr'

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function createSupabaseBrowserClient() {
  // Singleton para evitar múltiples instancias
  if (supabaseInstance) return supabaseInstance

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  supabaseInstance = createBrowserClient(url, anonKey, {
    cookieOptions: {
      name: 'ziii-session',
    },
    auth: {
      // CRITICAL: also disable auto-refresh in the browser to prevent token rotation races.
      // The session is validated server-side via cookie parsing, so the browser doesn't
      // need to auto-refresh. Manual refresh can be triggered when needed (e.g., /login?recover=1).
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })

  return supabaseInstance
}

// Función segura para obtener usuario sin errores
export async function getSafeUser(supabase: ReturnType<typeof createBrowserClient>) {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      // Si hay error de refresh token, NO cerrar sesión automáticamente.
      // Con rotación de refresh tokens y/o relojes desincronizados, forzar signOut()
      // puede borrar cookies válidas y mandar al usuario a /login innecesariamente.
      if (
        error.code === 'refresh_token_already_used' ||
        error.message?.includes('Invalid Refresh Token') ||
        error.message?.includes('Already Used')
      ) {
        return null
      }
      return null
    }
    return data.user
  } catch {
    return null
  }
}
