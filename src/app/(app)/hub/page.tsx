import { redirect } from 'next/navigation'
import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'
import Link from 'next/link'

// Definición de módulos del sistema
type Module = {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  href: string
  bgGradient: string
  iconBg: string
  textColor: string
  requiredRoles?: string[]
  checkPermission?: (profile: any) => boolean
}

const modules: Module[] = [
  {
    id: 'operaciones',
    name: 'OPERACIONES',
    description: 'Gestión diaria: Recepción, Ama de Llaves, Alimentos & Bebidas',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    href: '/mantenimiento',
    bgGradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    iconBg: 'bg-emerald-100',
    textColor: 'text-emerald-900',
    requiredRoles: ['admin', 'supervisor', 'agent_l1', 'agent_l2', 'requester'],
  },
  {
    id: 'helpdesk',
    name: 'HELPDESK',
    description: 'Mesa de Ayuda: IT, Mantenimiento, Soporte Técnico',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    href: '/dashboard',
    bgGradient: 'from-blue-500 via-indigo-500 to-purple-600',
    iconBg: 'bg-blue-100',
    textColor: 'text-blue-900',
    requiredRoles: ['admin', 'supervisor', 'agent_l1', 'agent_l2', 'requester'],
  },
  {
    id: 'corporativo',
    name: 'CORPORATIVO',
    description: 'Inspecciones, Políticas, Procedimientos, Academia',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    href: '/corporativo/dashboard',
    bgGradient: 'from-amber-500 via-orange-500 to-red-600',
    iconBg: 'bg-amber-100',
    textColor: 'text-amber-900',
    requiredRoles: ['admin', 'supervisor', 'auditor'],
  },
  {
    id: 'administracion',
    name: 'ADMINISTRACIÓN',
    description: 'Configuración del Sistema: Usuarios, Permisos, Auditoría',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    href: '/admin/users',
    bgGradient: 'from-violet-500 via-purple-500 to-fuchsia-600',
    iconBg: 'bg-violet-100',
    textColor: 'text-violet-900',
    requiredRoles: ['admin'],
  },
]

export default async function HubPage() {
  const user = await getSafeServerUser()
  
  if (!user) {
    redirect('/login')
  }

  const supabase = await createSupabaseServerClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, location_id, can_view_beo')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Determinar módulos accesibles según el rol del usuario
  const accessibleModules = modules.filter(module => {
    if (!module.requiredRoles) return true
    if (module.checkPermission) return module.checkPermission(profile)
    return module.requiredRoles.includes(profile.role)
  })

  // Si el usuario solo tiene acceso a un módulo, redirigir directamente
  if (accessibleModules.length === 1) {
    redirect(accessibleModules[0].href)
  }

  // Si no tiene acceso a ningún módulo (caso raro), mostrar mensaje
  if (accessibleModules.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="card max-w-md text-center">
          <div className="card-body p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Sin Acceso a Módulos</h1>
            <p className="text-sm text-gray-600 mb-6">
              Tu cuenta no tiene permisos asignados. Contacta al administrador del sistema.
            </p>
            <Link href="/login" className="btn btn-primary">
              Cerrar Sesión
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <img 
                  src="https://integrational3.com.mx/logorigen/ZIII%20logo.png" 
                  alt="ZIII" 
                  className="h-12 w-12 object-contain"
                />
                <div>
                  <h1 className="text-2xl font-bold text-white">ZIII Hospitality Suite</h1>
                  <p className="text-sm text-slate-300">Selecciona el módulo para continuar</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{profile.full_name || user.email}</p>
                <p className="text-xs text-slate-400 capitalize">{profile.role?.replace('_', ' ')}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {profile.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Módulos Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accessibleModules.map((module) => (
            <Link
              key={module.id}
              href={module.href}
              className="group relative overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${module.bgGradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
              
              {/* Content */}
              <div className="relative z-10 p-8">
                <div className="flex items-start gap-6">
                  {/* Icon */}
                  <div className={`${module.iconBg} p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                    <div className={module.textColor}>
                      {module.icon}
                    </div>
                  </div>
                  
                  {/* Text */}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-white transition-colors">
                      {module.name}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                  
                  {/* Arrow */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Hover Glow Effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${module.bgGradient}`}></div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            Sistema ERP Modular para Hospitalidad • {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </main>
  )
}
