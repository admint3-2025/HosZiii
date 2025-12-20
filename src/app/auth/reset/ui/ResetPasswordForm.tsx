'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

function parseHashTokens(hash: string) {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const params = new URLSearchParams(raw)
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  const type = params.get('type')
  return { access_token, refresh_token, type }
}

export default function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [ready, setReady] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function init() {
      setSessionError(null)

      const typeParam = searchParams.get('type')
      const token_hash = searchParams.get('token_hash')
      const token = searchParams.get('token')

      if (typeParam === 'recovery' && (token_hash || token)) {
        const { error } = await supabase.auth.verifyOtp({
          type: 'recovery',
          ...(token_hash ? { token_hash } : {}),
          ...(token ? { token } : {}),
        } as any)

        if (!cancelled) {
          if (error) setSessionError(error.message)
          setReady(true)
        }
        return
      }

      // PKCE/code flow
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!cancelled) {
          if (error) {
            const msg = error.message || 'Error de autenticación'
            if (msg.toLowerCase().includes('code verifier not found')) {
              setSessionError(
                'Este link de recuperación requiere abrirse en el mismo navegador donde se solicitó. Vuelve a solicitarlo desde el login (“¿Olvidaste tu contraseña?”) y ábrelo en el mismo dispositivo/navegador.',
              )
            } else {
              setSessionError(msg)
            }
          }
          setReady(true)
        }
        return
      }

      // Implicit hash flow
      const { access_token, refresh_token, type } = parseHashTokens(window.location.hash)
      if (type === 'recovery' && access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (!cancelled) {
          if (error) setSessionError(error.message)
          setReady(true)
        }
        return
      }

      if (!cancelled) {
        setSessionError('Link inválido o expirado. Solicita un nuevo correo de recuperación.')
        setReady(true)
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [searchParams, supabase])

  async function submit() {
    setSessionError(null)

    if (password.length < 8) {
      setSessionError('La contraseña debe tener mínimo 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setSessionError('Las contraseñas no coinciden.')
      return
    }

    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)

    if (error) {
      setSessionError(error.message)
      return
    }

    setDone(true)
    // Optional: force refresh to clear URL hash and update session state
    router.replace('/login')
    router.refresh()
  }

  if (!ready) {
    return <div className="text-sm text-gray-600">Validando link…</div>
  }

  if (done) {
    return <div className="text-sm text-green-700">Contraseña actualizada. Redirigiendo…</div>
  }

  return (
    <div className="space-y-3">
      {sessionError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {sessionError}
        </div>
      ) : null}

      <div>
        <label className="block text-sm font-medium text-gray-700">Nueva contraseña</label>
        <input
          className="input mt-1"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="mt-1 text-xs text-gray-500">Mínimo 8 caracteres.</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Confirmar contraseña</label>
        <input
          className="input mt-1"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      <button type="button" className="btn btn-primary w-full" onClick={submit} disabled={busy}>
        {busy ? 'Actualizando…' : 'Actualizar contraseña'}
      </button>

      <div className="text-xs text-gray-500">
        Si el link expira, solicita otro al administrador.
      </div>
    </div>
  )
}
