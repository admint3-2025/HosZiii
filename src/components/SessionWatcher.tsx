'use client'

/**
 * SessionWatcher — Detecta cuando la sesión se cierra de forma involuntaria
 * (refresh token caducado, sesión revocada, cierre desde otra pestaña) y
 * muestra un overlay con el mensaje "Sesión cerrada por inactividad".
 *
 * Con autoRefreshToken:true en browser.ts, el JWT se renueva automáticamente
 * antes de expirar (cada ~50 min), por lo que SIGNED_OUT solo se dispara cuando
 * el refresh token genuinamente expiró o fue revocado.
 *
 * El cierre manual (SignOutButton) establece el flag __manualSignOut en
 * sessionStorage para que el watcher no muestre el modal.
 */

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

const COUNTDOWN_SECONDS = 6

export default function SessionWatcher() {
  const pathname = usePathname()
  const [showModal, setShowModal] = useState(false)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const supabase = useRef(createSupabaseBrowserClient())

  useEffect(() => {
    // No instalar en rutas públicas
    if (pathname === '/login' || pathname.startsWith('/auth')) return

    const { data: { subscription } } = supabase.current.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_OUT') {
          try {
            if (sessionStorage.getItem('__manualSignOut') === '1') {
              sessionStorage.removeItem('__manualSignOut')
              return
            }
          } catch { /* sessionStorage no disponible */ }
          // Cierre involuntario: mostrar modal
          setCountdown(COUNTDOWN_SECONDS)
          setShowModal(true)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [pathname])

  // Cuenta regresiva y redirección automática
  useEffect(() => {
    if (!showModal) return

    if (countdown <= 0) {
      window.location.href = '/login?reason=inactivity'
      return
    }

    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [showModal, countdown])

  if (!showModal) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
        {/* Cabecera */}
        <div className="bg-amber-50 px-6 py-6 flex flex-col items-center gap-3 text-center border-b border-amber-100">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
            <svg
              className="w-7 h-7 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div>
            <h2
              id="session-expired-title"
              className="text-lg font-bold text-slate-800"
            >
              Sesión cerrada por inactividad
            </h2>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              Tu sesión expiró. Serás redirigido al inicio de sesión en{' '}
              <span className="font-bold text-amber-600">{countdown}</span>{' '}
              {countdown === 1 ? 'segundo' : 'segundos'}.
            </p>
          </div>

          {/* Barra de progreso */}
          <div className="w-full bg-amber-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / COUNTDOWN_SECONDS) * 100}%` }}
            />
          </div>
        </div>

        {/* Botón */}
        <div className="px-6 py-4">
          <button
            onClick={() => { window.location.href = '/login?reason=inactivity' }}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm"
          >
            Iniciar sesión ahora
          </button>
        </div>
      </div>
    </div>
  )
}
