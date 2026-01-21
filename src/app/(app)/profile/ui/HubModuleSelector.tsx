'use client'

import { useState } from 'react'

type HubModuleId = 'it-helpdesk' | 'mantenimiento' | 'corporativo' | 'administracion'

interface HubModuleSelectorProps {
  initialModules: Record<HubModuleId, boolean>
}

const modulesList: Array<{ id: HubModuleId; label: string; description: string; icon: string }> = [
  { 
    id: 'it-helpdesk', 
    label: 'IT - HELPDESK', 
    description: 'Mesa de Ayuda: Soporte Técnico y Desarrollo',
    icon: '💻'
  },
  { 
    id: 'mantenimiento', 
    label: 'MANTENIMIENTO', 
    description: 'Órdenes de Trabajo: Ingeniería, Equipos e Infraestructura',
    icon: '🔧'
  },
  { 
    id: 'corporativo', 
    label: 'CORPORATIVO', 
    description: 'Gestión Operativa: Inspecciones, Calidad y BEO',
    icon: '📊'
  },
  { 
    id: 'administracion', 
    label: 'ADMINISTRACIÓN', 
    description: 'Configuración, Usuarios, Auditoría y Reportes',
    icon: '⚙️'
  },
]

export default function HubModuleSelector({ initialModules }: HubModuleSelectorProps) {
  const [modules, setModules] = useState<Record<HubModuleId, boolean>>(initialModules)
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [tempModules, setTempModules] = useState(modules)

  const openModal = () => {
    setTempModules(modules)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/user/hub-modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: tempModules }),
      })

      if (!response.ok) {
        throw new Error('Error al guardar preferencias')
      }

      setModules(tempModules)
      setIsOpen(false)
      // Reload para aplicar cambios en el Hub
      window.location.reload()
    } catch (error) {
      alert('Error al guardar las preferencias. Intenta de nuevo.')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const visibleCount = Object.values(modules).filter(Boolean).length
  const visibleModules = modulesList.filter(m => modules[m.id])

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Vista del Hub</h3>
            <p className="text-sm text-slate-600">
              Personaliza qué módulos aparecen en tu pantalla principal
            </p>
          </div>
          <button
            type="button"
            onClick={openModal}
            className="btn btn-primary text-sm"
          >
            Configurar
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">Módulos visibles: {visibleCount}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleModules.map(m => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700"
              >
                <span>{m.icon}</span>
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Configurar vista del Hub</h2>
              <p className="text-sm text-slate-600">
                Selecciona qué módulos verás en el Hub. Puedes cambiarlos después.
              </p>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Nota:</strong> Esta configuración solo controla qué módulos <em>ves</em> en tu pantalla. 
                  Tus permisos de acceso reales no cambian.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              {modulesList.map((m) => (
                <label
                  key={m.id}
                  className="flex items-start gap-3 p-4 rounded-lg border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="w-5 h-5 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    checked={tempModules[m.id]}
                    onChange={(e) =>
                      setTempModules((prev) => ({
                        ...prev,
                        [m.id]: e.target.checked,
                      }))
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{m.icon}</span>
                      <span className="text-sm font-bold text-slate-900">{m.label}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{m.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Rol seleccionado: {Object.values(tempModules).filter(Boolean).length} de {modulesList.length}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
