'use client'

/**
 * WebViewBridge — Solo se activa cuando la web corre dentro de la app móvil.
 *
 * Flujo:
 *  1. Detecta presencia de window.ReactNativeWebView
 *  2. Escucha evento 'expoPushTokenReady' inyectado por la app nativa
 *  3. Cuando hay sesión activa en Supabase, registra el push token
 *  4. Re-intenta el registro al cambio de estado de autenticación (sign-in)
 */

import { useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export function WebViewBridge() {
  useEffect(() => {
    // Solo ejecutar dentro del WebView nativo
    if (typeof window === 'undefined') return
    if (!(window as any).ReactNativeWebView) return

    const supabase = createSupabaseBrowserClient()

    async function registerToken(token: string) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.rpc('register_push_token', {
        p_token: token,
        p_device: `Android (WebView)`,
      })

      if (error) {
        console.error('[Bridge] Error registrando push token:', error.message)
      } else {
        console.log('[Bridge] Push token registrado:', token)
      }
    }

    // Si el token ya fue inyectado antes de que montara este componente
    const existingToken = (window as any).__expoPushToken
    if (existingToken) {
      registerToken(existingToken)
    }

    // Escuchar token futuro (inyectado por App.tsx cuando resuelve el permiso)
    const handleToken = (e: Event) => {
      const token = (e as CustomEvent<{ token: string }>).detail?.token
        ?? (window as any).__expoPushToken
      if (token) registerToken(token)
    }

    window.addEventListener('expoPushTokenReady', handleToken)

    // Re-registrar si el usuario inicia sesión DESPUÉS de que llegó el token
    // (cubre el caso: app carga → usuario teclea contraseña → sesión se crea)
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        const token = (window as any).__expoPushToken
        if (token) registerToken(token)
      }
    })

    // Pedir el token a la app nativa (por si ya cargó antes que nosotros)
    try {
      ;(window as any).ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'requestPushToken' })
      )
    } catch (_e) { /* ignorar */ }

    return () => {
      window.removeEventListener('expoPushTokenReady', handleToken)
      authListener.subscription.unsubscribe()
    }
  }, [])

  return null
}
