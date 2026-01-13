import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import LoginForm from './ui/LoginForm'

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <main className="min-h-screen flex bg-slate-900">
      {/* Panel izquierdo - Branding */}
      <section className="hidden lg:flex lg:w-[55%] xl:w-[60%] flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        {/* Fondo con gradiente y patrón */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(255 255 255) 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}></div>
        
        {/* Círculos decorativos */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-3xl -ml-32 -mb-32"></div>
        <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-3xl"></div>
        
        {/* Contenido */}
        <div className="relative z-10">
          {/* Logo y badge */}
          <div className="flex items-center gap-5 mb-10">
            <img 
              src="https://integrational3.com.mx/logorigen/ZIII%20logo.png" 
              alt="ZIII Logo" 
              className="h-20 w-20 object-contain drop-shadow-2xl"
            />
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                ZIII <span className="text-indigo-400 font-light">Helpdesk</span>
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Sistema Activo</span>
              </div>
            </div>
          </div>
          
          {/* Título principal */}
          <div className="max-w-xl">
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Service Desk
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                Profesional
              </span>
            </h1>
            
            <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-lg">
              Plataforma empresarial de gestión de incidentes con workflow ITIL, 
              escalamiento automático y métricas en tiempo real.
            </p>
          </div>

          {/* Features list - diseño limpio y no interactivo */}
          <div className="mt-12 space-y-5 max-w-lg">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-base font-bold text-white mb-1">ITIL v4 Certified</div>
                <div className="text-sm text-slate-400">Workflow estandarizado con estados, transiciones y escalamiento N1→N2</div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="text-base font-bold text-white mb-1">Priorización Automática</div>
                <div className="text-sm text-slate-400">Matriz Impacto × Urgencia con cálculo inteligente de prioridades</div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="text-base font-bold text-white mb-1">Dashboard Ejecutivo</div>
                <div className="text-sm text-slate-400">KPIs en tiempo real, aging, tendencias y reportes multi-sede</div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <div className="text-base font-bold text-white mb-1">Auditoría Total</div>
                <div className="text-sm text-slate-400">Trazabilidad completa con registro de cambios y soft-delete con motivo</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-6 text-xs text-slate-500 pt-8 border-t border-white/10">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>SSL Encriptado</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Multi-sede</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-violet-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Soporte 24/7</span>
          </div>
        </div>
      </section>

      {/* Panel derecho - Login Form */}
      <section className="flex-1 flex items-center justify-center p-6 lg:p-10 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full max-w-md">
          {/* Logo - visible en todas las resoluciones */}
          <div className="flex flex-col items-center mb-8">
            <img 
              src="https://integrational3.com.mx/logorigen/ZIII%20logo.png" 
              alt="ZIII Logo" 
              className="h-24 w-24 object-contain drop-shadow-xl mb-4"
            />
            <h2 className="text-xl font-bold text-slate-800">
              ZIII <span className="text-indigo-600 font-light">Helpdesk</span>
            </h2>
          </div>

          {/* Card de login */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/50 overflow-hidden">
            {/* Header del card */}
            <div className="px-8 pt-8 pb-6 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Iniciar Sesión</h3>
              <p className="mt-2 text-sm text-slate-500">Ingresa tus credenciales para acceder al sistema</p>
            </div>

            {/* Form */}
            <div className="px-8 py-8">
              <LoginForm />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span>Sistema protegido y monitoreado</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
