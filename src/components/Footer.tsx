import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-800 text-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-800/50 pt-6">
          <div className="flex items-center gap-3">
            <img
              src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png"
              alt="ZIII HoS"
              className="h-8 w-8 object-contain"
            />
            <div>
              <p className="text-sm font-semibold text-white tracking-tight">ZIII <span className="text-indigo-400 font-light">Hospitality OS</span></p>
              <p className="text-[10px] text-slate-500">Sistema de Gestión Hotelera</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <Link href="/profile" className="text-slate-400 hover:text-white transition-colors">
              Mi Perfil
            </Link>
            <span className="text-slate-700">|</span>
            <Link href="/admin/knowledge-base" className="text-slate-400 hover:text-white transition-colors">
              Ayuda
            </Link>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Versión 2.1.0</p>
            <p className="text-xs text-slate-500">© {new Date().getFullYear()} ZIII HoS</p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Sistema Activo</span>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
        </div>
      </div>
    </footer>
  )
}
