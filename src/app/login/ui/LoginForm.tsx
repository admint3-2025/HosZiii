'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function LoginForm() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      // Mejorar mensaje para usuarios desactivados
      if (error.message === 'User is banned' || error.message.includes('banned')) {
        setError('⚠️ Tu cuenta ha sido desactivada. Contacta al administrador para más información.')
      } else if (error.message.includes('Invalid login credentials')) {
        setError('❌ Correo o contraseña incorrectos. Verifica tus credenciales.')
      } else {
        setError(error.message)
      }
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSent(false)

    const trimmed = email.trim()
    if (!trimmed) {
      setError('Captura tu correo.')
      return
    }

    setBusy(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const text = await res.text()
      if (!res.ok) {
        setError(text || `Error ${res.status}`)
        return
      }
    } catch (e: any) {
      setError(e?.message ?? 'Error inesperado')
      return
    } finally {
      setBusy(false)
    }

    setSent(true)
  }

  return (
    <form onSubmit={mode === 'login' ? onSubmit : onForgot} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Correo electrónico</label>
        <input
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="tu@correo.com"
          autoComplete="email"
          required
        />
      </div>

      {mode === 'login' ? (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Contraseña</label>
          <input
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      ) : null}

      {mode === 'forgot' && sent ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-start gap-2">
          <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Solicitud recibida. Un administrador te enviará una contraseña temporal.</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 ${
          busy 
            ? 'bg-indigo-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5'
        }`}
      >
        {busy && (
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
          </svg>
        )}
        <span>
          {mode === 'login'
            ? busy ? 'Ingresando…' : 'Ingresar al Sistema'
            : busy ? 'Enviando…' : 'Solicitar Recuperación'}
        </span>
      </button>

      <div className="pt-2 text-center">
        {mode === 'login' ? (
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
            onClick={() => { setError(null); setSent(false); setMode('forgot') }}
            disabled={busy}
          >
            ¿Olvidaste tu contraseña?
          </button>
        ) : (
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1 mx-auto"
            onClick={() => { setError(null); setSent(false); setMode('login') }}
            disabled={busy}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a iniciar sesión
          </button>
        )}
      </div>

      <div className="text-xs text-slate-400 text-center pt-2">
        {mode === 'login'
          ? '¿No tienes cuenta? Solicita acceso al administrador del sistema.'
          : 'El administrador será notificado y te asignará credenciales.'}
      </div>
    </form>
  )
}
