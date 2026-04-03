'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function LoginForm({ isMobile = false }: { isMobile?: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [sent, setSent] = useState(false)
  const [recoveryTried, setRecoveryTried] = useState(false)

  // Session recovery flow: if middleware sent us here due to an "expired" cookie,
  // attempt a refresh in the browser WITHOUT clearing cookies.
  useEffect(() => {
    const shouldRecover = searchParams.get('recover') === '1'
    if (!shouldRecover || recoveryTried) return

    let cancelled = false
    setRecoveryTried(true)

    ;(async () => {
      setBusy(true)
      setError(null)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData?.session) return

        const { data, error } = await supabase.auth.refreshSession()
        if (error) throw error

        if (data?.session && !cancelled) {
          const isApp = typeof navigator !== 'undefined' && navigator.userAgent.includes('ZIIIHoSApp')
          if (isApp) {
            // Android WebView: wait 500ms for cookie store to sync before navigating
            setTimeout(() => { window.location.href = '/hub' }, 500)
          } else {
            router.replace('/hub')
            router.refresh()
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            '⚠️ No se pudo recuperar la sesión automáticamente. Intenta iniciar sesión de nuevo o abre /login?clear=1 para limpiar cookies.'
          )
        }
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, recoveryTried, supabase, router])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      // Record failed login attempt (best-effort)
      try {
        await fetch('/api/auth/record-login-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            success: false,
            error: error.code || error.message,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          }),
        })
      } catch {
        // ignore
      }

      // Manejo de token corrupto: pedir reintento con cookies limpias.
      if (
        error.code === 'refresh_token_already_used' ||
        error.message?.includes('Invalid Refresh Token') ||
        error.message?.includes('Already Used')
      ) {
        setError('⚠️ Sesión previa inválida. Abre una ventana incógnito o borra cookies del sitio y vuelve a intentar.')
        return
      }

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

    // Record successful login (best-effort)
    try {
      await fetch('/api/auth/record-login-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          success: true,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        }),
      })
    } catch {
      // ignore
    }

    // Go straight into the app to avoid extra redirects.
    const isApp = typeof navigator !== 'undefined' && navigator.userAgent.includes('ZIIIHoSApp')
    if (isApp) {
      // Android WebView: wait 500ms for cookie store to sync before navigating
      setTimeout(() => { window.location.href = '/hub' }, 500)
    } else {
      router.replace('/hub')
      router.refresh()
    }
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

  const showInactivityBanner = searchParams.get('reason') === 'inactivity'

  const labelCls = isMobile
    ? 'block text-sm font-medium text-slate-300 mb-2'
    : 'block text-sm font-medium text-slate-700 mb-2'
  const inputCls = isMobile
    ? 'w-full px-4 py-3.5 rounded-xl border border-slate-700/60 bg-slate-800/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60 transition-all duration-200 backdrop-blur-sm'
    : 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all duration-200'

  return (
    <form onSubmit={mode === 'login' ? onSubmit : onForgot} className="space-y-5">
      {showInactivityBanner && (
        <div className={isMobile
          ? 'rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 flex items-start gap-2'
          : 'rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-start gap-2'
        }>
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Tu sesión se cerró por inactividad. Por favor inicia sesión nuevamente.</span>
        </div>
      )}
      <div>
        <label className={labelCls}>Correo</label>
        <input
          className={inputCls}
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
          <label className={labelCls}>Contraseña</label>
          <input
            className={inputCls}
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
        <div className={isMobile
          ? 'rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-start gap-2'
          : 'rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2'
        }>
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      ) : null}

      {mode === 'forgot' && sent ? (
        <div className={isMobile
          ? 'rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-start gap-2'
          : 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-start gap-2'
        }>
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
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
            ? (isMobile ? 'bg-cyan-700 cursor-not-allowed' : 'bg-blue-400 cursor-not-allowed')
            : (isMobile ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-900/30' : 'bg-blue-600 hover:bg-blue-500')
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
            ? busy ? 'Ingresando…' : 'Ingresar'
            : busy ? 'Enviando…' : 'Solicitar Recuperación'}
        </span>
      </button>

      <div className="pt-2 text-center">
        {mode === 'login' ? (
          <button
            type="button"
            className={isMobile
              ? 'text-sm text-slate-400 hover:text-cyan-400 transition-colors'
              : 'text-sm text-slate-600 hover:text-blue-600 transition-colors'
            }
            onClick={() => { setError(null); setSent(false); setMode('forgot') }}
            disabled={busy}
          >
            ¿Olvidaste tu contraseña?
          </button>
        ) : (
          <button
            type="button"
            className={isMobile
              ? 'text-sm text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1 mx-auto'
              : 'text-sm text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1 mx-auto'
            }
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

      <div className={isMobile
        ? 'text-xs text-slate-500 text-center pt-2'
        : 'text-xs text-slate-400 text-center pt-2'
      }>
        {mode === 'login'
          ? '¿No tienes cuenta? Solicita acceso al administrador del sistema.'
          : 'El administrador será notificado y te asignará credenciales.'}
      </div>
    </form>
  )
}
