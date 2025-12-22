import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-8 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-4">
        {/* Fila 1: Logo + Links + Info */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Logo compacto */}
          <div className="flex items-center gap-2">
            <img
              src="https://integrational3.com.mx/logorigen/ZIII%20logo.png"
              alt="ZIII"
              className="h-8 w-auto"
            />
            <div className="border-l border-slate-300 pl-2">
              <div className="font-bold text-gray-900 font-[family-name:var(--font-orbitron)] text-xs">
                ZIII Helpdesk
              </div>
            </div>
          </div>

          {/* Links rápidos */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-blue-600">
              Dashboard
            </Link>
            <Link href="/tickets" className="text-gray-600 hover:text-blue-600">
              Tickets
            </Link>
            <Link href="/reports" className="text-gray-600 hover:text-blue-600">
              Reportes
            </Link>
            <Link href="/audit" className="text-gray-600 hover:text-blue-600">
              Auditoría
            </Link>
          </div>

          {/* Badge ITIL compacto */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-100 rounded">
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-[10px] font-bold text-blue-700">ITIL v4</span>
          </div>
        </div>

        {/* Fila 2: Separador */}
        <div className="my-3 border-t border-slate-200" />

        {/* Fila 3: Copyright + Estado */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
          <div>
            © {currentYear} <span className="font-semibold text-gray-700">ZIII Helpdesk</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
