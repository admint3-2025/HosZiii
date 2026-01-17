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

  // Limpiar cualquier storage viejo de Supabase antes de crear el cliente
  if (typeof window !== 'undefined') {
    try {
      // Limpiar tokens viejos del localStorage
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch {
      // Ignorar errores de storage
    }
  }

  supabaseInstance = createBrowserClient(url, anonKey, {
    cookieOptions: {
      name: 'ziii-session',
    },
    auth: {
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })

  return supabaseInstance
}

// Función segura para obtener usuario sin errores
export async function getSafeUser(supabase: ReturnType<typeof createBrowserClient>) {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      // Si hay error de refresh token, limpiar sesión silenciosamente
      if (
        error.code === 'refresh_token_already_used' ||
        error.message?.includes('Invalid Refresh Token') ||
        error.message?.includes('Already Used')
      ) {
        await supabase.auth.signOut().catch(() => {})
        return null
      }
      return null
    }
    return data.user
  } catch {
    return null
  }
}
