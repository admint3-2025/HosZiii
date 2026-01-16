import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import ClientDate from '@/components/ClientDate'

type Row = {
  id: string
  user_id: string | null
  ip: string | null
  user_agent: string | null
  created_at: string
}

export default async function Page({ searchParams }: { searchParams: any }) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp?.page || '1'))
  const perPage = 25
  const offset = (page - 1) * perPage

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

  const { data, error } = await supabase
    .from('login_audits')
    .select('id, user_id, ip, user_agent, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  const rows: Row[] = (data as any) || []

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
        <div className="text-sm text-slate-500">Mostrando {rows.length} registros</div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full table-fixed text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">IP</th>
              <th className="px-4 py-3 text-left">User Agent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t last:border-b">
                <td className="px-4 py-3 align-top">
                  <ClientDate iso={r.created_at} />
                </td>
                <td className="px-4 py-3 align-top">
                  {r.user_id ? (
                    <Link href={`/admin/users/${r.user_id}`} className="text-indigo-600 hover:underline">
                      {profilesMap[r.user_id]?.full_name
                        || profilesMap[r.user_id]?.email
                        || r.user_id}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 align-top">{(r.ip || '—').replace?.(/^::ffff:/, '') || '—'}</td>
                <td className="px-4 py-3 align-top truncate max-w-[480px]">{r.user_agent || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          {page > 1 && (
            <Link href={`?page=${page - 1}`} className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200">Anterior</Link>
          )}
          {rows.length === perPage && (
            <Link href={`?page=${page + 1}`} className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200">Siguiente</Link>
          )}
        </div>
      </div>
    </div>
  )
}
