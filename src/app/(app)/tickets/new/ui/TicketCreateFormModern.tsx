/* eslint-disable react/no-unescaped-entities */

'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient, getSafeUser } from '@/lib/supabase/browser'
import { computePriority } from '@/lib/tickets/priority'
import { createTicket } from '../actions'
import { formatFileSize, uploadTicketAttachment, validateFile } from '@/lib/storage/attachments'
import {
  IT_ASSET_TYPES as BASE_IT_ASSET_TYPES,
  MAINTENANCE_ASSET_TYPES as BASE_MAINTENANCE_ASSET_TYPES,
} from '@/lib/tickets/ticket-asset-category'
import { formatAssetType } from '@/lib/assets/format'
import { applyLocationFilterToQuery, getLocationIdsForAssetFilter } from '@/lib/supabase/user-locations'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  HelpCircle,
  LayoutGrid,
  MoreVertical,
  Paperclip,
  Send,
  Shield,
  X,
} from 'lucide-react'

type CategoryRow = {
  id: string
  name: string
  parent_id: string | null
  sort_order?: number
}

type User = {
  id: string
  full_name: string | null
  location_name?: string | null
  location_code?: string | null
}

type Asset = {
  id: string
  asset_tag: string
  asset_type: string
  brand: string | null
  model: string | null
  status: string
  assigned_to: string | null
}

type ServiceArea = 'it' | 'maintenance'
type PriorityPreset = 'baja' | 'media' | 'alta' | 'critica'

const IT_ASSET_TYPES = [...BASE_IT_ASSET_TYPES, 'NETWORK_DEVICE', 'PERIPHERAL', 'NETWORK'] as const
const MAINTENANCE_ASSET_TYPES = [...BASE_MAINTENANCE_ASSET_TYPES] as const

