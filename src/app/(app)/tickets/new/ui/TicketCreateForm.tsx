'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { computePriority } from '@/lib/tickets/priority'
import { createTicket } from '../actions'
import AttachmentUploader from '@/components/AttachmentUploader'
import { uploadTicketAttachment } from '@/lib/storage/attachments'

type CategoryRow = {
  id: string
  name: string
  parent_id: string | null
  sort_order?: number
}

type User = {
  id: string
  full_name: string | null
  email: string | null
}

type Asset = {
  id: string
  asset_tag: string
  asset_type: string
  brand: string | null
  model: string | null
  status: string
}

export default function TicketCreateForm({ categories: initialCategories }: { categories: CategoryRow[] }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryL1, setCategoryL1] = useState<string>('')
  const [categoryL2, setCategoryL2] = useState<string>('')
  const [categoryL3, setCategoryL3] = useState<string>('')
  const [impact, setImpact] = useState<number>(3)
  const [urgency, setUrgency] = useState<number>(3)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  
  // User selection for agents/supervisors/admin
  const [users, setUsers] = useState<User[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [requesterId, setRequesterId] = useState<string>('')
  const [canCreateForOthers, setCanCreateForOthers] = useState(false)
  
  // Asset selection (optional)
  const [assets, setAssets] = useState<Asset[]>([])
  const [assetId, setAssetId] = useState<string>('')
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryLevel, setNewCategoryLevel] = useState<1 | 2 | 3>(1)
  const [creatingCategory, setCreatingCategory] = useState(false)

  const priority = useMemo(() => computePriority({ impact, urgency }), [impact, urgency])

  // Load users and check if current user can create tickets for others
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      setCurrentUserId(user.id)
      setRequesterId(user.id) // Default to self

      // Check if user is agent/supervisor/admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile && ['agent_l1', 'agent_l2', 'supervisor', 'admin'].includes(profile.role)) {
        setCanCreateForOthers(true)
        
        // Load all users - we'll use full_name and id
        const { data: allUsers } = await supabase
          .from('profiles')
          .select('id, full_name')
          .order('full_name', { ascending: true, nullsFirst: false })
        
        if (allUsers) {
          setUsers(allUsers.map(u => ({
            id: u.id,
            full_name: u.full_name,
            email: null // We don't have direct access to email from client
          })))
        }
      }

      // Load available assets (only operational ones)
      const { data: assetsData } = await supabase
        .from('assets')
        .select('id, asset_tag, asset_type, brand, model, status')
        .eq('deleted_at', null)
        .in('status', ['OPERATIONAL', 'MAINTENANCE'])
        .order('asset_tag', { ascending: true })

      if (assetsData) {
        setAssets(assetsData)
      }
    }
    loadData()
  }, [supabase])

  const roots = useMemo(() => {
    const filtered = categories.filter((c) => c.parent_id === null)
    // Eliminar duplicados por ID
    const seen = new Set<string>()
    return filtered.filter((c) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
  }, [categories])

  const l2Options = useMemo(() => {
    const filtered = categories.filter((c) => c.parent_id === categoryL1)
    // Eliminar duplicados por ID
    const seen = new Set<string>()
    return filtered.filter((c) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
  }, [categories, categoryL1])

  const l3Options = useMemo(() => {
    const filtered = categories.filter((c) => c.parent_id === categoryL2)
    // Eliminar duplicados por ID
    const seen = new Set<string>()
    return filtered.filter((c) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
  }, [categories, categoryL2])

  const selectedCategoryId = useMemo(() => {
    // Always hierarchical: prefer the deepest selection available.
    if (categoryL3) return categoryL3
    if (categoryL2) return categoryL2
    if (categoryL1) return categoryL1
    return null
  }, [categoryL1, categoryL2, categoryL3])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const result = await createTicket({
      title,
      description,
      category_id: selectedCategoryId,
      impact,
      urgency,
      priority,
      support_level: 1,
      requester_id: canCreateForOthers && requesterId && requesterId !== currentUserId
        ? requesterId
        : undefined,
      asset_id: assetId || null,
    })

    if (result.error) {
      setBusy(false)
      setError(result.error)
      return
    }

    // Subir archivos adjuntos si hay
    if (result.success && result.ticketId && attachments.length > 0) {
      const userId = canCreateForOthers && requesterId ? requesterId : currentUserId
      if (userId) {
        const uploadPromises = attachments.map(file => 
          uploadTicketAttachment(result.ticketId!, file, userId)
        )
        
        const uploadResults = await Promise.all(uploadPromises)
        const failedUploads = uploadResults.filter(r => !r.success)
        
        if (failedUploads.length > 0) {
          console.error('Algunos archivos no se pudieron subir:', failedUploads)
          // No bloqueamos, solo informamos
        }
      }
    }

    setBusy(false)
    
    if (result.success && result.ticketId) {
      router.push(`/tickets/${result.ticketId}`)
      router.refresh()
    }
  }

  async function createNewCategory() {
    if (!newCategoryName.trim()) return
    
    setCreatingCategory(true)
    setError(null)

    const parentId = 
      newCategoryLevel === 3 ? categoryL2 :
      newCategoryLevel === 2 ? categoryL1 :
      null

    const nextSortOrder = Math.max(
      ...categories
        .filter(c => c.parent_id === parentId)
        .map(c => c.sort_order || 0),
      0
    ) + 10

    const { data, error: insertError } = await supabase
      .from('categories')
      .insert({
        name: newCategoryName.trim(),
        parent_id: parentId,
        sort_order: nextSortOrder,
      })
      .select('id,name,parent_id,sort_order')
      .single()

    setCreatingCategory(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    if (data) {
      setCategories([...categories, data])
      
      // Auto-select the new category
      if (newCategoryLevel === 1) {
        setCategoryL1(data.id)
        setCategoryL2('')
        setCategoryL3('')
      } else if (newCategoryLevel === 2) {
        setCategoryL2(data.id)
        setCategoryL3('')
      } else {
        setCategoryL3(data.id)
      }
      
      setShowModal(false)
      setNewCategoryName('')
    }
  }

  function openModal(level: 1 | 2 | 3) {
    setNewCategoryLevel(level)
    setNewCategoryName('')
    setShowModal(true)
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Card de categorías */}
        <div className="card shadow-lg border-0">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Categoría</h3>
                <p className="text-xs text-gray-600">Selección jerárquica de la categoría del ticket</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Nivel 1</label>
                <button
                  type="button"
                  onClick={() => openModal(1)}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 transition-colors"
                  title="Crear nueva categoría"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nueva
                </button>
              </div>
              <select
                className="select text-sm"
                value={categoryL1}
                onChange={(e) => {
                  const next = e.target.value
                  setCategoryL1(next)
                  setCategoryL2('')
                  setCategoryL3('')
                }}
                required
              >
                <option value="">Seleccionar…</option>
                {roots.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Nivel 2</label>
                {categoryL1 && (
                  <button
                    type="button"
                    onClick={() => openModal(2)}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 transition-colors"
                    title="Crear nueva subcategoría"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva
                  </button>
                )}
              </div>
              <select
                className="select"
                value={categoryL2}
                onChange={(e) => {
                  const next = e.target.value
                  setCategoryL2(next)
                  setCategoryL3('')
                }}
                disabled={!categoryL1 || l2Options.length === 0}
                required={!!categoryL1 && l2Options.length > 0}
              >
                <option value="">Seleccionar…</option>
                {l2Options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Nivel 3</label>
                {categoryL2 && (
                  <button
                    type="button"
                    onClick={() => openModal(3)}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 transition-colors"
                    title="Crear nuevo tipo"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva
                  </button>
                )}
              </div>
              <select
                className="select"
                value={categoryL3}
                onChange={(e) => setCategoryL3(e.target.value)}
                disabled={!categoryL2 || l3Options.length === 0}
                required={!!categoryL2 && l3Options.length > 0}
              >
                <option value="">Seleccionar…</option>
                {l3Options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          </div>
        </div>

        {/* Selector de usuario (solo para agentes/supervisores/admin) */}
        {canCreateForOthers && users.length > 0 && (
          <div className="card shadow-lg border-0 overflow-hidden">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-b border-amber-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-amber-900 uppercase tracking-wider">Solicitado por</h3>
                  <p className="text-xs text-amber-700">Como técnico, puedes crear tickets para otros usuarios</p>
                </div>
              </div>
            </div>
            <div className="card-body">
              <select
                className="select w-full text-sm"
              value={requesterId}
              onChange={(e) => setRequesterId(e.target.value)}
              required
            >
              <option value="">-- Seleccionar usuario --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.id.substring(0, 8)}
                  {u.id === currentUserId ? ' (Yo)' : ''}
                </option>
))}
            </select>
            </div>
          </div>
        )}

        {/* Selector de activo (opcional) */}
        {assets.length > 0 && (
          <div className="card shadow-lg border-0 overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-b border-emerald-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-emerald-900 uppercase tracking-wider">Activo relacionado</h3>
                  <p className="text-xs text-emerald-700">Opcional: vincula este ticket con un activo de TI</p>
                </div>
              </div>
            </div>
            <div className="card-body">
              <select
                className="select w-full text-sm"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
              >
                <option value="">-- Ninguno --</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.asset_tag} - {asset.asset_type} 
                    {asset.brand && ` ${asset.brand}`}
                    {asset.model && ` ${asset.model}`}
                    {asset.status === 'MAINTENANCE' && ' [En mantenimiento]'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Card de información del ticket */}
        <div className="card shadow-lg border-0">
          <div className="card-body space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Título
              </label>
              <input
                className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
                placeholder="Resumen claro del problema"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descripción
              </label>
              <textarea
                className="textarea min-h-32"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
                placeholder="Detalla los síntomas, pasos para reproducir, y cualquier información relevante..."
              />
            </div>
          </div>
        </div>

        {/* Card de clasificación */}
        <div className="card shadow-lg border-0">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Clasificación</h3>
                <p className="text-xs text-gray-600">Define el impacto y urgencia del ticket</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Impacto</label>
                <select
                  className="select text-sm"
            value={impact}
            onChange={(e) => setImpact(Number(e.target.value))}
          >
            <option value={1}>I1 – Crítico (Organización)</option>
            <option value={2}>I2 – Alto (Área/Equipo)</option>
            <option value={3}>I3 – Medio (Usuario)</option>
            <option value={4}>I4 – Bajo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Urgencia</label>
                <select
                  className="select text-sm"
            value={urgency}
            onChange={(e) => setUrgency(Number(e.target.value))}
          >
            <option value={1}>U1 – Inmediata</option>
            <option value={2}>U2 – Alta</option>
            <option value={3}>U3 – Media</option>
            <option value={4}>U4 – Baja</option>
                </select>
              </div>
            </div>

            <div className="mt-4 rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 px-5 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Prioridad estimada</div>
                    <div className="text-2xl font-bold text-indigo-900">P{priority}</div>
                  </div>
                </div>
                <div className="text-xs text-indigo-600 max-w-[200px]">
                  Calculada automáticamente según impacto y urgencia
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card de archivos adjuntos */}
        <div className="card shadow-lg border-0">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Archivos adjuntos</h3>
                <p className="text-xs text-gray-600">Adjunta capturas de pantalla, documentos o archivos relevantes</p>
              </div>
            </div>
            
            <AttachmentUploader 
              onFilesChange={setAttachments}
              maxFiles={5}
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 flex items-center gap-3 shadow-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary w-full py-4 text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
        >
          {busy ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creando ticket…
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Crear ticket
            </>
          )}
        </button>
    </form>

      {/* Modal para crear nueva categoría */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Nueva categoría</h3>
                <p className="text-xs text-gray-600">
                  {newCategoryLevel === 1 && 'Nivel 1: Categoría principal'}
                  {newCategoryLevel === 2 && 'Nivel 2: Subcategoría'}
                  {newCategoryLevel === 3 && 'Nivel 3: Tipo específico'}
                </p>
              </div>
            </div>

            {newCategoryLevel > 1 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-xs font-medium text-blue-900 mb-1">Se creará bajo:</div>
                <div className="text-sm text-blue-700 font-semibold">
                  {newCategoryLevel === 2 && roots.find(r => r.id === categoryL1)?.name}
                  {newCategoryLevel === 3 && l2Options.find(l => l.id === categoryL2)?.name}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la categoría
                </label>
                <input
                  type="text"
                  className="input w-full"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ej: Hardware, Software, Redes..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      createNewCategory()
                    } else if (e.key === 'Escape') {
                      setShowModal(false)
                    }
                  }}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={creatingCategory}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={createNewCategory}
                  disabled={creatingCategory || !newCategoryName.trim()}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {creatingCategory ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creando…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Crear
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
