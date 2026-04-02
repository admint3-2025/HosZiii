import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseSessionFromCookies, isSessionExpired } from '@/lib/supabase/session-cookie'

export async function middleware(request: NextRequest) {
  const url = process.env.SUPABASE_URL_INTERNAL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  // Quick cookie checks (supports chunking: ziii-session.0, etc.)
  const hasSessionCookie = request.cookies.getAll().some((c) => c.name.startsWith('ziii-session'))
  const debugAuth = process.env.NODE_ENV !== 'production'

  const clearAuthCookies = (res: NextResponse) => {
    const cookies = request.cookies.getAll()
    for (const c of cookies) {
      // Limpiar cookies viejas Y nuevas - INCLUIR access/refresh tokens
      if (c.name.startsWith('sb-') || c.name.startsWith('ziii-session')) {
        res.cookies.delete(c.name)
      }
    }
  }

  // En /login NO limpiamos cookies por defecto.
  if (pathname === '/login') {
    if (debugAuth) {
      const names = request.cookies
        .getAll()
        .map((c) => c.name)
        .filter((n) => n.startsWith('ziii-session'))
      console.info('[auth][mw] /login', { hasSessionCookie, cookieNames: names })
    }

    // If already authenticated, don't show login again.
    // Validate by parsing the session cookie (not just existence).
    const cookieList = request.cookies.getAll().map((c) => ({ name: c.name, value: c.value }))
    const session = hasSessionCookie ? getSupabaseSessionFromCookies(cookieList, 'ziii-session') : null
    const sessionIsValid = !!session && !isSessionExpired(session)

    if (sessionIsValid) {
      const hubUrl = request.nextUrl.clone()
      hubUrl.pathname = '/hub'
      return NextResponse.redirect(hubUrl)
    }

    // Only clear cookies when explicitly requested to recover from a bad session.
    const shouldClear = request.nextUrl.searchParams.get('clear') === '1'
    const res = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
    if (shouldClear) {
      clearAuthCookies(res)
    }
    return res
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(url, anonKey, {
    auth: {
      // CRITICAL: disable auto-refresh in middleware to prevent token rotation races
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    cookieOptions: {
      name: 'ziii-session',
    },
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // Para rutas protegidas, validar la sesión en middleware para permitir
  // refresh y persistir cookies aquí (Server Components no siempre pueden).
  // IMPORTANT: do not call Supabase auth methods here.
  // Parse the session from cookies to avoid refresh-token rotation races.
  const cookieList = request.cookies.getAll().map((c) => ({ name: c.name, value: c.value }))
  const session = hasSessionCookie ? getSupabaseSessionFromCookies(cookieList, 'ziii-session') : null
  const sessionHasUserId = !!session?.user?.id
  const sessionExpired = !!session && isSessionExpired(session)
  // Treat a parsed session with a user id as "authenticated enough" to attempt recovery.
  // If the server clock is skewed or the token is near-expiry, we should NOT wipe cookies here.
  // The browser can refresh the session on /login?recover=1.
  const sessionIsValid = !!session && sessionHasUserId && !sessionExpired
  const userId = session?.user?.id as string | undefined

  if (debugAuth && (pathname === '/' || pathname.startsWith('/hub') || pathname === '/login')) {
    console.info('[auth][mw] check', {
      pathname,
      hasSessionCookie,
      sessionParsed: !!session,
      sessionIsValid,
      sessionExpired,
      hasUserId: !!userId,
    })
  }

  // Mantener '/' como URL principal: redirigir al hub
  if (pathname === '/') {
    if (!hasSessionCookie) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }

    if (!!session && sessionHasUserId && sessionExpired) {
      return NextResponse.redirect(new URL('/login?recover=1&reason=inactivity', request.url))
    }

    if (!sessionIsValid) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const hubUrl = request.nextUrl.clone()
    hubUrl.pathname = '/hub'
    return NextResponse.redirect(hubUrl)
  }

  const isAppRoute =
    pathname.startsWith('/hub') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/tickets') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/audit') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/mantenimiento') ||
    pathname.startsWith('/beo') ||
    pathname.startsWith('/corporativo') ||
    pathname.startsWith('/planificacion')
  if (isAppRoute) {
    // Verificar solo la cookie de sesión
    if (!hasSessionCookie) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }

    if (!!session && sessionHasUserId && sessionExpired) {
      return NextResponse.redirect(new URL('/login?recover=1&reason=inactivity', request.url))
    }

    if (!sessionIsValid) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Admin routes: diferentes niveles de acceso
    if (pathname.startsWith('/admin')) {
      if (!userId) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        return NextResponse.redirect(loginUrl)
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_corporate')
        .eq('id', userId)
        .single()

      const isAdminLike = profile?.role === 'admin'

      // /admin para admin (acceso total) y corporativo (redirigir si intenta entrar)
      if (profile?.is_corporate) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/reports'
        return NextResponse.redirect(redirectUrl)
      }
      if (!isAdminLike) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return NextResponse.redirect(redirectUrl)
      }
    }

    // Auditoría para admin y supervisor
    if (pathname.startsWith('/audit')) {
      if (!userId) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        return NextResponse.redirect(loginUrl)
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      const isAdminLike = profile?.role === 'admin'
      if (!isAdminLike && profile?.role !== 'supervisor') {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return NextResponse.redirect(redirectUrl)
      }
    }

    // MANTENIMIENTO: proteger rutas de gestión
    // - Tickets: usuarios con acceso al módulo (user o supervisor)
    // - Dashboard/Gestión: solo supervisores de mantenimiento (hub_visible_modules)
    if (pathname.startsWith('/mantenimiento')) {
      if (!userId) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        return NextResponse.redirect(loginUrl)
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, hub_visible_modules')
        .eq('id', userId)
        .single()

      const hubModules = profile?.hub_visible_modules as Record<string, string | boolean> | null
      const mntAccess = profile?.role === 'admin' ? 'supervisor' :
        hubModules?.['mantenimiento'] === 'supervisor' ? 'supervisor' :
        (hubModules?.['mantenimiento'] === 'user' || hubModules?.['mantenimiento'] === true) ? 'user' : false

      // Rutas que cualquier usuario con acceso al módulo puede acceder:
      const isTicketCreationRoute = pathname === '/mantenimiento/tickets/new'
      const isTicketListRoute = pathname === '/mantenimiento/tickets'
      const isTicketDetailRoute = pathname.match(/^\/mantenimiento\/tickets\/[^\/]+$/)
      
      const isUserAccessibleRoute = isTicketCreationRoute || isTicketListRoute || isTicketDetailRoute
      
      if (isUserAccessibleRoute) {
        // Permitir a cualquier usuario autenticado con acceso al módulo
      } else {
        // Rutas de GESTIÓN (dashboard, activos, reportes) — solo supervisores
        if (mntAccess !== 'supervisor') {
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/mantenimiento/tickets?view=mine'
          return NextResponse.redirect(redirectUrl)
        }
      }
    }

    // HELP DESK IT (activos / beo): restringir a supervisores IT
    // Usa hub_visible_modules como fuente de verdad
    if (pathname.startsWith('/assets') || pathname.startsWith('/beo')) {
      if (!userId) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        return NextResponse.redirect(loginUrl)
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, hub_visible_modules')
        .eq('id', userId)
        .single()

      const hubModules = profile?.hub_visible_modules as Record<string, string | boolean> | null
      const itAccess = profile?.role === 'admin' ? 'supervisor' :
        hubModules?.['it-helpdesk'] === 'supervisor' ? 'supervisor' :
        (hubModules?.['it-helpdesk'] === 'user' || hubModules?.['it-helpdesk'] === true) ? 'user' : false

      if (itAccess !== 'supervisor') {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/'
        return NextResponse.redirect(redirectUrl)
      }
    }

    // DASHBOARD (IT): Solo para supervisores IT
    // Usa hub_visible_modules como fuente de verdad
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
      if (!userId) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        return NextResponse.redirect(loginUrl)
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, hub_visible_modules')
        .eq('id', userId)
        .single()

      const hubModules = profile?.hub_visible_modules as Record<string, string | boolean> | null
      const itAccess = profile?.role === 'admin' ? 'supervisor' :
        hubModules?.['it-helpdesk'] === 'supervisor' ? 'supervisor' :
        (hubModules?.['it-helpdesk'] === 'user' || hubModules?.['it-helpdesk'] === true) ? 'user' : false

      // Solo supervisores IT pueden acceder al dashboard IT
      if (itAccess !== 'supervisor') {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/'
        return NextResponse.redirect(redirectUrl)
      }
    }

  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
