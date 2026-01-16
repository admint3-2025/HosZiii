'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { isITAsset } from '@/lib/assets/asset-fields'
import { computePriority } from '@/lib/tickets/priority'
import { inferServiceAreaFromCategoryPath, type TicketServiceArea } from '@/lib/tickets/service-area'
import { createTicket } from '../actions'
import AttachmentUploader from '@/components/AttachmentUploader'
import { uploadTicketAttachment } from '@/lib/storage/attachments'
import ConfirmTicketModal from './ConfirmTicketModal'
import KBSuggestions from '@/components/KBSuggestions'

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
  assigned_to_name: string | null
  location_id?: string | null
  location_code?: string | null
  location_name?: string | null
}

type TicketCreateFormProps = {
  categories: CategoryRow[]
  initialServiceArea?: Exclude<TicketServiceArea, 'beo'>
  lockServiceArea?: boolean
}

// Colores por área de servicio
const areaThemes = {
  it: {
    primary: 'blue',
    accent: 'indigo',
    bgCard: 'from-blue-50 to-indigo-50',
    borderCard: 'border-blue-200',
    textPrimary: 'text-blue-900',
    textSecondary: 'text-blue-700',
    bgIcon: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  maintenance: {
    primary: 'amber',
    accent: 'orange',
    bgCard: 'from-amber-50 to-orange-50',
    borderCard: 'border-amber-200',
    textPrimary: 'text-amber-900',
    textSecondary: 'text-amber-700',
    bgIcon: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
} as const

export default function TicketCreateForm({
  categories: initialCategories,
  initialServiceArea,
  lockServiceArea,
}: TicketCreateFormProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [serviceArea, setServiceArea] = useState<'' | Exclude<TicketServiceArea, 'beo'>>('')
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
  const [isAdminOrSupervisor, setIsAdminOrSupervisor] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  
  // Asset selection (optional)
  const [assets, setAssets] = useState<Asset[]>([])
  const [assetId, setAssetId] = useState<string>('')
  const [assetsLoaded, setAssetsLoaded] = useState(false)
  const [assetsLoadError, setAssetsLoadError] = useState<string | null>(null)
  const [userLocationId, setUserLocationId] = useState<string | null>(null)
  const [userLocationIds, setUserLocationIds] = useState<string[]>([])
  
  // Modal states (category creation)
  const [showModal, setShowModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryLevel, setNewCategoryLevel] = useState<1 | 2 | 3>(1)
  const [creatingCategory, setCreatingCategory] = useState(false)
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  
  // Remote connection fields
  const [remoteConnectionType, setRemoteConnectionType] = useState<string>('')
  const [remoteConnectionId, setRemoteConnectionId] = useState<string>('')
  const [remoteConnectionPassword, setRemoteConnectionPassword] = useState<string>('')

  const priority = useMemo(() => computePriority({ impact, urgency }), [impact, urgency])

  useEffect(() => {
    if (!initialServiceArea) return
    setServiceArea(initialServiceArea)
  }, [initialServiceArea])

  // Load users and check if current user can create tickets for others
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      setCurrentUserId(user.id)
      setRequesterId(user.id) // Default to self

      // Check if user is agent/supervisor/admin and get location
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, location_id')
        .eq('id', user.id)
        .single()

      // Guardar location del usuario para filtrar activos de mantenimiento
      if (profile?.location_id) {
        setUserLocationId(profile.location_id)
      }

      // Admin puede ver todos los activos de todas las sedes
      if (profile?.role === 'admin') {
        setIsAdmin(true)
        setIsAdminOrSupervisor(true)
      }
      // Supervisor puede ver activos de sus sedes asignadas
      else if (profile?.role === 'supervisor') {
        setIsAdminOrSupervisor(true)
        // Obtener sedes asignadas al supervisor
        const { data: userLocs } = await supabase
          .from('user_locations')
          .select('location_id')
          .eq('user_id', user.id)
        
        const locationIds = userLocs?.map(ul => ul.location_id).filter(Boolean) || []
        if (profile.location_id && !locationIds.includes(profile.location_id)) {
          locationIds.push(profile.location_id)
        }
        setUserLocationIds(locationIds)
      }

      if (profile && ['agent_l1', 'agent_l2', 'supervisor', 'admin'].includes(profile.role)) {
        setCanCreateForOthers(true)
        setLoadingUsers(true)
        
        // Load users filtered by location (admin sees all, others see only their location)
        try {
          const response = await fetch('/api/tickets/requesters')
          if (response.ok) {
            const data = await response.json()
            setUsers(data.users.map((u: any) => ({
              id: u.id,
              full_name: u.full_name,
              location_name: u.location_name,
              location_code: u.location_code
            })))
            setUsersError(null)
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

      // Load available assets (only operational ones) with location info
      // Filtrar según área:
      // - IT: Solo activos asignados al usuario actual
      // - Mantenimiento: Todos los activos de la sede del usuario
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('id, asset_tag, asset_type, brand, model, status, assigned_to, location_id, asset_location:locations!location_id(code, name)')
        .is('deleted_at', null)
        .in('status', ['OPERATIONAL', 'MAINTENANCE'])
        .order('asset_tag', { ascending: true })

      if (assetsError) {
        console.error('Error cargando assets:', assetsError)
        setAssetsLoadError(assetsError.message)
        setAssetsLoaded(true)
        return
      }

      if (assetsData && assetsData.length > 0) {
        // Para cada asset con assigned_to, obtener el nombre del usuario
        const assetsWithNames = await Promise.all(
          assetsData.map(async (asset: any) => {
            let assigned_to_name = null
            if (asset.assigned_to) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', asset.assigned_to)
                .single()
              assigned_to_name = profile?.full_name || null
            }
            return {
              id: asset.id,
              asset_tag: asset.asset_tag,
              asset_type: asset.asset_type,
              brand: asset.brand,
              model: asset.model,
              status: asset.status,
              assigned_to: asset.assigned_to,
              assigned_to_name,
              location_id: asset.location_id,
              location_code: asset.asset_location?.code ?? null,
              location_name: asset.asset_location?.name ?? null,
            }
          })
        )
        setAssets(assetsWithNames)
      }

      setAssetsLoadError(null)
      setAssetsLoaded(true)
      // DEBUG: log loaded assets and user locations for troubleshooting asset filtering
      try {
        // eslint-disable-next-line no-console
        console.debug('[TicketCreateForm] userLocationId=', profile?.location_id, 'userLocationIds=', userLocationIds)
        // eslint-disable-next-line no-console
        console.debug('[TicketCreateForm] assetsLoaded count=', assetsData?.length, 'assets sample=', assetsWithNames?.slice(0,3))
      } catch (e) {
        // ignore
      }
    }
    loadData()
  }, [supabase])

  const rootServiceAreas = useMemo(() => {
    const areas = new Set<Exclude<TicketServiceArea, 'beo'>>()
    for (const category of categories) {
      if (category.parent_id !== null) continue

      const area = inferServiceAreaFromCategoryPath(category.name)
      if (area === 'beo') continue
      areas.add(area)
    }
    return areas
  }, [categories])

  useEffect(() => {
    if (serviceArea) return
    if (rootServiceAreas.size !== 1) return
    const [only] = Array.from(rootServiceAreas)
    setServiceArea(only)
  }, [rootServiceAreas, serviceArea])

  const roots = useMemo(() => {
    let filtered = categories.filter((c) => c.parent_id === null)

    if (serviceArea) {
      filtered = filtered.filter((c) => inferServiceAreaFromCategoryPath(c.name) === serviceArea)
    }

    // Eliminar duplicados por ID
    const seen = new Set<string>()
    return filtered.filter((c) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
  }, [categories, serviceArea])

  const hasRootsForSelectedArea = roots.length > 0

  // Filtrar activos según área de servicio y rol:
  // - Admin: Ve todos los activos de la categoría seleccionada (todas las sedes)
  // - Supervisor: Ve activos de la categoría seleccionada solo de sus sedes asignadas
  // - Usuario normal IT: Solo activos de IT asignados a él
  // - Usuario normal Mantenimiento: Activos de mantenimiento de su sede
  const filteredAssets = useMemo(() => {
    if (!serviceArea || !currentUserId) return []
    
    // Admin ve todos los activos del área seleccionada (todas las sedes)
    if (isAdmin) {
      if (serviceArea === 'it') {
        return assets.filter((a) => isITAsset(a.asset_type))
      }
      return assets.filter((a) => !isITAsset(a.asset_type))
    }
    
    // Supervisor ve activos del área seleccionada de sus sedes asignadas
    if (isAdminOrSupervisor && userLocationIds.length > 0) {
      if (serviceArea === 'it') {
        return assets.filter((a) => 
          isITAsset(a.asset_type) && a.location_id && userLocationIds.includes(a.location_id)
        )
      }
      return assets.filter((a) => 
        !isITAsset(a.asset_type) && a.location_id && userLocationIds.includes(a.location_id)
      )
    }
    
    // Usuarios normales tienen restricciones
    if (serviceArea === 'it') {
      // IT: Solo activos de IT asignados al usuario actual
      return assets.filter((a) => 
        isITAsset(a.asset_type) && a.assigned_to === currentUserId
      )
    }
    
    // Mantenimiento: Activos de mantenimiento de la sede del usuario
    if (!userLocationId) return []
    return assets.filter((a) => 
      !isITAsset(a.asset_type) && a.location_id === userLocationId
    )
  }, [assets, serviceArea, currentUserId, userLocationId, userLocationIds, isAdmin, isAdminOrSupervisor])

  // DEBUG: monitor filteredAssets changes to help reproduce issue where user sees assets from other sede
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.debug('[TicketCreateForm] filteredAssets count=', filteredAssets.length)
      // eslint-disable-next-line no-console
      console.debug('[TicketCreateForm] filteredAssets sample=', filteredAssets.slice(0,5).map(a => ({ id: a.id, asset_tag: a.asset_tag, location_id: a.location_id, location_name: a.location_name })))
      // eslint-disable-next-line no-console
      console.debug('[TicketCreateForm] flags: isAdmin=', isAdmin, 'isAdminOrSupervisor=', isAdminOrSupervisor, 'serviceArea=', serviceArea)
    } catch (e) {
      // ignore
    }
  }, [filteredAssets, isAdmin, isAdminOrSupervisor, serviceArea])

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

    if (!serviceArea) {
      setError('Debes seleccionar si el ticket es para IT o para Mantenimiento.')
      return
    }
    
    // Validar que si el usuario puede crear para otros, DEBE seleccionar un solicitante
    if (canCreateForOthers && !requesterId) {
      setError('Debes seleccionar un usuario solicitante. Para cumplir con trazabilidad ITIL, todos los tickets deben tener un solicitante y sede asociada.')
      return
    }
    
    // Mostrar modal de confirmación en lugar de crear directamente
    setShowConfirmModal(true)
  }

  async function handleConfirmCreate() {
    setBusy(true)

    console.log('[TicketCreateForm] 📋 Asset ID antes de enviar:', assetId)
    
    const ticketInput = {
      title,
      description,
      service_area: serviceArea || undefined,
      category_id: selectedCategoryId,
      impact,
      urgency,
      priority,
      support_level: 1,
      requester_id: canCreateForOthers && requesterId
        ? requesterId
        : undefined,
      asset_id: assetId || null,
      remote_connection_type: remoteConnectionType || null,
      remote_connection_id: remoteConnectionId || null,
      remote_connection_password: remoteConnectionPassword || null,
    }
    
    console.log('[TicketCreateForm] 📦 Datos completos a enviar:', JSON.stringify(ticketInput, null, 2))
    
    const result = await createTicket(ticketInput)

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
      setShowConfirmModal(false)
      router.push(`/tickets/${result.ticketId}`)
      router.refresh()
    }
  }

  // Función para obtener el nombre completo de la categoría
  function getCategoryFullName(): string {
    const parts: string[] = []
    
    if (categoryL1) {
      const cat1 = categories.find(c => c.id === categoryL1)
      if (cat1) parts.push(cat1.name)
    }
    
    if (categoryL2) {
      const cat2 = categories.find(c => c.id === categoryL2)
      if (cat2) parts.push(cat2.name)
    }
    
    if (categoryL3) {
      const cat3 = categories.find(c => c.id === categoryL3)
      if (cat3) parts.push(cat3.name)
    }
    
    return parts.join(' > ') || 'Sin categoría'
  }

  // Función para obtener el nombre del solicitante
  function getRequesterName(): string {
    if (canCreateForOthers && requesterId && requesterId !== currentUserId) {
      const user = users.find(u => u.id === requesterId)
      return user?.full_name || 'Usuario desconocido'
    }
    return 'Tú (solicitante actual)'
  }

  // Función para obtener info del activo
  function getAssetInfo(): string | null {
    if (!assetId) return null
    const asset = assets.find(a => a.id === assetId)
    if (!asset) return null
    
    const parts = [
      asset.asset_tag,
      asset.asset_type,
      asset.brand,
      asset.model
    ].filter(Boolean)
    
    return parts.join(' - ')
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

  function openPrefilledRootCategory(name: string) {
    setNewCategoryLevel(1)
    setNewCategoryName(name)
    setShowModal(true)
  }

  // Obtener tema actual según área seleccionada
  const currentTheme = serviceArea ? areaThemes[serviceArea] : null

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Card de categorías */}
        <div className="card shadow-lg border-0">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-2 rounded-lg ${currentTheme?.bgIcon || 'bg-purple-100'}`}>
                <svg className={`w-5 h-5 ${currentTheme?.iconColor || 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Categoría</h3>
                <p className="text-xs text-gray-600">Selección jerárquica de la categoría del ticket</p>
              </div>
            </div>

            {!lockServiceArea && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Área de servicio</label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Área de servicio">
                <button
                  type="button"
                  role="radio"
                  aria-checked={serviceArea === 'it'}
                  className={
                    `w-full rounded-lg border px-4 py-3 text-left transition ` +
                    (serviceArea === 'it'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50')
                  }
                  onClick={() => {
                    setServiceArea('it')
                    setCategoryL1('')
                    setCategoryL2('')
                    setCategoryL3('')
                    setAssetId('')
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-blue-100 p-2">
                      <svg className="h-5 w-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1-1h-1l2.25-3m3.75-2a3 3 0 10-6 0 3 3 0 006 0zm0 0a7.5 7.5 0 103.75 6.5" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">IT</div>
                      <div className="text-xs text-gray-600">Hardware, software, redes, accesos</div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={serviceArea === 'maintenance'}
                  className={
                    `w-full rounded-lg border px-4 py-3 text-left transition ` +
                    (serviceArea === 'maintenance'
                      ? 'border-orange-600 bg-orange-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50')
                  }
                  onClick={() => {
                    setServiceArea('maintenance')
                    setCategoryL1('')
                    setCategoryL2('')
                    setCategoryL3('')
                    setAssetId('')
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-orange-100 p-2">
                      <svg className="h-5 w-5 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 011.4 0l1.6 1.6a1 1 0 010 1.4l-7.9 7.9a2 2 0 01-1.1.6l-3.1.6.6-3.1a2 2 0 01.6-1.1l7.9-7.9z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Mantenimiento</div>
                      <div className="text-xs text-gray-600">Infraestructura, HVAC, plomería, electricidad</div>
                    </div>
                  </div>
                </button>
                </div>

                <p className="mt-2 text-xs text-gray-600">Primero elige el área; luego categoría y activo (si aplica).</p>

                {!!serviceArea && !hasRootsForSelectedArea && (
                  <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    No hay categorías configuradas para <span className="font-semibold">{serviceArea === 'maintenance' ? 'Mantenimiento' : 'IT'}</span>.
                    <span className="block">Un admin debe crear la categoría raíz y subcategorías (ej.: raíz “Mantenimiento”).</span>
                    {serviceArea === 'maintenance' && (
                      <div className="mt-2">
                        <button
                          type="button"
                          className="btn btn-xs"
                          onClick={() => openPrefilledRootCategory('Mantenimiento')}
                        >
                          Crear categoría raíz “Mantenimiento”
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
                disabled={!serviceArea}
                required={!!serviceArea}
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
                disabled={!serviceArea || !categoryL1 || l2Options.length === 0}
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
                disabled={!serviceArea || !categoryL2 || l3Options.length === 0}
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

        {/* Sugerencias de la Base de Conocimientos */}
        <KBSuggestions
          categoryLevel1={categoryL1}
          categoryLevel2={categoryL2}
          categoryLevel3={categoryL3}
        />

        {/* Selector de usuario (solo para agentes/supervisores/admin) */}
        {canCreateForOthers && (
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
              {loadingUsers ? (
                <div className="flex items-center justify-center py-4 text-sm text-gray-500">
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Cargando usuarios...
                </div>
              ) : usersError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <div className="font-semibold mb-1">Error al cargar usuarios</div>
                  <div className="text-xs">{usersError}</div>
                  <div className="text-xs mt-2 text-red-600">Verifica que la migración de ubicaciones esté ejecutada.</div>
                </div>
              ) : users.length === 0 ? (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
                  <div className="font-semibold mb-1">No hay usuarios disponibles</div>
                  <div className="text-xs">No se encontraron usuarios en tu ubicación. Contacta al administrador.</div>
                </div>
              ) : (
                <div>
                  <select
                    className="select w-full text-sm"
                    value={requesterId}
                    onChange={(e) => setRequesterId(e.target.value)}
                    required
                  >
                    <option value="">-- Seleccionar usuario solicitante (obligatorio) --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.id.substring(0, 8)}
                        {u.id === currentUserId ? ' (Yo)' : ''}
                        {u.location_code && u.location_name ? ` • ${u.location_code} - ${u.location_name}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-amber-700">
                    ⚠️ Campo obligatorio: Todo ticket debe tener un solicitante con sede asignada para cumplir con trazabilidad ITIL.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selector de activo (opcional) - con tema dinámico */}
        {
          <div className="card shadow-lg border-0 overflow-hidden">
            <div className={`bg-gradient-to-br ${serviceArea === 'it' ? 'from-blue-50 to-indigo-50 border-blue-200' : serviceArea === 'maintenance' ? 'from-amber-50 to-orange-50 border-amber-200' : 'from-emerald-50 to-teal-50 border-emerald-200'} border-b px-6 py-4`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${serviceArea === 'it' ? 'bg-blue-100' : serviceArea === 'maintenance' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                  <svg className={`w-5 h-5 ${serviceArea === 'it' ? 'text-blue-600' : serviceArea === 'maintenance' ? 'text-amber-600' : 'text-emerald-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <div>
                  <h3 className={`text-sm font-semibold uppercase tracking-wider ${serviceArea === 'it' ? 'text-blue-900' : serviceArea === 'maintenance' ? 'text-amber-900' : 'text-emerald-900'}`}>
                    Activo relacionado {isAdmin 
                      ? (serviceArea === 'it' ? '(IT - todas las sedes)' : serviceArea === 'maintenance' ? '(Mantenimiento - todas las sedes)' : '')
                      : isAdminOrSupervisor
                        ? (serviceArea === 'it' ? '(IT - tus sedes)' : serviceArea === 'maintenance' ? '(Mantenimiento - tus sedes)' : '')
                        : (serviceArea === 'it' ? '(IT - asignados a ti)' : serviceArea === 'maintenance' ? '(Mantenimiento - tu sede)' : '')}
                  </h3>
                  <p className={`text-xs ${serviceArea === 'it' ? 'text-blue-700' : serviceArea === 'maintenance' ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {isAdmin 
                      ? 'Como admin puedes seleccionar cualquier activo de cualquier sede'
                      : isAdminOrSupervisor 
                        ? 'Como supervisor puedes seleccionar activos de tus sedes asignadas'
                        : serviceArea === 'it' 
                          ? 'Solo tus equipos de cómputo asignados' 
                          : serviceArea === 'maintenance' 
                            ? 'Equipos de infraestructura de tu sede' 
                            : 'Selecciona un área para ver activos'}
                  </p>
                </div>
              </div>
            </div>
            <div className="card-body">
              {!assetsLoaded ? (
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  Cargando activos…
                </div>
              ) : assetsLoadError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  No se pudieron cargar activos: {assetsLoadError}
                </div>
              ) : !serviceArea ? (
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  Selecciona primero el área (IT / Mantenimiento) para ver activos disponibles.
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className={`rounded-md border px-3 py-2 text-sm ${serviceArea === 'it' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                  {isAdminOrSupervisor
                    ? `No hay activos de ${serviceArea === 'it' ? 'IT' : 'mantenimiento'} registrados en el sistema.`
                    : serviceArea === 'it' 
                      ? 'No tienes equipos de IT asignados. Si necesitas reportar un problema con un equipo, contacta a tu supervisor.'
                      : 'No hay activos de mantenimiento registrados en tu sede.'}
                </div>
              ) : (
                <select
                  className="select w-full text-sm"
                  name="assetId"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                >
                  <option value="">-- Ninguno --</option>
                  {filteredAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.asset_tag} - {asset.asset_type}
                      {asset.brand && ` ${asset.brand}`}
                      {asset.model && ` ${asset.model}`}
                      {asset.location_name && ` • ${asset.location_name}`}
                      {asset.assigned_to_name && ` | Asignado a: ${asset.assigned_to_name}`}
                      {asset.status === 'MAINTENANCE' && ' [En mantenimiento]'}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        }

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

        {/* Card de conexión remota */}
        <div className="card shadow-lg border-0">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Conexión remota</h3>
                <p className="text-xs text-gray-600">Información para asistencia remota (opcional)</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Tipo de conexión */}
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 block">
                  Tipo de conexión
                </label>
                <select
                  className="select text-sm"
                  value={remoteConnectionType}
                  onChange={(e) => {
                    setRemoteConnectionType(e.target.value)
                    // Limpiar campos si se deselecciona
                    if (!e.target.value) {
                      setRemoteConnectionId('')
                      setRemoteConnectionPassword('')
                    }
                  }}
                >
                  <option value="">No requiere conexión remota</option>
                  <option value="rustdesk">🖥️ RustDesk</option>
                  <option value="anydesk">🔵 AnyDesk</option>
                  <option value="teamviewer">🔴 TeamViewer</option>
                  <option value="chrome_remote">🌐 Chrome Remote Desktop</option>
                  <option value="otros">⚙️ Otros</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Selecciona el software de conexión remota que tienes instalado
                </p>
              </div>

              {/* ID de conexión - solo si se seleccionó un tipo */}
              {remoteConnectionType && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 block">
                      ID de conexión
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      className="input text-sm"
                      value={remoteConnectionId}
                      onChange={(e) => setRemoteConnectionId(e.target.value)}
                      placeholder="Ej: 123 456 789"
                      required={!!remoteConnectionType}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Proporciona el ID o código de acceso remoto
                    </p>
                  </div>

                  {/* Password - opcional */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 block">
                      Password (opcional)
                    </label>
                    <input
                      type="text"
                      className="input text-sm"
                      value={remoteConnectionPassword}
                      onChange={(e) => setRemoteConnectionPassword(e.target.value)}
                      placeholder="Si aplica, ingresa el password temporal"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Solo si tu software requiere password para conectar
                    </p>
                  </div>

                  <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 flex items-start gap-2">
                    <svg className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-xs text-cyan-800">
                      <p className="font-semibold mb-1">Esta información permite al técnico:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-cyan-700">
                        <li>Conectarse de forma remota para diagnóstico</li>
                        <li>Resolver el problema sin necesidad de visita presencial</li>
                        <li>Agilizar el tiempo de respuesta y solución</li>
                      </ul>
                    </div>
                  </div>
                </>
              )}
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

      {/* Modal de confirmación de ticket */}
      <ConfirmTicketModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmCreate}
        busy={busy}
        ticketData={{
          title,
          description,
          categoryName: getCategoryFullName(),
          impact,
          urgency,
          priority,
          requesterName: getRequesterName(),
          assetInfo: getAssetInfo(),
          attachmentsCount: attachments.length,
          remoteConnectionType,
          remoteConnectionId,
          remoteConnectionPassword,
        }}
      />
    </>
  )
}
