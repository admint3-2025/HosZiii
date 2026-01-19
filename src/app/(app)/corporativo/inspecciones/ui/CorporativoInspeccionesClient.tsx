'use client'

import InspectionFlowSelector from '@/app/(app)/inspections/ui/InspectionFlowSelector'
import Link from 'next/link'

export default function CorporativoInspeccionesClient() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header del módulo */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-b border-slate-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">Inspecciones Corporativas</h1>
              <p className="text-amber-200/70 text-xs">Auditorías de calidad por departamento</p>
            </div>
          </div>
          
          <Link 
            href="/corporativo/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm text-white text-xs rounded-lg border border-white/20 hover:bg-white/20 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
        </div>
      </div>

      {/* Contenido */}
      <div className="bg-white border-t border-slate-100">
        <InspectionFlowSelector />
      </div>
    </main>
  )
}
