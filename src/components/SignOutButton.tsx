'use client'

import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        if (error.code === 'refresh_token_already_used' || error.message?.includes('refresh token') || error.message?.includes('Already Used')) {
          alert('⚠️ Tu sesión expiró. Por favor inicia sesión nuevamente.')
          router.push('/login')
          router.refresh()
          return
        }
        alert('Error al cerrar sesión: ' + error.message)
        return
      }
      router.push('/login')
      router.refresh()
    } catch (e: any) {
      alert('Error inesperado al cerrar sesión: ' + (e?.message || e))
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 text-slate-300 hover:text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/10 text-sm font-semibold transition-all shadow-lg"
      title="Cerrar sesión"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      <span className="hidden sm:inline">Salir</span>
    </button>
  )
}
