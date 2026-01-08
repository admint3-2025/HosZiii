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
    <form onSubmit={mode === 'login' ? onSubmit : onForgot} className="space-y-4">
      <div className="animate-[fadeInUp_0.6s_ease-out_0.1s_both]">
        <label className="block text-sm font-medium text-gray-700">Correo</label>
        <input
          className="input mt-1 transition-all duration-200 hover:border-blue-400"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          required
        />
      </div>

      {mode === 'login' ? (
        <div className="animate-[fadeInUp_0.6s_ease-out_0.2s_both]">
          <label className="block text-sm font-medium text-gray-700">Contraseña</label>
          <input
            className="input mt-1 transition-all duration-200 hover:border-blue-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 animate-[shake_0.4s_ease-in-out]">
          {error}
        </div>
      ) : null}

      {mode === 'forgot' && sent ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 animate-[fadeIn_0.4s_ease-out]">
          ✅ Solicitud recibida. Un administrador te enviará una contraseña temporal en un máximo de 2 horas.
        </div>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className={`btn btn-primary w-full flex items-center justify-center gap-2 transition-all duration-200 animate-[fadeInUp_0.6s_ease-out_0.3s_both] ${
          busy ? 'scale-[0.98] shadow-lg shadow-blue-200' : 'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-200'
        }`}
      >
        {busy && (
          <svg
            className="h-4 w-4 animate-spin text-white/80"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
            />
          </svg>
        )}
        <span>
          {mode === 'login'
            ? busy
              ? 'Ingresando…'
              : 'Ingresar'
            : busy
              ? 'Enviando…'
              : 'Enviar link de recuperación'}
        </span>
      </button>

      {mode === 'login' ? (
        <button
          type="button"
          className="text-sm text-gray-600 underline underline-offset-4 hover:text-gray-900"
          onClick={() => {
            setError(null)
            setSent(false)
            setMode('forgot')
          }}
          disabled={busy}
        >
          ¿Olvidaste tu contraseña?
        </button>
      ) : (
        <button
          type="button"
          className="text-sm text-gray-600 underline underline-offset-4 hover:text-gray-900"
          onClick={() => {
            setError(null)
            setSent(false)
            setMode('login')
          }}
          disabled={busy}
        >
          Volver a iniciar sesión
        </button>
      )}

      <div className="text-xs text-gray-500">
        {mode === 'login'
          ? 'Si no tienes usuario, solicita alta al administrador.'
          : 'El administrador del sistema será notificado y te asignará una contraseña temporal.'}
      </div>
    </form>
  )
}
