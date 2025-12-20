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
      setError(error.message)
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
      <div>
        <label className="block text-sm font-medium text-gray-700">Correo</label>
        <input
          className="input mt-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          required
        />
      </div>

      {mode === 'login' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700">Contraseña</label>
          <input
            className="input mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {mode === 'forgot' && sent ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Si el correo existe, enviamos un link de recuperación. Revisa tu bandeja y spam.
        </div>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="btn btn-primary w-full"
      >
        {mode === 'login'
          ? busy
            ? 'Ingresando…'
            : 'Ingresar'
          : busy
            ? 'Enviando…'
            : 'Enviar link de recuperación'}
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
          : 'Te enviaremos un correo para restablecer tu contraseña.'}
      </div>
    </form>
  )
}
