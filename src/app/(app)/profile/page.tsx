import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ChangePasswordForm from './ui/ChangePasswordForm'
import { getAvatarInitial } from '@/lib/ui/avatar'

export const metadata = {
  title: 'Mi Perfil | ZIII HoS',
  description: 'Configuración de perfil y cambio de contraseña',
}

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, department, phone, building, floor, position, location_id, locations(name, code)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const roleLabels: Record<string, string> = {
    requester: 'Usuario',
    agent_l1: 'Técnico (Nivel 1)',
    agent_l2: 'Técnico (Nivel 2)',
    supervisor: 'Supervisor',
    auditor: 'Auditor',
    admin: 'Administrador',
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Premium */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 p-7 lg:p-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-violet-500/30 ring-4 ring-violet-400/20">
            {getAvatarInitial({
              fullName: profile.full_name,
              description: profile.position,
              email: user.email,
            })}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-1">{profile.full_name || 'Usuario'}</h1>
            <p className="text-slate-300 text-base font-medium">{user.email}</p>
          </div>
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full border border-violet-400/30 bg-violet-500/20">
            <span className="text-xs font-bold text-violet-200 uppercase tracking-wider">
              {roleLabels[profile.role] || profile.role}
            </span>
          </div>
        </div>
      </div>

      {/* Layout 2 columnas en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Información del perfil */}
        <div className="card">
          <div className="card-body">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              Información del perfil
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rol</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {roleLabels[profile.role] || profile.role}
                </div>
              </div>

              {profile.department && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Departamento</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{profile.department}</div>
                </div>
              )}

              {profile.position && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Puesto</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{profile.position}</div>
                </div>
              )}

              {profile.phone && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Teléfono / Ext</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{profile.phone}</div>
                </div>
              )}

              {(profile as any).locations && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ciudad/Empresa</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {(profile as any).locations.name} ({(profile as any).locations.code})
                  </div>
                </div>
              )}

              {profile.building && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Edificio / Sede</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{profile.building}</div>
                </div>
              )}

              {profile.floor && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Piso</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{profile.floor}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cambio de contraseña */}
        <ChangePasswordForm />
      </div>
    </div>
  )
}
