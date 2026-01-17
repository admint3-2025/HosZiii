import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'

export async function createSupabaseServerClient() {
  const url = process.env.SUPABASE_URL_INTERNAL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const cookieStore = await cookies()
  return createServerClient(url, anonKey, {
    cookieOptions: {
      name: 'ziii-session',
    },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components can't set cookies; middleware refreshes sessions.
        }
      },
    },
  })
}

/**
 * Wrapper seguro para getUser() que captura errores de refresh token
 * y devuelve null en lugar de lanzar excepción.
 * Usar en Server Components/Actions para evitar que refresh_token_already_used
 * rompa toda la aplicación.
 */
export async function getSafeServerUser(): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.getUser()
    
    if (error) {
      // Si es error de refresh token, simplemente retornar null
      const isRefreshTokenError =
        error.code === 'refresh_token_already_used' ||
        error.message?.includes('Invalid Refresh Token') ||
        error.message?.includes('Already Used')
      
      if (isRefreshTokenError) {
        return null
      }
      // Otros errores también devuelven null para no romper la UI
      return null
    }
    
    return data.user
  } catch {
    return null
  }
}