export default function TicketCreateFormModern({
  categories: initialCategories,
  area,
}: {
  categories: CategoryRow[]
  area: ServiceArea
}) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryL1, setCategoryL1] = useState('')
  const [categoryL2, setCategoryL2] = useState('')
  const [categoryL3, setCategoryL3] = useState('')

  const [priorityPreset, setPriorityPreset] = useState<PriorityPreset>('media')
  const [impact, setImpact] = useState<number>(3)
  const [urgency, setUrgency] = useState<number>(3)

  const [attachments, setAttachments] = useState<File[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [assetId, setAssetId] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftTicketId, setDraftTicketId] = useState('...')

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('Usuario')
  const [displayLocation, setDisplayLocation] = useState('—')

  const [canCreateForOthers, setCanCreateForOthers] = useState(false)
  const [requesterId, setRequesterId] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])

  const [remoteConnectionType, setRemoteConnectionType] = useState<string>('')
  const [remoteConnectionId, setRemoteConnectionId] = useState<string>('')
  const [remoteConnectionPassword, setRemoteConnectionPassword] = useState<string>('')

  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [locations, setLocations] = useState<{ id: string; name: string; code: string }[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)

  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [categoryModalLevel, setCategoryModalLevel] = useState<1 | 2 | 3>(1)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)

  const accent = area === 'maintenance' ? 'orange' : 'indigo'

  useEffect(() => {
    setDraftTicketId(`TKT-${Math.floor(Math.random() * 8999) + 1000}`)
  }, [])

  useEffect(() => {
    const map: Record<PriorityPreset, { impact: number; urgency: number }> = {
      baja: { impact: 4, urgency: 4 },
      media: { impact: 3, urgency: 3 },
      alta: { impact: 2, urgency: 2 },
      critica: { impact: 1, urgency: 1 },
    }
    const next = map[priorityPreset]
    setImpact(next.impact)
    setUrgency(next.urgency)
  }, [priorityPreset])

  const priority = useMemo(() => computePriority({ impact, urgency }), [impact, urgency])

  const roots = useMemo(() => categories.filter((c) => c.parent_id === null), [categories])
  const l2Options = useMemo(() => categories.filter((c) => c.parent_id === categoryL1), [categories, categoryL1])
  const l3Options = useMemo(() => categories.filter((c) => c.parent_id === categoryL2), [categories, categoryL2])
  const selectedCategoryId = useMemo(() => {
    if (categoryL3) return categoryL3
    if (categoryL2) return categoryL2
    if (categoryL1) return categoryL1
    return null
  }, [categoryL1, categoryL2, categoryL3])

  useEffect(() => {
    async function loadUserAndRequesters() {
      const user = await getSafeUser(supabase)
      if (!user) return

      setCurrentUserId(user.id)
      setRequesterId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, location_id, asset_category, full_name')
        .eq('id', user.id)
        .single()

      setDisplayName(profile?.full_name || user.email?.split('@')[0] || 'Usuario')

      const locationId = (profile as any)?.location_id
      if (locationId) {
        const { data: location } = await supabase.from('locations').select('name, code').eq('id', locationId).maybeSingle()
        setDisplayLocation(location?.name || location?.code || '—')
        setSelectedLocationId(locationId)
      }

      // Detectar si es admin para habilitar selección de sede
      const adminCheck = profile?.role === 'admin'
      setIsAdmin(adminCheck)

      // Si es admin, cargar lista de sedes
      if (adminCheck) {
        setLoadingLocations(true)
        try {
          const { data: locationsList } = await supabase
            .from('locations')
            .select('id, name, code')
            .order('name', { ascending: true })
          
          setLocations(locationsList || [])
        } catch (err) {
          console.error('Error cargando sedes:', err)
        } finally {
          setLoadingLocations(false)
        }
      }

      // Align with server action: only admin or IT agents can create for others
      const allowedForOthers =
        !!profile &&
        (profile.role === 'admin' ||
          (area === 'it' && ['agent_l1', 'agent_l2', 'supervisor', 'corporate_admin'].includes(profile.role) && profile.asset_category === 'IT'))

      if (allowedForOthers) {
        setCanCreateForOthers(true)
        setLoadingUsers(true)
        setUsersError(null)

        try {
          const response = await fetch('/api/tickets/requesters')
          if (response.ok) {
            const data = await response.json()
            setUsers(
              (data.users ?? []).map((u: any) => ({
                id: u.id,
                full_name: u.full_name,
                location_name: u.location_name,
                location_code: u.location_code,
              }))
            )
          } else {
            const errorText = await response.text()
            setUsersError(`Error ${response.status}: ${errorText}`)
          }
        } catch (err: any) {
          console.error('Error cargando usuarios:', err)
          setUsersError(err?.message || 'Error de conexión al cargar usuarios')
        } finally {
          setLoadingUsers(false)
        }
      }
    }

    loadUserAndRequesters()
  }, [area, supabase])

  useEffect(() => {
    async function loadAssets() {
      if (!currentUserId) return

      const locationIds = await getLocationIdsForAssetFilter(supabase, currentUserId, 'ticket')
      let effectiveLocationIds = locationIds
      if (canCreateForOthers && requesterId && requesterId !== currentUserId) {
        const requesterLocationIds = await getLocationIdsForAssetFilter(supabase, requesterId, 'ticket')
        effectiveLocationIds = requesterLocationIds
      }

      if (effectiveLocationIds !== null && effectiveLocationIds.length === 0) {
        setAssets([])
        return
      }

      const candidates =
        area === 'it'
          ? [
              {
                tableName: 'assets_it',
                statusValues: ['ACTIVE', 'MAINTENANCE'],
                tagField: 'asset_code',
                assignedField: 'assigned_to_user_id',
                categoryField: 'category',
              },
              {
                tableName: 'assets',
                statusValues: ['OPERATIONAL', 'MAINTENANCE', 'ACTIVE'],
                tagField: 'asset_tag',
                assignedField: 'assigned_to',
                categoryField: 'asset_type',
              },
            ]
          : [
              {
                tableName: 'assets_maintenance',
                statusValues: ['ACTIVE', 'MAINTENANCE'],
                tagField: 'asset_code',
                assignedField: 'assigned_to_user_id',
                categoryField: 'category',
              },
            ]

      let tableName = candidates[0].tableName
      let statusValues = candidates[0].statusValues
      let tagField = candidates[0].tagField
      let assignedField = candidates[0].assignedField
      let categoryField = candidates[0].categoryField

      for (const c of candidates) {
        const probe = await supabase.from(c.tableName).select('id', { count: 'exact', head: true }).is('deleted_at', null)
        if ((probe.count ?? 0) > 0) {
          tableName = c.tableName
          statusValues = c.statusValues
          tagField = c.tagField
          assignedField = c.assignedField
          categoryField = c.categoryField
          break
        }
      }

      let query = supabase
        .from(tableName)
        .select(`id, ${tagField}, ${categoryField}, brand, model, status, ${assignedField}`)
        .is('deleted_at', null)
        .in('status', statusValues)
        .order(tagField, { ascending: true })

      query = applyLocationFilterToQuery(query, effectiveLocationIds)

      const { data: assetsData, error: assetsError } = await query
      if (assetsError) {
        console.error('[TicketCreateFormModern] Error cargando assets:', assetsError)
        setAssets([])
        return
      }

      let finalAssets: any[] = assetsData ?? []
      if (area === 'it') {
        const allowed = new Set<string>(IT_ASSET_TYPES as unknown as string[])
        finalAssets = finalAssets.filter((a: any) => allowed.has(String(a?.[categoryField] || '')))
      } else {
        const allowed = new Set<string>(MAINTENANCE_ASSET_TYPES as unknown as string[])
        finalAssets = finalAssets.filter((a: any) => allowed.has(String(a?.[categoryField] || '')))
      }

      setAssets(
        finalAssets.map((a: any) => ({
          id: a.id,
          asset_tag: a[tagField],
          asset_type: a[categoryField],
          brand: a.brand,
          model: a.model,
          status: a.status,
          assigned_to: a[assignedField],
        }))
      )
    }

    void loadAssets()
  }, [area, canCreateForOthers, currentUserId, requesterId, supabase])

  function initialsFromName(name: string | null | undefined): string {
    const clean = String(name || '').trim()
    if (!clean) return 'U'
    const parts = clean.split(/\s+/).filter(Boolean)
    const first = parts[0]?.[0] ?? 'U'
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1]
    return (first + (second ?? '')).toUpperCase()
  }

  function addFiles(files: File[]) {
    if (files.length === 0) return

    const nextFiles: File[] = []
    for (const file of files) {
      const validation = validateFile(file)
      if (!validation.valid) {
        setError(validation.error || 'Archivo inválido')
        continue
      }
      nextFiles.push(file)
    }

    setAttachments((prev) => {
      const combined = [...prev, ...nextFiles]
      return combined.slice(0, 5)
    })
  }

  function removeFile(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  async function createCategory() {
    if (!newCategoryName.trim()) return
    
    setSavingCategory(true)
    try {
      let parentId: string | null = null
      if (categoryModalLevel === 2) parentId = categoryL1
      if (categoryModalLevel === 3) parentId = categoryL2
      
      const { data, error } = await supabase
        .from('categories')
        .insert({ name: newCategoryName.trim(), parent_id: parentId })
        .select()
        .single()
      
      if (error) throw error
      
      // Refresh categories
      const { data: allCategories } = await supabase
        .from('categories')
        .select('id, name, parent_id, sort_order')
        .order('sort_order', { ascending: true })
      
      if (allCategories) setCategories(allCategories)
      
      // Auto-select the new category
      if (categoryModalLevel === 1) setCategoryL1(data.id)
      if (categoryModalLevel === 2) setCategoryL2(data.id)
      if (categoryModalLevel === 3) setCategoryL3(data.id)
      
      setNewCategoryName('')
      setShowCategoryModal(false)
    } catch (err: any) {
      console.error('Error creating category:', err)
      setError(err.message || 'Error al crear categoría')
    } finally {
      setSavingCategory(false)
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!selectedCategoryId) {
      setError('Debes seleccionar una categoría.')
      return
    }

    if (canCreateForOthers && !requesterId) {
      setError('Debes seleccionar un usuario solicitante.')
      return
    }

    if (isAdmin && !selectedLocationId) {
      setError('Debes seleccionar una sede para el ticket.')
      return
    }

    setBusy(true)
    try {
      const ticketInput = {
        title,
        description,
        service_area: area,
        category_id: selectedCategoryId,
        impact,
        urgency,
        priority,
        support_level: 1,
        requester_id: canCreateForOthers && requesterId ? requesterId : undefined,
        location_id: isAdmin && selectedLocationId ? selectedLocationId : undefined,
        asset_id: assetId || null,
        remote_connection_type: area === 'it' ? remoteConnectionType || null : null,
        remote_connection_id: area === 'it' ? remoteConnectionId || null : null,
        remote_connection_password: area === 'it' ? remoteConnectionPassword || null : null,
      }

      const result = await createTicket(ticketInput)
      if (result?.error) {
        setError(result.error)
        return
      }

      const ticketId = result?.ticketId
      if (!ticketId) {
        setError('Error creando ticket (sin id).')
        return
      }

      if (attachments.length > 0) {
        const uploadUserId = (canCreateForOthers && requesterId) || currentUserId
        if (uploadUserId) {
          const uploadResults = await Promise.all(attachments.map((f) => uploadTicketAttachment(ticketId, f, uploadUserId)))
          const failed = uploadResults.filter((r) => !r.success)
          if (failed.length > 0) {
            console.error('[TicketCreateFormModern] Algunos adjuntos fallaron:', failed)
          }
        }
      }

      router.push(`/tickets/${ticketId}?created=1`)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={
        accent === 'orange'
          ? 'h-dvh overflow-hidden bg-slate-50 text-slate-800 font-sans selection:bg-orange-100 selection:text-orange-900 flex justify-center p-4 md:p-6 lg:p-8'
          : 'h-dvh overflow-hidden bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex justify-center p-4 md:p-6 lg:p-8'
      }
    >
      <div className="w-full max-w-[1400px] h-full min-h-0 grid grid-rows-[auto,1fr] lg:grid-rows-1 lg:grid-cols-[18rem,1fr] gap-6">
        <aside className="w-full lg:w-auto flex flex-col gap-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium text-sm mb-2 px-1"
          >
            <ArrowLeft size={16} />
            Volver
          </button>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-12 h-12 rounded-full bg-gradient-to-tr ${
                  accent === 'orange' ? 'from-amber-500 to-orange-500' : 'from-indigo-500 to-purple-500'
                } p-[2px]`}
              >
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <span className={`${accent === 'orange' ? 'text-orange-600' : 'text-indigo-600'} font-bold text-sm`}>
                    {initialsFromName(displayName)}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">Sesión activa</p>
                <p className="text-xs text-slate-500 truncate">{displayLocation}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex gap-3 items-start">
                <Activity size={14} className={`${accent === 'orange' ? 'text-orange-500' : 'text-indigo-500'} mt-0.5`} />
                <div>
                  <p className="text-xs font-semibold text-slate-700">Consejo</p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Adjunta evidencia (capturas/logs) y describe pasos para reproducir.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-5 shadow-lg text-white relative overflow-hidden hidden lg:block flex-1 min-h-[200px]">
            <div
              className={`absolute top-0 right-0 w-32 h-32 ${
                accent === 'orange' ? 'bg-orange-500/20' : 'bg-indigo-500/20'
              } rounded-full blur-2xl -mr-10 -mt-10`}
            />
            <div
              className={`absolute bottom-0 left-0 w-24 h-24 ${
                accent === 'orange' ? 'bg-amber-500/20' : 'bg-purple-500/20'
              } rounded-full blur-2xl -ml-5 -mb-5`}
            />

            <HelpCircle size={28} className={`${accent === 'orange' ? 'text-orange-300' : 'text-indigo-400'} mb-4`} />
            <h4 className="font-bold text-base mb-2">Protocolo de Soporte</h4>
            <ul
              className={`text-xs text-slate-300 space-y-2 mb-4 leading-relaxed ${
                accent === 'orange' ? 'marker:text-orange-400' : 'marker:text-indigo-500'
              } list-disc pl-4`}
            >
              <li>Describe el problema y el impacto.</li>
              <li>Adjunta evidencia (logs/capturas).</li>
              <li>Usa prioridad CRÍTICA solo si afecta operación.</li>
            </ul>
            <button
              type="button"
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold transition-colors border border-white/10 backdrop-blur-sm"
            >
              Ver Guía
            </button>
          </div>
        </aside>

        <main className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden flex flex-col h-full min-h-0">
          <header className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 ${
                  accent === 'orange'
                    ? 'bg-orange-50 border-orange-100 text-orange-600'
                    : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                } rounded-lg border flex items-center justify-center shadow-sm`}
              >
                <FileText size={20} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  {area === 'maintenance' ? 'Nueva Solicitud (Tickets)' : 'Nueva Solicitud de Soporte IT'}
                </h1>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 hidden sm:block">Borrador</span>
              <button
                type="button"
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors hover:bg-slate-50 rounded-lg"
              >
                <MoreVertical size={20} />
              </button>
            </div>
          </header>

          <div className="flex-1 min-h-0 overflow-auto p-5 lg:p-6 bg-slate-50/30">
            <form id="ticket-create-form" onSubmit={onSubmit} className="h-full min-h-0 flex flex-col gap-5">
              <section className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm">
                <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                  <LayoutGrid size={18} className={accent === 'orange' ? 'text-orange-600' : 'text-indigo-600'} />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Información General</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Asunto del Ticket <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Resumen corto del incidente..."
                      className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white ${
                        accent === 'orange' ? 'focus:border-orange-500 focus:ring-orange-500/10' : 'focus:border-indigo-500 focus:ring-indigo-500/10'
                      } focus:ring-4 transition-all outline-none font-medium`}
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Categoría (L1)</label>
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryModalLevel(1)
                          setShowCategoryModal(true)
                        }}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                      >
                        <span className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">+</span>
                        Nueva
                      </button>
                    </div>
                    <div className="relative">
                      <select
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm transition-all outline-none appearance-none cursor-pointer font-medium text-slate-700 shadow-sm"
                        value={categoryL1}
                        onChange={(e) => {
                          setCategoryL1(e.target.value)
                          setCategoryL2('')
                          setCategoryL3('')
                        }}
                        required
                      >
                        <option value="">Selecciona…</option>
                        {roots.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Subcategoría (L2)</label>
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryModalLevel(2)
                          setShowCategoryModal(true)
                        }}
                        disabled={!categoryL1}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <span className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">+</span>
                        Nueva
                      </button>
                    </div>
                    <div className="relative">
                      <select
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm transition-all outline-none appearance-none cursor-pointer font-medium text-slate-700 shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
                        value={categoryL2}
                        onChange={(e) => {
                          setCategoryL2(e.target.value)
                          setCategoryL3('')
                        }}
                        disabled={!categoryL1}
                      >
                        <option value="">Selecciona…</option>
                        {l2Options.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Detalle (L3)</label>
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryModalLevel(3)
                          setShowCategoryModal(true)
                        }}
                        disabled={!categoryL2}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <span className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">+</span>
                        Nueva
                      </button>
                    </div>
                    <div className="relative">
                      <select
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm transition-all outline-none appearance-none cursor-pointer font-medium text-slate-700 shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
                        value={categoryL3}
                        onChange={(e) => setCategoryL3(e.target.value)}
                        disabled={!categoryL2}
                      >
                        <option value="">(Opcional)</option>
                        {l3Options.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                  </div>

                  {canCreateForOthers && (
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Solicitante <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm transition-all outline-none appearance-none cursor-pointer font-medium text-slate-700 shadow-sm"
                          value={requesterId}
                          onChange={(e) => setRequesterId(e.target.value)}
                          disabled={loadingUsers}
                          required
                        >
                          <option value="">Selecciona…</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name || u.id.substring(0, 8)}
                              {u.location_name ? ` — ${u.location_name}` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                      {usersError && <p className="text-xs text-red-600">{usersError}</p>}
                    </div>
                  )}

                  {isAdmin && (
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Sede del Ticket <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm transition-all outline-none appearance-none cursor-pointer font-medium text-slate-700 shadow-sm"
                          value={selectedLocationId}
                          onChange={(e) => setSelectedLocationId(e.target.value)}
                          disabled={loadingLocations}
                          required
                        >
                          <option value="">Selecciona sede…</option>
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name} ({loc.code})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                      {loadingLocations && <p className="text-xs text-slate-500">Cargando sedes...</p>}
                    </div>
                  )}
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm">
                  <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                    <Shield size={18} className={accent === 'orange' ? 'text-orange-600' : 'text-indigo-600'} />
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Detalles y Prioridad</h2>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 block">Nivel de Prioridad</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(
                          [
                            { id: 'baja', label: 'Baja', color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
                            { id: 'media', label: 'Media', color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
                            { id: 'alta', label: 'Alta', color: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' },
                            { id: 'critica', label: 'Crítica', color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' },
                          ] as const
                        ).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPriorityPreset(p.id)}
                            className={`relative px-2 py-3 rounded-lg border text-xs font-bold uppercase transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                              priorityPreset === p.id
                                ? `${p.color} ring-2 ring-offset-2 ring-offset-white ${
                                    accent === 'orange' ? 'ring-orange-200' : 'ring-indigo-200'
                                  }`
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-white'
                            }`}
                          >
                            {priorityPreset === p.id && <CheckCircle2 size={14} className="mb-0.5" />}
                            {p.label}
                          </button>
                        ))}
                      </div>

                      {priorityPreset === 'critica' && (
                        <div className="mt-3 flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-xs">
                          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                          <p>
                            <strong>Atención:</strong> Los tickets críticos activan alertas al equipo. Úsalo solo si afecta operación.
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Descripción Detallada</label>
                        <span className="text-[10px] text-slate-400 font-mono">MARKDOWN HABILITADO</span>
                      </div>
                      <textarea
                        className={`w-full min-h-[160px] lg:min-h-[180px] px-4 py-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white ${
                          accent === 'orange' ? 'focus:border-orange-500 focus:ring-orange-500/10' : 'focus:border-indigo-500 focus:ring-indigo-500/10'
                        } focus:ring-4 transition-all outline-none resize-none font-normal leading-relaxed`}
                        placeholder={'1. ¿Qué estabas haciendo cuando ocurrió?\n2. Mensajes de error (si aplica).\n3. ¿Es bloqueante?'}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Activo / Equipo (opcional)</label>
                        <div className="relative">
                          <select
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm transition-all outline-none appearance-none cursor-pointer font-medium text-slate-700 shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
                            value={assetId}
                            onChange={(e) => setAssetId(e.target.value)}
                            disabled={assets.length === 0}
                          >
                            <option value="">{assets.length === 0 ? 'Sin activos disponibles' : 'Ninguno'}</option>
                            {assets.map((asset) => (
                              <option key={asset.id} value={asset.id}>
                                {asset.asset_tag} — {formatAssetType(asset.asset_type)}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                      </div>

                      {area === 'it' && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Conexión Remota (opcional)</label>
                          <div className="relative">
                            <select
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm transition-all outline-none appearance-none cursor-pointer font-medium text-slate-700 shadow-sm"
                              value={remoteConnectionType}
                              onChange={(e) => {
                                setRemoteConnectionType(e.target.value)
                                if (!e.target.value) {
                                  setRemoteConnectionId('')
                                  setRemoteConnectionPassword('')
                                }
                              }}
                            >
                              <option value="">No usar</option>
                              <option value="rustdesk">RustDesk</option>
                              <option value="anydesk">AnyDesk</option>
                              <option value="teamviewer">TeamViewer</option>
                              <option value="chrome_remote">Chrome Remote</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                          </div>
                          {remoteConnectionType && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <input
                                type="text"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-medium"
                                value={remoteConnectionId}
                                onChange={(e) => setRemoteConnectionId(e.target.value)}
                                placeholder="ID"
                                required
                              />
                              <input
                                type="text"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-medium"
                                value={remoteConnectionPassword}
                                onChange={(e) => setRemoteConnectionPassword(e.target.value)}
                                placeholder="Password (opcional)"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm">
                  <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                    <Paperclip size={18} className={accent === 'orange' ? 'text-orange-600' : 'text-indigo-600'} />
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Evidencia</h2>
                  </div>

                  <div
                    className={`min-h-[160px] border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 transition-all p-4 flex flex-col items-center justify-center text-center cursor-pointer relative group ${
                      accent === 'orange'
                        ? 'hover:bg-orange-50/30 hover:border-orange-400'
                        : 'hover:bg-indigo-50/30 hover:border-indigo-400'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      addFiles(Array.from(e.dataTransfer.files || []))
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => addFiles(Array.from(e.target.files || []))}
                    />
                    <div className="w-14 h-14 bg-white rounded-full shadow-sm border border-slate-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                      <Paperclip
                        size={24}
                        className={
                          accent === 'orange'
                            ? 'text-slate-400 group-hover:text-orange-600'
                            : 'text-slate-400 group-hover:text-indigo-600'
                        }
                      />
                    </div>
                    <p className="text-sm font-bold text-slate-700 transition-colors">Subir Archivos</p>
                    <p className="text-xs text-slate-400 mt-2 max-w-[160px] mx-auto">Arrastra o haz clic (máx. 5)</p>
                  </div>

                  <div className="mt-4 space-y-2 overflow-y-auto max-h-[220px] pr-1">
                    {attachments.length === 0 && <div className="text-center py-4 text-xs text-slate-400 italic">Sin archivos adjuntos</div>}
                    {attachments.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className={`flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg group transition-colors ${
                          accent === 'orange' ? 'hover:border-orange-200' : 'hover:border-indigo-200'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 bg-white rounded border border-slate-200 flex items-center justify-center flex-shrink-0 ${
                            accent === 'orange' ? 'text-orange-600' : 'text-indigo-600'
                          }`}
                        >
                          <FileText size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 flex items-center gap-3">
                  <AlertTriangle size={18} className="flex-shrink-0" />
                  {error}
                </div>
              )}
            </form>
          </div>

          <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-between items-center z-20">
            <div className="text-xs text-slate-400 hidden sm:block">
              <span className="font-semibold text-slate-600">*</span> Campos obligatorios
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="ticket-create-form"
                disabled={busy}
                className={`flex-1 sm:flex-none px-8 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 ${
                  busy ? 'opacity-80 cursor-wait' : ''
                }`}
              >
                {busy ? (
                  'Enviando...'
                ) : (
                  <>
                    <span>Enviar Ticket</span> <Send size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Modal Crear Categoría */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCategoryModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                Nueva Categoría {categoryModalLevel === 1 ? '(Principal)' : categoryModalLevel === 2 ? '(Subcategoría)' : '(Detalle)'}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {categoryModalLevel === 1 && 'Categoría principal nivel 1'}
                {categoryModalLevel === 2 && `Subcategoría de: ${roots.find(r => r.id === categoryL1)?.name}`}
                {categoryModalLevel === 3 && `Detalle de: ${l2Options.find(l => l.id === categoryL2)?.name}`}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nombre de la Categoría <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createCategory()}
                  placeholder="Ej: Redes, Hardware, Software..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false)
                  setNewCategoryName('')
                }}
                disabled={savingCategory}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={createCategory}
                disabled={!newCategoryName.trim() || savingCategory}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingCategory ? 'Guardando...' : 'Crear Categoría'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
