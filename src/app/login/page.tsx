import LoginForm from './ui/LoginForm'

export default async function LoginPage() {
  return (
    <main className="min-h-screen flex bg-slate-950">
      {/* Panel izquierdo - Mensaje */}
      <section className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(255 255 255) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="absolute -top-48 -left-48 w-[520px] h-[520px] bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 -right-48 w-[520px] h-[520px] bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <img
              src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png"
              alt="ZIII HoS"
              className="h-14 w-14 object-contain"
            />
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-semibold tracking-wider text-emerald-200 border border-emerald-500/20">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              HOSPITALITY SUITE
            </span>
          </div>

          <h1 className="mt-10 text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Plataforma integral
            <br />
            <span className="text-cyan-300">para Hospitalidad</span>
          </h1>
          <p className="mt-6 max-w-xl text-base xl:text-lg leading-relaxed text-slate-300">
            ERP modular especializado en hoteles: gestión de activos, mantenimiento, inspecciones, capacitación y operaciones bajo
            un solo sistema corporativo.
          </p>

          <div className="mt-10 space-y-6 max-w-xl">
            <div className="flex gap-4">
              <div className="mt-1 h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="h-5 w-5 text-cyan-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Operaciones Hoteleras Integradas</div>
                <div className="mt-1 text-sm text-slate-300">
                  Gestión completa de todos los departamentos: Housekeeping, Mantenimiento, Alimentos &amp; Bebidas, Front Desk y
                  Lavandería con control corporativo multisede
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="h-5 w-5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M4 11h16M7 15h2m-2 4h2m6-4h2m-2 4h2" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Planeación y Control Anual</div>
                <div className="mt-1 text-sm text-slate-300">
                  Inventarios, mantenimientos preventivos, inspecciones programadas y capacitación con calendarios integrados y
                  seguimiento de cumplimiento
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 h-10 w-10 rounded-xl bg-slate-50/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                <svg className="h-5 w-5 text-slate-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Trazabilidad y Auditoría Corporativa</div>
                <div className="mt-1 text-sm text-slate-300">
                  Control total desde nivel corporativo a operaciones de cada propiedad con historial completo, reportes ejecutivos y
                  cumplimiento normativo
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-10 border-t border-white/10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Multitenancia Corporativa</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Control Total por Roles</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Trazabilidad Completa</span>
          </div>
        </div>
      </section>

      {/* Panel derecho - Formulario */}
      <section className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center">
            <img src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png" alt="ZIII HoS" className="h-16 w-16 object-contain" />
            <h2 className="mt-6 text-xl font-bold text-slate-900">Bienvenido a ZIII HoS</h2>
            <p className="mt-1 text-sm text-slate-500">Plataforma integral para gestión hotelera corporativa</p>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-7">
            <LoginForm />
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            Sistema ERP modular: Assets • Mantenimiento • Inspecciones • Academia • Service Desk
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Sistema corporativo seguro y multitenancia</span>
          </div>
        </div>
      </section>
    </main>
  )
}
