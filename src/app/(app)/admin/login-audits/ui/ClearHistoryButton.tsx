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
      className="ml-auto px-4 py-2 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
    >
      {loading ? 'Limpiando...' : '🗑️ Limpiar historial'}
    </button>
  )
}
