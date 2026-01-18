'use client'

import InspectionFlowSelector from '@/app/(app)/inspections/ui/InspectionFlowSelector'

export default function CorporativoInspeccionesClient() {

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-end mb-4">
            <a
              href="/corporativo/dashboard"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </a>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <InspectionFlowSelector />
          </div>
        </div>
      </div>
    </main>
  )
}
