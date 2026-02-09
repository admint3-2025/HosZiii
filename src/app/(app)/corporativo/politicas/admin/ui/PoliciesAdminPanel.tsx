'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

interface PolicyCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string
  color: string
  sort_order: number
  is_active: boolean
}

interface Policy {
  id: string
  title: string
  summary: string | null
  content: string
  version: string
  status: string
  is_mandatory: boolean
  effective_date: string | null
  review_date: string | null
  attachment_url: string | null
  attachment_name: string | null
  category_id: string | null
  created_at: string
  category: PolicyCategory | null
}

interface Props {
  categories: PolicyCategory[]
  policies: Policy[]
  stats: {
    totalPolicies: number
    publishedPolicies: number
    totalAcknowledgments: number
    totalUsers: number
  }
}

export default function PoliciesAdminPanel({ categories, policies, stats }: Props) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [activeTab, setActiveTab] = useState<'policies' | 'categories'>('policies')
  const [showPolicyForm, setShowPolicyForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [editingCategory, setEditingCategory] = useState<PolicyCategory | null>(null)

  // Form state: política
  const [formTitle, setFormTitle] = useState('')
  const [formSummary, setFormSummary] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formVersion, setFormVersion] = useState('1.0')
  const [formStatus, setFormStatus] = useState('draft')
  const [formMandatory, setFormMandatory] = useState(false)
  const [formEffectiveDate, setFormEffectiveDate] = useState('')

  // Form state: categoría
  const [catName, setCatName] = useState('')
  const [catDescription, setCatDescription] = useState('')
  const [catIcon, setCatIcon] = useState('📋')
  const [catColor, setCatColor] = useState('#6366f1')

  const resetPolicyForm = () => {
    setFormTitle('')
    setFormSummary('')
    setFormContent('')
    setFormCategoryId('')
    setFormVersion('1.0')
    setFormStatus('draft')
    setFormMandatory(false)
    setFormEffectiveDate('')
    setEditingPolicy(null)
  }

  const resetCategoryForm = () => {
    setCatName('')
    setCatDescription('')
    setCatIcon('📋')
    setCatColor('#6366f1')
    setEditingCategory(null)
  }

  const openEditPolicy = (p: Policy) => {
    setEditingPolicy(p)
    setFormTitle(p.title)
    setFormSummary(p.summary || '')
    setFormContent(p.content)
    setFormCategoryId(p.category_id || '')
    setFormVersion(p.version)
    setFormStatus(p.status)
    setFormMandatory(p.is_mandatory)
    setFormEffectiveDate(p.effective_date || '')
    setShowPolicyForm(true)
  }

  const openEditCategory = (c: PolicyCategory) => {
    setEditingCategory(c)
    setCatName(c.name)
    setCatDescription(c.description || '')
    setCatIcon(c.icon)
    setCatColor(c.color)
    setShowCategoryForm(true)
  }

  const savePolicy = async () => {
    if (!formTitle.trim() || !formContent.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: formTitle.trim(),
        summary: formSummary.trim() || null,
        content: formContent,
        category_id: formCategoryId || null,
        version: formVersion,
        status: formStatus,
        is_mandatory: formMandatory,
        effective_date: formEffectiveDate || null,
      }

      if (editingPolicy) {
        await supabase.from('policies').update(payload).eq('id', editingPolicy.id)
      } else {
        await supabase.from('policies').insert(payload)
      }

      setShowPolicyForm(false)
      resetPolicyForm()
      router.refresh()
    } catch (err) {
      console.error('Error saving policy:', err)
    } finally {
      setSaving(false)
    }
  }

  const saveCategory = async () => {
    if (!catName.trim()) return
    setSaving(true)
    try {
      const slug = catName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const payload = {
        name: catName.trim(),
        slug,
        description: catDescription.trim() || null,
        icon: catIcon,
        color: catColor,
      }

      if (editingCategory) {
        await supabase.from('policy_categories').update(payload).eq('id', editingCategory.id)
      } else {
        await supabase.from('policy_categories').insert(payload)
      }

      setShowCategoryForm(false)
      resetCategoryForm()
      router.refresh()
    } catch (err) {
      console.error('Error saving category:', err)
    } finally {
      setSaving(false)
    }
  }

  const deletePolicy = async (id: string) => {
    if (!confirm('¿Eliminar esta política?')) return
    await supabase.from('policies').delete().eq('id', id)
    router.refresh()
  }

  const togglePolicyStatus = async (p: Policy) => {
    const newStatus = p.status === 'published' ? 'draft' : 'published'
    await supabase.from('policies').update({ status: newStatus }).eq('id', p.id)
    router.refresh()
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-600',
      published: 'bg-emerald-100 text-emerald-700',
      archived: 'bg-amber-100 text-amber-700',
    }
    const labels: Record<string, string> = {
      draft: 'Borrador',
      published: 'Publicada',
      archived: 'Archivada',
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${map[status] || 'bg-slate-100 text-slate-600'}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <span className="text-3xl">📜</span>
            Gestión de Políticas y Estándares
          </h1>
          <p className="text-sm text-slate-500 mt-1">Crea, edita y publica políticas organizacionales.</p>
        </div>
        <a href="/politicas" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          ← Ver como usuario
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{stats.totalPolicies}</div>
          <div className="text-xs text-slate-500 mt-1">Total Políticas</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-emerald-600">{stats.publishedPolicies}</div>
          <div className="text-xs text-slate-500 mt-1">Publicadas</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-indigo-600">{stats.totalAcknowledgments}</div>
          <div className="text-xs text-slate-500 mt-1">Lecturas Confirmadas</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-600">{stats.totalUsers}</div>
          <div className="text-xs text-slate-500 mt-1">Usuarios Totales</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'policies' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Políticas ({policies.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'categories' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Categorías ({categories.length})
        </button>
      </div>

      {/* Tab: Políticas */}
      {activeTab === 'policies' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => { resetPolicyForm(); setShowPolicyForm(true) }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              + Nueva Política
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left p-4 font-semibold text-slate-600">Título</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Categoría</th>
                  <th className="text-center p-4 font-semibold text-slate-600">Estado</th>
                  <th className="text-center p-4 font-semibold text-slate-600">Versión</th>
                  <th className="text-center p-4 font-semibold text-slate-600">Obligatoria</th>
                  <th className="text-right p-4 font-semibold text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {policies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-400">
                      No hay políticas. Crea una nueva.
                    </td>
                  </tr>
                ) : (
                  policies.map(p => (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="p-4">
                        <div className="font-medium text-slate-900">{p.title}</div>
                        {p.summary && <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{p.summary}</div>}
                      </td>
                      <td className="p-4">
                        {p.category ? (
                          <span className="text-xs">{p.category.icon} {p.category.name}</span>
                        ) : (
                          <span className="text-xs text-slate-400">Sin categoría</span>
                        )}
                      </td>
                      <td className="p-4 text-center">{statusBadge(p.status)}</td>
                      <td className="p-4 text-center text-xs text-slate-500">v{p.version}</td>
                      <td className="p-4 text-center">
                        {p.is_mandatory ? (
                          <span className="text-amber-500 font-bold">⚠️</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => togglePolicyStatus(p)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                              p.status === 'published'
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }`}
                          >
                            {p.status === 'published' ? 'Despublicar' : 'Publicar'}
                          </button>
                          <button
                            onClick={() => openEditPolicy(p)}
                            className="px-3 py-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg text-xs font-medium transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deletePolicy(p.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-medium transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Categorías */}
      {activeTab === 'categories' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => { resetCategoryForm(); setShowCategoryForm(true) }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              + Nueva Categoría
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <h3 className="font-semibold text-slate-900">{cat.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{cat.description || 'Sin descripción'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openEditCategory(cat)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Editar
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs text-slate-400">Orden: {cat.sort_order}</span>
                  <span className={`text-xs ${cat.is_active ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {cat.is_active ? '● Activa' : '○ Inactiva'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Form Política */}
      {showPolicyForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowPolicyForm(false); resetPolicyForm() }} />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden mb-16">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">
                {editingPolicy ? 'Editar Política' : 'Nueva Política'}
              </h2>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Política de Uso de Equipos Informáticos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Resumen</label>
                <input
                  type="text"
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Breve descripción de la política"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Versión</label>
                  <input
                    type="text"
                    value={formVersion}
                    onChange={(e) => setFormVersion(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="draft">Borrador</option>
                    <option value="published">Publicada</option>
                    <option value="archived">Archivada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Vigencia</label>
                  <input
                    type="date"
                    value={formEffectiveDate}
                    onChange={(e) => setFormEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={formMandatory}
                  onChange={(e) => setFormMandatory(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Lectura obligatoria para todos los usuarios
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contenido *</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="Escribe el contenido de la política. Puedes usar saltos de línea para formatear."
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => { setShowPolicyForm(false); resetPolicyForm() }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={savePolicy}
                disabled={saving || !formTitle.trim() || !formContent.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {saving ? 'Guardando...' : editingPolicy ? 'Actualizar' : 'Crear Política'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Form Categoría */}
      {showCategoryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowCategoryForm(false); resetCategoryForm() }} />
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Seguridad e Higiene"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Icono</label>
                  <input
                    type="text"
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-center text-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => { setShowCategoryForm(false); resetCategoryForm() }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveCategory}
                disabled={saving || !catName.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {saving ? 'Guardando...' : editingCategory ? 'Actualizar' : 'Crear Categoría'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
