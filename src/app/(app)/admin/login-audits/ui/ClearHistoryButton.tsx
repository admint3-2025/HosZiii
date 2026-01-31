'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ClearHistoryButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleClearHistory = async () => {
    if (!confirm('⚠️ ¿Estás seguro? Esto eliminará TODO el historial de sesiones y no se puede deshacer.')) {
      return
    }

    if (!confirm('🔴 SEGUNDA CONFIRMACIÓN: Esto es irreversible. ¿Continuar?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/clear-login-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`❌ Error: ${data.error}`)
        return
      }

      alert('✅ Historial de sesiones eliminado correctamente')
      router.refresh()
    } catch (error: any) {
      alert(`❌ Error: ${error?.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClearHistory}
      disabled={loading}
      className="ml-2 px-3 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-200 rounded hover:bg-red-200 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Eliminar todo el historial de sesiones"
    >
      {loading ? '⏳' : '🗑️'}
    </button>
  )
}
