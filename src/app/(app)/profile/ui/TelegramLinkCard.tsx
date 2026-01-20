'use client'

import { useEffect, useMemo, useState } from 'react'

type TelegramStatus = {
  ok: boolean
  linked: boolean
  chat_id: string | null
  error?: string
}

export default function TelegramLinkCard() {
  const [status, setStatus] = useState<TelegramStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [chatId, setChatId] = useState('')
  const [deviceName, setDeviceName] = useState('Telegram')
  const [message, setMessage] = useState<string | null>(null)

  const canLink = useMemo(() => chatId.trim().length > 0, [chatId])

  async function refreshStatus() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/telegram/status', { method: 'GET' })
      const data = (await res.json()) as TelegramStatus
      if (!res.ok) {
        setStatus({ ok: false, linked: false, chat_id: null, error: data?.error || 'Error' })
        return
      }
      setStatus(data)
    } catch (err) {
      setStatus({ ok: false, linked: false, chat_id: null, error: err instanceof Error ? err.message : 'Error' })
    } finally {
      setLoading(false)
    }
  }

  async function link() {
    if (!canLink) return
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId.trim(), device_name: deviceName.trim() || undefined }),
      })

      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string }

      if (!res.ok) {
        setMessage(data?.error || 'No se pudo vincular')
        return
      }

      setMessage(data?.message || 'Vinculado')
      setChatId('')
      await refreshStatus()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function unlink() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/telegram/unlink', { method: 'POST' })
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string }

      if (!res.ok) {
        setMessage(data?.error || 'No se pudo desvincular')
        return
      }

      setMessage(data?.message || 'Desvinculado')
      await refreshStatus()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function sendTest() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/telegram/test', { method: 'POST' })
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        telegram_error_code?: number
        debug?: { has_telegram_bot_token?: boolean; telegram_bot_token_length?: number }
      }

      if (!res.ok) {
        const debugText = data?.debug
          ? ` (debug: token=${String(data.debug.has_telegram_bot_token)} len=${String(
              data.debug.telegram_bot_token_length
            )})`
          : ''
        const codeText = data?.telegram_error_code ? ` (code ${data.telegram_error_code})` : ''
        setMessage((data?.error || 'No se pudo enviar la prueba') + codeText + debugText)
        return
      }

      setMessage('✅ Prueba enviada. Revisa tu Telegram.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 1.657-1.343 3-3 3S6 12.657 6 11s1.343-3 3-3 3 1.343 3 3zm0 0c0 1.657 1.343 3 3 3s3-1.343 3-3-1.343-3-3-3-3 1.343-3 3zm0 9c-4.418 0-8-1.79-8-4v-1h16v1c0 2.21-3.582 4-8 4z" />
            </svg>
          </div>
          Telegram
        </h2>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mb-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estado</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {status?.ok ? (
              status.linked ? (
                <>Vinculado (••••{status.chat_id})</>
              ) : (
                <>No vinculado</>
              )
            ) : (
              <>No disponible</>
            )}
          </div>
          {status?.error && (
            <div className="mt-1 text-xs text-rose-700">{status.error}</div>
          )}
        </div>

        <div className="space-y-3">
          <div className="text-sm text-slate-700">
            1) En Telegram abre tu bot y envía <span className="font-mono">/start</span>.<br />
            2) Obtén tu <span className="font-mono">chat_id</span> desde la URL <span className="font-mono">getUpdates</span>.<br />
            3) Pégalo aquí y vincula.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Chat ID</label>
              <input
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="Ej: 987654321"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Dispositivo</label>
              <input
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Telegram"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={link}
              disabled={loading || !canLink}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              Vincular
            </button>
            <button
              onClick={unlink}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold disabled:opacity-50"
            >
              Desvincular
            </button>
            <button
              onClick={sendTest}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              Enviar prueba
            </button>
            <button
              onClick={refreshStatus}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold disabled:opacity-50"
            >
              Actualizar
            </button>
          </div>

          {message && (
            <div className="text-sm font-medium text-slate-900">{message}</div>
          )}
        </div>
      </div>
    </div>
  )
}
