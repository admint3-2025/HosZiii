'use client'

type ConfirmTicketModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  ticketData: {
    title: string
    description: string
    categoryName: string
    impact: number
    urgency: number
    priority: number
    requesterName: string
    assetInfo: string | null
    attachmentsCount: number
    remoteConnectionType?: string | null
    remoteConnectionId?: string | null
    remoteConnectionPassword?: string | null
  }
  busy: boolean
}

const IMPACT_LABELS: Record<number, string> = {
  1: 'Crítico',
  2: 'Alto',
  3: 'Medio',
  4: 'Bajo',
}

const URGENCY_LABELS: Record<number, string> = {
  1: 'Inmediata',
  2: 'Alta',
  3: 'Media',
  4: 'Baja',
}

const PRIORITY_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  2: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  3: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  4: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
}

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Crítica',
  2: 'Alta',
  3: 'Media',
  4: 'Baja',
}

export default function ConfirmMaintenanceTicketModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  ticketData,
  busy 
}: ConfirmTicketModalProps) {
  if (!isOpen) return null

  const priorityStyle = PRIORITY_COLORS[ticketData.priority] || PRIORITY_COLORS[3]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header con tema de mantenimiento (naranja) */}
        <div className="sticky top-0 bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold">Confirmar creación de ticket</h2>
                <p className="text-sm text-orange-100">Revisa la información antes de enviar</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Título */}
          <div className="border-b border-gray-200 pb-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Título del ticket
            </label>
            <p className="text-base font-semibold text-gray-900">{ticketData.title}</p>
          </div>

          {/* Descripción */}
          <div className="border-b border-gray-200 pb-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              Descripción
            </label>
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-200">
              {ticketData.description}
            </p>
          </div>

          {/* Grid de información */}
          <div className="grid grid-cols-2 gap-4">
            {/* Categoría */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Categoría
              </label>
              <p className="text-sm font-medium text-gray-900 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                {ticketData.categoryName}
              </p>
            </div>

            {/* Prioridad */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Prioridad calculada
              </label>
              <div className={`px-3 py-2 rounded-lg border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
                <p className="text-sm font-bold">
                  {PRIORITY_LABELS[ticketData.priority]}
                </p>
              </div>
            </div>

            {/* Impacto */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Impacto
              </label>
              <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                {IMPACT_LABELS[ticketData.impact]}
              </p>
            </div>

            {/* Urgencia */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Urgencia
              </label>
              <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                {URGENCY_LABELS[ticketData.urgency]}
              </p>
            </div>
          </div>

          {/* Solicitante */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-orange-700 uppercase tracking-wider mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Solicitante
            </label>
            <p className="text-sm font-medium text-orange-900">{ticketData.requesterName}</p>
          </div>

          {/* Activo (si aplica) */}
          {ticketData.assetInfo && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                Activo relacionado
              </label>
              <p className="text-sm font-medium text-amber-900">{ticketData.assetInfo}</p>
            </div>
          )}

          {/* Adjuntos */}
          {ticketData.attachmentsCount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Archivos adjuntos
              </label>
              <p className="text-sm font-medium text-green-900">
                {ticketData.attachmentsCount} archivo{ticketData.attachmentsCount !== 1 ? 's' : ''} adjunto{ticketData.attachmentsCount !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Footer con botones en tema naranja */}
        <div className="flex gap-3 px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Revisar información
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-sm font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creando ticket...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirmar y crear
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
