'use client'

import { useState } from 'react'

export default function MaintenanceCloseTicketModal({
  onClose,
  onConfirm,
  busy,
}: {
  onClose: () => void
  onConfirm: (resolution: string) => void
  busy: boolean
}) {
  const [resolution, setResolution] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (resolution.trim().length < 10) {
      alert('La resolución debe tener al menos 10 caracteres')
      return
    }
    onConfirm(resolution.trim())
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Cerrar Ticket</h3>
                  <p className="text-sm text-gray-500">Proporciona una descripción de la resolución</p>
                </div>
              </div>

              <div>
                <label htmlFor="resolution" className="block text-sm font-medium text-gray-700 mb-2">
                  Resolución *
                </label>
                <textarea
                  id="resolution"
                  rows={5}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Describe cómo se resolvió el problema..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  required
                  minLength={10}
                />
                <p className="mt-1 text-xs text-gray-500">Mínimo 10 caracteres</p>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
              <button
                type="submit"
                disabled={busy || resolution.trim().length < 10}
                className="inline-flex w-full justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Cerrando...
                  </span>
                ) : (
                  'Cerrar Ticket'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
