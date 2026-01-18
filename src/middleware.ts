import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const url = process.env.SUPABASE_URL_INTERNAL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  const clearAuthCookies = (res: NextResponse) => {
    const cookies = request.cookies.getAll()
    for (const c of cookies) {
      // Limpiar cookies viejas Y nuevas - INCLUIR access/refresh tokens
      if (c.name.startsWith('sb-') || c.name.startsWith('ziii-session')) {
        res.cookies.delete(c.name)
      }
    }
  }

  // En /login SIEMPRE limpiamos cookies antes de mostrar la página
  if (pathname === '/login') {
    const res = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
    clearAuthCookies(res)
    return res
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(url, anonKey, {
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

  // NO llamar getUser() - solo verificar si existe la cookie de sesión
  const sessionCookie = request.cookies.get('ziii-session-access-token') || 
                        request.cookies.get('ziii-session')
  const hasSession = !!sessionCookie

  // Mantener '/' como URL principal: redirigir al hub
  if (pathname === '/') {
    if (!hasSession) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
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
    pathname.startsWith('/corporativo')
  if (isAppRoute) {
    // Verificar solo la cookie de sesión
    if (!hasSession) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }

    // Admin routes: diferentes niveles de acceso
    if (pathname.startsWith('/admin')) {
      // Obtener usuario desde la sesión para conocer el id
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

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

      // /admin para admin (acceso total) y corporate_admin (solo redirigir si intenta entrar)
      if (profile?.role === 'corporate_admin') {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/reports'
        return NextResponse.redirect(redirectUrl)
      }
      if (profile?.role !== 'admin') {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return NextResponse.redirect(redirectUrl)
      }
    }

    // Auditoría para admin y supervisor
    if (pathname.startsWith('/audit')) {
      // Reusar userId si ya se obtuvo, o solicitarlo ahora
      let auditUserId: string | undefined
      try {
        const { data: ud } = await supabase.auth.getUser()
        auditUserId = ud?.user?.id
      } catch {
        auditUserId = undefined
      }

      if (!auditUserId) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        return NextResponse.redirect(loginUrl)
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', auditUserId)
        .single()

      if (profile?.role !== 'admin' && profile?.role !== 'supervisor') {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return NextResponse.redirect(redirectUrl)
      }
    }

    // MANTENIMIENTO: Lógica de acceso diferenciada
    // - Crear tickets: cualquier usuario autenticado puede crear
    // - Dashboard/Gestión: solo admin o usuarios con asset_category = 'MAINTENANCE'
    if (pathname.startsWith('/mantenimiento')) {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      if (!userId) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        return NextResponse.redirect(loginUrl)
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, asset_category')
        .eq('id', userId)
        .single()

      // Rutas de CREACIÓN de tickets - cualquier usuario autenticado puede acceder
      const isTicketCreationRoute = pathname === '/mantenimiento/tickets/new'
      
      if (isTicketCreationRoute) {
        // Permitir a cualquier usuario autenticado crear tickets
        // (continuar sin redirigir)
      } else {
        // Rutas de GESTIÓN (dashboard, bandeja, reportes) - solo área de mantenimiento
        const canManageMaintenance = profile?.role === 'admin' || profile?.asset_category === 'MAINTENANCE'
        if (!canManageMaintenance) {
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/dashboard'
          return NextResponse.redirect(redirectUrl)
        }
      }
    }

    // DASHBOARD (IT): Solo para admin y usuarios con asset_category = 'IT' o null
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      if (!userId) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        return NextResponse.redirect(loginUrl)
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, asset_category')
        .eq('id', userId)
        .single()

      // Si es MAINTENANCE, redirigir a mantenimiento
      if (profile?.asset_category === 'MAINTENANCE' && profile?.role !== 'admin') {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/mantenimiento/dashboard'
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
