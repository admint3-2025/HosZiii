"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { assignTicketAssetAction } from "../actions"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"
import { formatAssetType } from "@/lib/assets/format"

type AssetOption = {
  id: string
  asset_tag: string
  asset_type: string
  status: string
  brand?: string | null
  model?: string | null
  asset_location?: { code?: string; name?: string } | null
}

type LocationOption = {
  id: string
  code: string
  name: string
}

type Props = {
  ticketId: string
  defaultAssetId?: string
  defaultAssetTag?: string
  userRole: string
  ticketLocation?: LocationOption | null
}

export function AssetAssignForm({
  ticketId,
  defaultAssetId = "",
  defaultAssetTag = "",
  userRole,
  ticketLocation,
}: Props) {
  const supabase = createSupabaseBrowserClient()
  const [query, setQuery] = useState(defaultAssetTag)
  const [selectedId, setSelectedId] = useState(defaultAssetId)
  const [results, setResults] = useState<AssetOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [locations, setLocations] = useState<LocationOption[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState(ticketLocation?.id || "")

  const selectedLocationName = useMemo(() => {
    const found = locations.find((l) => l.id === selectedLocationId)
    return found ? `${found.code} · ${found.name}` : ticketLocation ? `${ticketLocation.code} · ${ticketLocation.name}` : ""
  }, [locations, selectedLocationId, ticketLocation])

  useEffect(() => {
    if (!open) return
    if (locations.length > 0) return

    const loadLocations = async () => {
      try {
        setLoadingLocations(true)
        const res = await fetch("/api/locations/options")
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || `Error ${res.status}`)
        }
        const json = await res.json()
        setLocations(json.locations || [])
        if (!selectedLocationId && json.locations?.length) {
          setSelectedLocationId(json.locations[0].id)
        }
      } catch (err: any) {
        setError(err?.message || "No se pudieron cargar las sedes")
      } finally {
        setLoadingLocations(false)
      }
    }

    loadLocations()
  }, [open, locations.length, supabase])

  useEffect(() => {
    if (!open) return

    // For supervisors (RLS-limited) the initial selectedLocationId might be empty; fetch will be filtered by policy anyway.
    const controller = new AbortController()
    const loadAssets = async () => {
      try {
        setLoading(true)
        setError(null)
        const params: string[] = []
        if (selectedLocationId) params.push(`locationId=${encodeURIComponent(selectedLocationId)}`)
        const qs = params.length ? `?${params.join("&")}` : ""
        
        console.log('[AssetAssignForm] Cargando activos:', { selectedLocationId, qs })
        
        const res = await fetch(`/api/assets/search${qs}`, {
          signal: controller.signal,
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || `Error ${res.status}`)
        }
        const json = await res.json()
        
        console.log('[AssetAssignForm] Activos recibidos:', json.assets?.length || 0)
        if (json.assets && json.assets.length > 0) {
          console.log('[AssetAssignForm] Primer activo:', json.assets[0])
        }
        
        setResults(json.assets || [])
        setError(null)
      } catch (err: any) {
        if (err?.name === "AbortError") return
        console.error('[AssetAssignForm] Error cargando activos:', err)
        setError("No se pudo cargar el inventario de la sede")
      } finally {
        setLoading(false)
      }
    }

    loadAssets()
    return () => controller.abort()
  }, [open, selectedLocationId])

  const filteredResults = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return results
    return results.filter((a) => {
      const haystack = [a.asset_tag, a.brand, a.model, a.asset_type].filter(Boolean).join(" ").toLowerCase()
      return haystack.includes(term)
    })
  }, [query, results])

  const assetIdentifier = useMemo(() => {
    return (selectedId || query || "").trim()
  }, [query, selectedId])

  const hasSelection = assetIdentifier.length > 0

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!hasSelection || isPending) return
    
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await assignTicketAssetAction(formData)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="assetIdentifier" value={assetIdentifier} />

      <div className="flex items-center justify-end gap-2">
        <button type="button" className="btn btn-sm btn-primary" onClick={() => setOpen(true)}>
          Buscar
        </button>
        <button type="submit" className="btn btn-sm btn-outline-primary" disabled={!hasSelection || isPending}>
          {isPending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <p className="text-[11px] text-gray-500">Solo administradores y supervisores.</p>

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Seleccionar activo</div>
                <div className="text-xs text-gray-600">Primero elige la sede y luego escribe para buscar.</div>
              </div>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setOpen(false)}>
                Cerrar
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                  <span>Sede</span>
                  {loadingLocations && <span className="text-[11px] text-gray-500">Cargando...</span>}
                </div>
                <select
                  className="select select-sm w-full"
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} · {loc.name}
                    </option>
                  ))}
                  {!locations.length && ticketLocation && (
                    <option value={ticketLocation.id}>
                      {ticketLocation.code} · {ticketLocation.name}
                    </option>
                  )}
                </select>
                <p className="text-[11px] text-gray-500">Admin: selecciona la sede del ticket. Supervisores verán solo sus sedes.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 block">Buscar por tag, marca o modelo (filtra en la sede seleccionada)</label>
                <div className="relative">
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setSelectedId("")
                    }}
                    placeholder="Ej. PC-001, Dell, HP..."
                    className="input input-sm w-full pr-16"
                    autoComplete="off"
                    name="assetSearch"
                  />
                  {loading && (
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <svg className="w-4 h-4 text-gray-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                        <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4"></path>
                      </svg>
                    </div>
                  )}
                </div>
                {error && <div className="text-[11px] text-red-600">{error}</div>}

                {!loading && !error && filteredResults.length === 0 && results.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-8">
                    No hay activos en esta sede. Selecciona otra sede o verifica el inventario.
                  </div>
                )}

                {!loading && !error && filteredResults.length === 0 && results.length > 0 && (
                  <div className="text-sm text-gray-500 text-center py-8">
                    No se encontraron activos con ese criterio de búsqueda. Intenta con otro término.
                  </div>
                )}

                {filteredResults.length > 0 && (
                  <div className="max-h-64 overflow-auto rounded-lg border border-gray-200 shadow-sm divide-y">
                    {filteredResults.map((asset) => (
                      <button
                        type="button"
                        key={asset.id}
                        onClick={() => {
                          setQuery(asset.asset_tag)
                          setSelectedId(asset.id)
                          setOpen(false)
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
                          <span>{asset.asset_tag}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700 border">{asset.status}</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {formatAssetType(asset)}
                          {asset.brand ? ` • ${asset.brand}` : ""}
                          {asset.model ? ` ${asset.model}` : ""}
                        </div>
                          {asset.asset_location && (asset.asset_location.code || asset.asset_location.name) && (
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              📍 {asset.asset_location.code && asset.asset_location.name 
                                ? `${asset.asset_location.code} - ${asset.asset_location.name}`
                                : asset.asset_location.code || asset.asset_location.name
                              }
                            </div>
                          )}
                      </button>
                    ))}
                  </div>
                )}

                {!loading && query.trim().length >= 2 && results.length === 0 && !error && (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                    Sin resultados en la sede seleccionada.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
