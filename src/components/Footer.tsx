import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-slate-900/95 border-t border-slate-800/50 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Logo + Nombre */}
          <div className="flex items-center gap-2">
            <img
              src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png"
              alt="ZIII"
              className="h-5 w-5 object-contain"
            />
            <span className="text-xs text-slate-400">
              <span className="font-medium text-slate-300">ZIII</span> Hospitality OS
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/profile" className="text-slate-500 hover:text-slate-300 transition-colors">
              Mi Perfil
            </Link>
            <span className="text-slate-700">|</span>
            <Link href="/admin/knowledge-base" className="text-slate-500 hover:text-slate-300 transition-colors">
              Ayuda
            </Link>
          </div>

          {/* Version + Status */}
          <div className="flex items-center gap-3 text-[10px] text-slate-600">
            <span>v2.1.0</span>
            <span className="text-slate-700">•</span>
            <span>© {new Date().getFullYear()} ZIII HoS</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="uppercase tracking-wider">Activo</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

