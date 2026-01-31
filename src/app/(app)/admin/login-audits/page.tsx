import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import ClientDate from '@/components/ClientDate'
import ClearHistoryButton from './ui/ClearHistoryButton'

type Row = {
  id: string
  user_id: string | null
  ip: string | null
  user_agent: string | null
  created_at: string
  event?: string | null
  success?: boolean | null
  email?: string | null
  error?: string | null
}

function asString(v: unknown): string {
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : ''
  return ''
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function parseToIso(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function sanitizeForOr(value: string): string {
  // Avoid breaking PostgREST filter strings.
  return value.replace(/[(),]/g, ' ').trim()
}

function hrefWith(sp: any, patch: Record<string, string | null | undefined>): string {
  const params = new URLSearchParams()
  Object.entries(sp || {}).forEach(([k, v]) => {
    const s = asString(v)
    if (s) params.set(k, s)
  })
  Object.entries(patch).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '') params.delete(k)
    else params.set(k, v)
  })
  const qs = params.toString()
  return qs ? `?${qs}` : '?'
}

export default async function Page({ searchParams }: { searchParams: any }) {
  const sp = await searchParams

  const page = Math.max(1, parseInt(asString(sp?.page) || '1'))
  const perPage = Math.min(100, Math.max(10, parseInt(asString(sp?.perPage) || '25')))
  const offset = (page - 1) * perPage

  const q = asString(sp?.q).trim()
  const userId = asString(sp?.userId).trim()
  const ip = asString(sp?.ip).trim()
  const ua = asString(sp?.ua).trim()
  const fromIso = parseToIso(asString(sp?.from).trim())
  const toIso = parseToIso(asString(sp?.to).trim())
  const status = asString(sp?.status).trim() // all | success | fail

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold">Acceso restringido</h2>
        <p className="mt-2 text-sm text-slate-600">Necesitas iniciar sesión para ver este recurso.</p>
      </div>
    )
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const allowed = profile?.role === 'admin' || profile?.role === 'supervisor'
  if (!allowed) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold">Acceso denegado</h2>
        <p className="mt-2 text-sm text-slate-600">No tienes permisos suficientes para ver el registro de sesiones.</p>
      </div>
    )
  }

  // Resolver filtro por usuario/email/nombre
  const qUserIds = new Set<string>()
  if (q && looksLikeUuid(q)) qUserIds.add(q)
  if (q && !looksLikeUuid(q)) {
    const { data: matches } = await supabase
      .from('profiles')
      .select('id')
      .or(`email.ilike.%${sanitizeForOr(q)}%,full_name.ilike.%${sanitizeForOr(q)}%`)
      .limit(1000)
    ;(matches || []).forEach((m: any) => {
      if (m?.id) qUserIds.add(m.id)
    })
  }

  // Construir query con filtros
  const buildQuery = (mode: 'v2' | 'v1') => {
    const columns =
      mode === 'v2'
        ? 'id, user_id, ip, user_agent, created_at, event, success, email, error'
        : 'id, user_id, ip, user_agent, created_at'

    let auditQuery = supabase
      .from('login_audits')
      .select(columns, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (mode === 'v2') {
      if (status === 'success') auditQuery = auditQuery.eq('success', true)
      if (status === 'fail') auditQuery = auditQuery.eq('success', false)
    }

    if (userId && looksLikeUuid(userId)) {
      auditQuery = auditQuery.eq('user_id', userId)
    }

    if (q) {
      const qSafe = sanitizeForOr(q)
      if (looksLikeUuid(qSafe)) {
        auditQuery = auditQuery.eq('user_id', qSafe)
      } else if (mode === 'v2') {
        const ids = Array.from(qUserIds)
        const orParts: string[] = [`email.ilike.%${qSafe}%`]
        if (ids.length > 0) orParts.push(`user_id.in.(${ids.join(',')})`)
        auditQuery = auditQuery.or(orParts.join(','))
      } else {
        // v1 schema: only user_id filtering via profiles matches
        const ids = Array.from(qUserIds)
        if (ids.length > 0) auditQuery = auditQuery.in('user_id', ids)
      }
    }

    if (ip) {
      auditQuery = auditQuery.ilike('ip', `%${ip}%`)
    }
    if (ua) {
      auditQuery = auditQuery.ilike('user_agent', `%${ua}%`)
    }
    if (fromIso) {
      auditQuery = auditQuery.gte('created_at', fromIso)
    }
    if (toIso) {
      auditQuery = auditQuery.lte('created_at', toIso)
    }

    return auditQuery
  }

  // Try v2 columns first; fallback to v1 if DB hasn't been migrated.
  let rows: Row[] = []
  let count: number | null = null
  {
    const { data, count: c, error } = await buildQuery('v2').range(offset, offset + perPage - 1)
    if (!error) {
      rows = (data as any) || []
      count = typeof c === 'number' ? c : null
    } else {
      const { data: d2, count: c2 } = await buildQuery('v1').range(offset, offset + perPage - 1)
      rows = (d2 as any) || []
      count = typeof c2 === 'number' ? c2 : null
    }
  }

  // Enriquecer con información de perfiles (nombre y email)
  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[]
  let profilesMap: Record<string, { full_name?: string | null; email?: string | null }> = {}
  if (userIds.length > 0) {
    const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
    ;(profs || []).forEach((p: any) => {
      profilesMap[p.id] = { full_name: p.full_name, email: p.email }
    })
  }

  // Para userIds que no tengan perfil, intentar obtener email desde auth (admin)
  const missing = userIds.filter((id) => !profilesMap[id])
  if (missing.length > 0) {
    try {
      const admin = createSupabaseAdminClient()
      for (const id of missing) {
        try {
          const { data: authUser } = await admin.auth.admin.getUserById(id)
          const email = authUser?.user?.email || null
          if (email) profilesMap[id] = { email }
        } catch {
          // ignore per-user errors
        }
      }
    } catch {
      // if admin client not available, skip silently
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Registro de sesiones</h1>
        <div className="text-sm text-slate-500">
          {typeof count === 'number' ? (
            <>Resultados: {count} • Página {page}</>
          ) : (
            <>Mostrando {rows.length} registros</>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
        <form method="GET" className="grid gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700">Usuario (email o nombre)</label>
            <input
              name="q"
              defaultValue={q}
              placeholder="ej: juan@empresa.com o Juan"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700">User ID (UUID)</label>
            <input
              name="userId"
              defaultValue={userId}
              placeholder="uuid..."
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">IP</label>
            <input
              name="ip"
              defaultValue={ip}
              placeholder="192.168..."
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700">User-Agent (contiene)</label>
            <input
              name="ua"
              defaultValue={ua}
              placeholder="Chrome, iPhone, Android..."
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700">Desde</label>
            <input
              type="datetime-local"
              name="from"
              defaultValue={asString(sp?.from)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700">Hasta</label>
            <input
              type="datetime-local"
              name="to"
              defaultValue={asString(sp?.to)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Por página</label>
            <select
              name="perPage"
              defaultValue={String(perPage)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Estado</label>
            <select
              name="status"
              defaultValue={status || 'all'}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">Todos</option>
              <option value="success">Exitosos</option>
              <option value="fail">Fallidos</option>
            </select>
          </div>

          <div className="md:col-span-4 flex items-end gap-2">
            <button type="submit" className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
              Filtrar
            </button>
            <Link href="/admin/login-audits" className="px-4 py-2 rounded-md bg-slate-100 text-slate-800 text-sm font-semibold hover:bg-slate-200">
              Limpiar
            </Link>
            <div className="ml-auto flex items-center gap-2 text-xs text-slate-600">
              <span className="hidden sm:inline">Rápido:</span>
              <Link
                href={hrefWith(sp, { q: 'ziiihelpdesk@gmail.com', page: '1' })}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
              >
                ziiihelpdesk
              </Link>
              <Link
                href={hrefWith(sp, { from: new Date(Date.now() - 60 * 60 * 1000).toISOString().slice(0, 16), page: '1' })}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
              >
                1h
              </Link>
              <Link
                href={hrefWith(sp, { from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16), page: '1' })}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
              >
                24h
              </Link>
              <Link
                href={hrefWith(sp, { from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), page: '1' })}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
              >
                7d
              </Link>
            </div>
            <ClearHistoryButton />
          </div>
        </form>

        {q && qUserIds.size === 0 && !looksLikeUuid(q) && (
          <div className="mt-3 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-2">
            Tip: si el intento fue fallido, se filtra por el correo capturado en el login.
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full table-fixed text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left w-[110px]">Estado</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">IP</th>
              <th className="px-4 py-3 text-left">User Agent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={
                  r.success === false
                    ? 'border-t last:border-b bg-red-50'
                    : 'border-t last:border-b'
                }
              >
                <td className="px-4 py-3 align-top">
                  {r.success === false ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                      FALLO
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      OK
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <ClientDate iso={r.created_at} />
                </td>
                <td className="px-4 py-3 align-top">
                  {r.user_id ? (
                    <div className="space-y-1">
                      <Link href={`/admin/users/${r.user_id}`} className="text-indigo-600 hover:underline">
                        {profilesMap[r.user_id]?.full_name
                          || profilesMap[r.user_id]?.email
                          || r.user_id}
                      </Link>
                      <div>
                        <Link
                          href={hrefWith(sp, { userId: r.user_id, page: '1' })}
                          className="text-[11px] text-slate-500 hover:text-slate-700 hover:underline"
                        >
                          Filtrar por este usuario
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className={r.success === false ? 'text-red-800 font-semibold' : 'text-slate-700'}>
                        {r.email || '—'}
                      </div>
                      {r.success === false && r.error ? (
                        <div className="text-[11px] text-red-700">
                          {r.error}
                        </div>
                      ) : null}
                      {r.email ? (
                        <div>
                          <Link
                            href={hrefWith(sp, { q: r.email, page: '1' })}
                            className="text-[11px] text-slate-500 hover:text-slate-700 hover:underline"
                          >
                            Buscar este correo
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-top">{(r.ip || '—').replace?.(/^::ffff:/, '') || '—'}</td>
                <td className="px-4 py-3 align-top truncate max-w-[480px]">{r.user_agent || '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No hay registros que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          {page > 1 && (
            <Link href={hrefWith(sp, { page: String(page - 1) })} className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200">Anterior</Link>
          )}
          {(typeof count !== 'number' ? rows.length === perPage : offset + rows.length < count) && (
            <Link href={hrefWith(sp, { page: String(page + 1) })} className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200">Siguiente</Link>
          )}
        </div>
      </div>
    </div>
  )
}
