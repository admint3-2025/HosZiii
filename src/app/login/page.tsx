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
    <main className="min-h-screen grid lg:grid-cols-2 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <section className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-12 text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <img 
              src="https://integrational3.com.mx/logorigen/ZIII%20logo.png" 
              alt="ZIII Logo" 
              className="h-32 w-auto drop-shadow-2xl"
            />
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-xs font-semibold tracking-wide uppercase">Helpdesk Pro</span>
            </div>
          </div>
          
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight">
            Mesa de ayuda inteligente
            <br />
            <span className="bg-gradient-to-r from-blue-200 to-indigo-200 bg-clip-text text-transparent">
              basada en ITIL
            </span>
          </h1>
          
          <p className="mt-5 text-lg text-blue-50 max-w-lg leading-relaxed">
            Gestiona incidentes con profesionalismo: workflow estructurado, escalamiento automático, 
            auditoría completa y métricas en tiempo real.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-white">Workflow ITIL certificado</div>
                <div className="text-sm text-blue-100">Estados, transiciones y escalamiento N1→N2 con reglas de negocio</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-white">Priorización automática</div>
                <div className="text-sm text-blue-100">Matriz Impacto × Urgencia con cálculo inteligente de prioridades</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-white">Dashboard ejecutivo</div>
                <div className="text-sm text-blue-100">KPIs en tiempo real, aging, tendencias y reportes operativos</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-white">Auditoría total</div>
                <div className="text-sm text-blue-100">Registro completo de cambios, soft-delete con motivo y trazabilidad</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-blue-100 pt-6 border-t border-white/10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Seguro & Encriptado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>ITIL v4 Compatible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Soporte 24/7</span>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <img 
              src="https://integrational3.com.mx/logorigen/ZIII%20logo.png" 
              alt="ZIII Logo" 
              className="h-32 w-auto mx-auto mb-6 drop-shadow-xl"
            />
            <h2 className="text-2xl font-bold text-gray-900">Acceso al sistema</h2>
            <p className="mt-2 text-sm text-gray-600">Ingresa tus credenciales para gestionar tickets</p>
          </div>

          <div className="card shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <div className="card-body">
              <LoginForm />
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 mb-3">Plataforma protegida con autenticación segura</p>
            <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Sistema operativo</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>Cloud seguro</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
