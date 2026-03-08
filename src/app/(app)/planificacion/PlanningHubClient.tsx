'use client'

import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRight,
  Bed,
  Calculator,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Coffee,
  DollarSign,
  FileText,
  Filter,
  Megaphone,
  Monitor,
  Plus,
  Printer,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import type { UserPlanningProfile } from './page'

type Props = {
  userProfile: UserPlanningProfile
  initialYear: number
}

type DepartmentDef = {
  id: number
  name: string
  key: string
  icon: LucideIcon
  color: string
  soft: string
  border: string
  desc: string
}

type ScheduleStatus = 'pending' | 'in_progress' | 'completed'

type ScheduleEntry = {
  status: ScheduleStatus
  budget: number
}

type PlanningItem = {
  id: number
  deptId: number
  category: string
  name: string
  provider: string
  aging: number
  lastDate: string
  baseCost: number
  schedules: Record<number, ScheduleEntry>
}

type DashboardViewProps = {
  departments: DepartmentDef[]
  items: PlanningItem[]
  year: number
  onSelectDept: (deptId: number) => void
}

type PlanningViewProps = {
  departments: DepartmentDef[]
  selectedDept: number
  setSelectedDept: (deptId: number) => void
  canChangeDepartment: boolean
  year: number
  setYear: (year: number) => void
  items: PlanningItem[]
  setItems: Dispatch<SetStateAction<PlanningItem[]>>
  onBack: () => void
}

type ReportDocumentViewProps = {
  deptName: string
  items: PlanningItem[]
  year: number
  onClose: () => void
}

type NewItemForm = {
  name: string
  category: string
  provider: string
  aging: number
  baseCost: string
  startDate: string
}

const DEPARTMENTS: DepartmentDef[] = [
  {
    id: 1,
    name: 'Recursos Humanos',
    key: 'RECURSOS HUMANOS',
    icon: Users,
    color: 'text-blue-700',
    soft: 'bg-blue-50',
    border: 'border-blue-200',
    desc: 'Capacitacion, clima laboral, contratos y cumplimiento interno',
  },
  {
    id: 2,
    name: 'GSH',
    key: 'GSH',
    icon: Shield,
    color: 'text-emerald-700',
    soft: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: 'Seguridad, sustentabilidad, brigadas y control normativo',
  },
  {
    id: 3,
    name: 'Div. Cuartos',
    key: 'DIV. CUARTOS',
    icon: Bed,
    color: 'text-indigo-700',
    soft: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: 'Operacion de habitaciones, blancos y suministros criticos',
  },
  {
    id: 4,
    name: 'Mantenimiento',
    key: 'MANTENIMIENTO',
    icon: Wrench,
    color: 'text-orange-700',
    soft: 'bg-orange-50',
    border: 'border-orange-200',
    desc: 'Preventivos, elevadores, planta de luz, cuartos tecnicos y contratos',
  },
  {
    id: 5,
    name: 'Sistemas',
    key: 'SISTEMAS',
    icon: Monitor,
    color: 'text-cyan-700',
    soft: 'bg-cyan-50',
    border: 'border-cyan-200',
    desc: 'Licencias, servidores, redes, CCTV y equipo de usuario final',
  },
  {
    id: 6,
    name: 'Alimentos y Bebidas',
    key: 'ALIMENTOS Y BEBIDAS',
    icon: Coffee,
    color: 'text-red-700',
    soft: 'bg-red-50',
    border: 'border-red-200',
    desc: 'Fumigaciones, trampas de grasa, loza y cocina caliente',
  },
  {
    id: 7,
    name: 'Ama de Llaves',
    key: 'AMA DE LLAVES',
    icon: Sparkles,
    color: 'text-purple-700',
    soft: 'bg-purple-50',
    border: 'border-purple-200',
    desc: 'Limpieza profunda, alfombras, colchones y habitaciones fuera de servicio',
  },
  {
    id: 8,
    name: 'Contabilidad',
    key: 'CONTABILIDAD',
    icon: Calculator,
    color: 'text-teal-700',
    soft: 'bg-teal-50',
    border: 'border-teal-200',
    desc: 'Auditorias, cierres, obligaciones fiscales y reportes regulatorios',
  },
  {
    id: 9,
    name: 'Marketing',
    key: 'MARKETING',
    icon: Megaphone,
    color: 'text-pink-700',
    soft: 'bg-pink-50',
    border: 'border-pink-200',
    desc: 'Campanas, agencia, pauta digital y calendario comercial',
  },
]

const INITIAL_MOCK_DATA: PlanningItem[] = [
  {
    id: 101,
    deptId: 4,
    category: 'ELEVADORES',
    name: 'ELEVADORES PRINCIPALES',
    provider: 'GRUPO MI',
    aging: 3,
    lastDate: '2025-10-15',
    baseCost: 19008,
    schedules: {
      1: { status: 'completed', budget: 19008 },
      4: { status: 'pending', budget: 19008 },
      7: { status: 'pending', budget: 19008 },
      10: { status: 'pending', budget: 19008 },
    },
  },
  {
    id: 102,
    deptId: 4,
    category: 'EQUIPO CONTRA INCENDIO',
    name: 'SISTEMA CONTRA INCENDIOS',
    provider: 'GRUPO MI',
    aging: 6,
    lastDate: '2025-07-01',
    baseCost: 12100,
    schedules: {
      1: { status: 'completed', budget: 12100 },
      7: { status: 'pending', budget: 24000 },
    },
  },
  {
    id: 103,
    deptId: 4,
    category: 'MAQUINARIA Y EQUIPO',
    name: 'CAMARAS DE CONGELACION',
    provider: 'CLIMAS FRIOS DE JALISCO',
    aging: 1,
    lastDate: '2025-12-31',
    baseCost: 7000,
    schedules: {
      3: { status: 'pending', budget: 20000 },
      4: { status: 'pending', budget: 7000 },
      5: { status: 'pending', budget: 7000 },
      7: { status: 'pending', budget: 7000 },
      8: { status: 'pending', budget: 7000 },
    },
  },
  {
    id: 104,
    deptId: 4,
    category: 'PLANTA DE LUZ',
    name: 'SERVICIO MAYOR DE GENERADOR',
    provider: 'POWER PRIME',
    aging: 12,
    lastDate: '2025-02-10',
    baseCost: 38000,
    schedules: {
      2: { status: 'completed', budget: 38000 },
    },
  },
  {
    id: 201,
    deptId: 1,
    category: 'CAPACITACION',
    name: 'LIDERAZGO GERENCIAL',
    provider: 'CONSULTORIA HR',
    aging: 12,
    lastDate: '2025-05-15',
    baseCost: 45000,
    schedules: {
      5: { status: 'pending', budget: 45000 },
    },
  },
  {
    id: 202,
    deptId: 1,
    category: 'NORMATIVIDAD',
    name: 'RENOVACION DE EXPEDIENTES LABORALES',
    provider: 'INTERNO',
    aging: 6,
    lastDate: '2025-12-01',
    baseCost: 12000,
    schedules: {
      6: { status: 'pending', budget: 12000 },
      12: { status: 'pending', budget: 12000 },
    },
  },
  {
    id: 301,
    deptId: 5,
    category: 'LICENCIAS',
    name: 'MICROSOFT 365',
    provider: 'MICROSOFT',
    aging: 12,
    lastDate: '2025-01-20',
    baseCost: 120000,
    schedules: {
      1: { status: 'completed', budget: 125000 },
    },
  },
  {
    id: 302,
    deptId: 5,
    category: 'INFRAESTRUCTURA',
    name: 'RENOVACION DE FIREWALL',
    provider: 'FORTINET PARTNER',
    aging: 12,
    lastDate: '2025-09-01',
    baseCost: 86000,
    schedules: {
      9: { status: 'pending', budget: 86000 },
    },
  },
  {
    id: 401,
    deptId: 6,
    category: 'SANIDAD',
    name: 'FUMIGACION DE COCINAS',
    provider: 'ECOCONTROL',
    aging: 1,
    lastDate: '2025-12-15',
    baseCost: 3500,
    schedules: {
      1: { status: 'completed', budget: 3500 },
      2: { status: 'pending', budget: 3500 },
      3: { status: 'pending', budget: 3500 },
      4: { status: 'pending', budget: 3500 },
    },
  },
  {
    id: 501,
    deptId: 7,
    category: 'LIMPIEZA PROFUNDA',
    name: 'LAVADO DE ALFOMBRAS',
    provider: 'AQUA CLEAN',
    aging: 4,
    lastDate: '2025-11-05',
    baseCost: 28000,
    schedules: {
      3: { status: 'pending', budget: 28000 },
      7: { status: 'pending', budget: 28000 },
      11: { status: 'pending', budget: 28000 },
    },
  },
  {
    id: 601,
    deptId: 2,
    category: 'SEGURIDAD',
    name: 'SIMULACRO DE EVACUACION',
    provider: 'INTERNO',
    aging: 6,
    lastDate: '2025-08-12',
    baseCost: 10000,
    schedules: {
      2: { status: 'pending', budget: 10000 },
      8: { status: 'pending', budget: 10000 },
    },
  },
  {
    id: 701,
    deptId: 8,
    category: 'FISCAL',
    name: 'REVISION DE OBLIGACIONES ANUALES',
    provider: 'DESPACHO CONTABLE',
    aging: 12,
    lastDate: '2025-03-30',
    baseCost: 52000,
    schedules: {
      3: { status: 'pending', budget: 52000 },
    },
  },
  {
    id: 801,
    deptId: 9,
    category: 'CAMPANAS',
    name: 'TEMPORADA VERANO DIGITAL',
    provider: 'AGENCIA ORBITA',
    aging: 3,
    lastDate: '2025-12-01',
    baseCost: 34000,
    schedules: {
      3: { status: 'pending', budget: 34000 },
      6: { status: 'pending', budget: 34000 },
      9: { status: 'pending', budget: 34000 },
      12: { status: 'pending', budget: 34000 },
    },
  },
]

const MONTHS = ['ENE', 'FEB', 'MZO', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEPT', 'OCT', 'NOV', 'DIC']

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toUpperCase()
}

function calculateNextInterventions(lastDateStr: string, agingMonths: number, targetYear: number) {
  if (!lastDateStr || !agingMonths) return []

  const lastDate = new Date(lastDateStr)
  const nextDate = new Date(lastDate)
  const interventions: number[] = []

  while (nextDate.getFullYear() <= targetYear) {
    nextDate.setMonth(nextDate.getMonth() + agingMonths)
    if (nextDate.getFullYear() === targetYear) {
      interventions.push(nextDate.getMonth() + 1)
    }
  }

  return interventions
}

function formatCurrency(amount: number) {
  if (!amount) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function getStatusMeta(status: ScheduleStatus) {
  switch (status) {
    case 'completed':
      return {
        icon: CheckCircle2,
        iconClass: 'text-emerald-600',
        badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        label: 'Completo',
      }
    case 'in_progress':
      return {
        icon: RefreshCw,
        iconClass: 'text-sky-600',
        badgeClass: 'bg-sky-100 text-sky-700 border-sky-200',
        label: 'En proceso',
      }
    default:
      return {
        icon: Clock,
        iconClass: 'text-amber-600',
        badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
        label: 'Pendiente',
      }
  }
}

function cycleStatus(status: ScheduleStatus): ScheduleStatus {
  if (status === 'pending') return 'in_progress'
  if (status === 'in_progress') return 'completed'
  return 'pending'
}

function resolveDepartments(profile: UserPlanningProfile) {
  if (profile.isAdmin || profile.isCorporate) return DEPARTMENTS

  const allowed = new Set<string>()
  if (profile.departamento) allowed.add(normalize(profile.departamento))
  for (const dept of profile.allowed_departments ?? []) {
    allowed.add(normalize(dept))
  }

  const filtered = DEPARTMENTS.filter((dept) => allowed.has(normalize(dept.key)) || allowed.has(normalize(dept.name)))
  return filtered.length > 0 ? filtered : [DEPARTMENTS[3]]
}

function DashboardView({ departments, items, year, onSelectDept }: DashboardViewProps) {
  const statsByDept = useMemo(() => {
    return departments.map((dept) => {
      const deptItems = items.filter((item) => item.deptId === dept.id)
      const annualBudget = deptItems.reduce(
        (sum, item) => sum + Object.values(item.schedules).reduce((local, schedule) => local + schedule.budget, 0),
        0,
      )
      const plannedInterventions = deptItems.reduce((sum, item) => sum + Object.keys(item.schedules).length, 0)
      const pendingCount = deptItems.reduce(
        (sum, item) =>
          sum + Object.values(item.schedules).filter((schedule) => schedule.status !== 'completed').length,
        0,
      )

      return {
        dept,
        itemCount: deptItems.length,
        annualBudget,
        plannedInterventions,
        pendingCount,
      }
    })
  }, [departments, items])

  const totalBudget = statsByDept.reduce((sum, dept) => sum + dept.annualBudget, 0)
  const totalInterventions = statsByDept.reduce((sum, dept) => sum + dept.plannedInterventions, 0)

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-white via-sky-50 to-cyan-50 p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              <CalendarDays className="h-4 w-4" />
              Planificacion anual corporativa
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900">
              Tablero maestro por departamentos
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Administra el plan anual por area, calcula aging, distribuye presupuesto por mes y prepara el
              documento de trabajo para revision y autorizacion.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryCard title="Anio activo" value={String(year)} icon={Calendar} />
            <SummaryCard title="Intervenciones" value={String(totalInterventions)} icon={Settings} />
            <SummaryCard title="Presupuesto" value={formatCurrency(totalBudget)} icon={DollarSign} wide />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {statsByDept.map(({ dept, itemCount, annualBudget, plannedInterventions, pendingCount }) => {
          const Icon = dept.icon
          return (
            <button
              key={dept.id}
              type="button"
              onClick={() => onSelectDept(dept.id)}
              className={`group rounded-2xl border ${dept.border} bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className={`rounded-2xl ${dept.soft} p-4 ${dept.color}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <div className="rounded-full border border-slate-200 p-2 text-slate-400 transition-colors group-hover:border-sky-200 group-hover:text-sky-700">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-5">
                <h2 className="text-xl font-bold text-slate-900">{dept.name}</h2>
                <p className="mt-2 min-h-[44px] text-sm leading-5 text-slate-500">{dept.desc}</p>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <MiniMetric label="Items" value={String(itemCount)} />
                <MiniMetric label="Eventos" value={String(plannedInterventions)} />
                <MiniMetric label="Pend" value={String(pendingCount)} />
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Presupuesto anual</p>
                  <p className="mt-1 text-lg font-black text-slate-900">{formatCurrency(annualBudget)}</p>
                </div>
                <span className="text-sm font-semibold text-sky-700">Abrir matriz</span>
              </div>
            </button>
          )
        })}
      </section>
    </div>
  )
}

function PlanningView({
  departments,
  selectedDept,
  setSelectedDept,
  canChangeDepartment,
  year,
  setYear,
  items,
  setItems,
  onBack,
}: PlanningViewProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [newItem, setNewItem] = useState<NewItemForm>({
    name: '',
    category: '',
    provider: '',
    aging: 1,
    baseCost: '',
    startDate: '',
  })

  const activeDept = departments.find((dept) => dept.id === selectedDept) ?? departments[0]
  const DeptIcon = activeDept?.icon ?? Calendar

  const departmentItems = useMemo(() => items.filter((item) => item.deptId === selectedDept), [items, selectedDept])

  const filteredItems = useMemo(() => {
    return departmentItems.filter((item) => {
      const matchesSearch =
        search.length === 0 ||
        item.name.includes(search.toUpperCase()) ||
        item.category.includes(search.toUpperCase()) ||
        item.provider.includes(search.toUpperCase())
      const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [categoryFilter, departmentItems, search])

  const groupedItems = useMemo(() => {
    return filteredItems.reduce<Record<string, PlanningItem[]>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    }, {})
  }, [filteredItems])

  useEffect(() => {
    const initialState: Record<string, boolean> = {}
    for (const category of Object.keys(groupedItems)) {
      initialState[category] = true
    }
    setExpandedCategories(initialState)
  }, [groupedItems])

  const currentCategories = useMemo(
    () => Array.from(new Set(departmentItems.map((item) => item.category))).sort(),
    [departmentItems],
  )

  const globalTotal = useMemo(() => {
    return departmentItems.reduce(
      (sum, item) => sum + Object.values(item.schedules).reduce((local, schedule) => local + schedule.budget, 0),
      0,
    )
  }, [departmentItems])

  const totalRows = departmentItems.length
  const totalInterventions = departmentItems.reduce((sum, item) => sum + Object.keys(item.schedules).length, 0)
  const completedInterventions = departmentItems.reduce(
    (sum, item) => sum + Object.values(item.schedules).filter((schedule) => schedule.status === 'completed').length,
    0,
  )

  const monthlyTotals = useMemo(() => {
    const totals: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
      9: 0,
      10: 0,
      11: 0,
      12: 0,
    }

    for (const item of departmentItems) {
      for (const [month, schedule] of Object.entries(item.schedules)) {
        totals[Number(month)] += schedule.budget
      }
    }

    return totals
  }, [departmentItems])

  const topMonths = useMemo(() => {
    return Object.entries(monthlyTotals)
      .map(([month, total]) => ({ month: Number(month), total }))
      .filter((entry) => entry.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 4)
  }, [monthlyTotals])

  const categoryRollup = useMemo(() => {
    return Object.entries(groupedItems)
      .map(([category, categoryItems]) => ({
        category,
        total: categoryItems.reduce(
          (sum, item) => sum + Object.values(item.schedules).reduce((local, schedule) => local + schedule.budget, 0),
          0,
        ),
        rows: categoryItems.length,
      }))
      .sort((a, b) => b.total - a.total)
  }, [groupedItems])

  function toggleCategory(category: string) {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }))
  }

  function handleAutoSchedule() {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.deptId !== selectedDept) return item

        const newSchedules = { ...item.schedules }
        const projectedMonths = calculateNextInterventions(item.lastDate, item.aging, year)

        for (const month of projectedMonths) {
          if (!newSchedules[month]) {
            newSchedules[month] = { status: 'pending', budget: item.baseCost }
          }
        }

        return { ...item, schedules: newSchedules }
      }),
    )
  }

  function handleAddItem(e: FormEvent) {
    e.preventDefault()

    const id = Math.max(0, ...items.map((item) => item.id)) + 1
    const created: PlanningItem = {
      id,
      deptId: selectedDept,
      category: (newItem.category || 'GENERAL').toUpperCase(),
      name: newItem.name.toUpperCase(),
      provider: (newItem.provider || 'POR DEFINIR').toUpperCase(),
      aging: Number(newItem.aging) || 1,
      lastDate: newItem.startDate,
      baseCost: Number(newItem.baseCost) || 0,
      schedules: {},
    }

    if (newItem.startDate) {
      const [yyyy, mm] = newItem.startDate.split('-')
      if (Number(yyyy) === year) {
        created.schedules[Number(mm)] = { status: 'pending', budget: created.baseCost }
      }
    }

    setItems((prev) => [...prev, created])
    setIsModalOpen(false)
    setNewItem({ name: '', category: '', provider: '', aging: 1, baseCost: '', startDate: '' })
  }

  function updateMonth(itemId: number, month: number) {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== itemId) return item

        const current = item.schedules[month]
        if (!current) {
          return {
            ...item,
            schedules: {
              ...item.schedules,
              [month]: { status: 'pending', budget: item.baseCost },
            },
          }
        }

        return {
          ...item,
          schedules: {
            ...item.schedules,
            [month]: {
              ...current,
              status: cycleStatus(current.status),
            },
          },
        }
      }),
    )
  }

  return (
    <div className="space-y-6">
      {isReportOpen ? (
        <ReportDocumentView
          deptName={activeDept.name.toUpperCase()}
          items={departmentItems}
          year={year}
          onClose={() => setIsReportOpen(false)}
        />
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-slate-200 bg-white p-3 text-slate-500 transition-colors hover:border-sky-200 hover:text-sky-700"
              title="Volver al tablero"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                <DeptIcon className="h-4 w-4" />
                Planeacion operativa por departamento
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                Plan {year}: {activeDept.name}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Consolida mantenimientos, capacitaciones, obligaciones y contratos del area en una sola matriz anual.
                Puedes recalcular aging, registrar nuevos rubros y preparar el documento de trabajo para impresion.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[420px]">
            <ControlCard icon={Filter} title="Departamento">
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                value={selectedDept}
                onChange={(e) => setSelectedDept(Number(e.target.value))}
                disabled={!canChangeDepartment}
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </ControlCard>

            <ControlCard icon={Calendar} title="Anio de planeacion">
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {[2025, 2026, 2027, 2028].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </ControlCard>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleAutoSchedule}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Settings className="h-4 w-4" />
            Calcular aging
          </button>
          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            <FileText className="h-4 w-4" />
            Generar reporte
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
          >
            <Plus className="h-4 w-4" />
            Nuevo item
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiTile title="Presupuesto anual" value={formatCurrency(globalTotal)} icon={DollarSign} tone="sky" />
        <KpiTile title="Items activos" value={String(totalRows)} icon={Calendar} tone="slate" />
        <KpiTile title="Intervenciones" value={String(totalInterventions)} icon={Settings} tone="amber" />
        <KpiTile title="Completadas" value={String(completedInterventions)} icon={CheckCircle2} tone="emerald" />
      </section>

      <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Matriz anual de planeacion</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Haz clic en una celda mensual para crear o cambiar el estado de una intervencion.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="Buscar item, categoria o proveedor"
                  value={search}
                  onChange={(e) => setSearch(e.target.value.toUpperCase())}
                />
                <select
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="ALL">Todas las categorias</option>
                  {currentCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1450px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="sticky left-0 z-10 min-w-[280px] border-b border-slate-200 bg-slate-50 px-4 py-4 font-semibold">
                      Item / Activo
                    </th>
                    <th className="min-w-[170px] border-b border-slate-200 px-4 py-4 font-semibold">Proveedor</th>
                    <th className="min-w-[90px] border-b border-slate-200 px-4 py-4 text-center font-semibold">Aging</th>
                    {MONTHS.map((month) => (
                      <th key={month} className="min-w-[92px] border-b border-slate-200 px-3 py-4 text-center font-semibold">
                        {month}
                      </th>
                    ))}
                    <th className="min-w-[130px] border-b border-slate-200 bg-slate-100 px-4 py-4 text-right font-bold text-slate-800">
                      Total anual
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(groupedItems).map(([category, categoryItems]) => {
                    const expanded = expandedCategories[category] !== false
                    const categoryTotal = categoryItems.reduce(
                      (sum, item) => sum + Object.values(item.schedules).reduce((local, schedule) => local + schedule.budget, 0),
                      0,
                    )

                    return (
                      <FragmentRow
                        key={category}
                        category={category}
                        expanded={expanded}
                        categoryItems={categoryItems}
                        categoryTotal={categoryTotal}
                        toggleCategory={toggleCategory}
                        updateMonth={updateMonth}
                      />
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-800">
                    <td className="sticky left-0 z-10 border-t border-slate-200 bg-slate-50 px-4 py-4">Totales</td>
                    <td className="border-t border-slate-200 px-4 py-4" />
                    <td className="border-t border-slate-200 px-4 py-4" />
                    {Object.entries(monthlyTotals).map(([month, total]) => (
                      <td key={month} className="border-t border-slate-200 px-3 py-4 text-center text-xs">
                        {total > 0 ? formatCurrency(total) : '-'}
                      </td>
                    ))}
                    <td className="border-t border-slate-200 bg-slate-100 px-4 py-4 text-right text-sm text-sky-800">
                      {formatCurrency(globalTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Lectura ejecutiva</h3>
            <div className="mt-4 space-y-3">
              {topMonths.length > 0 ? (
                topMonths.map((entry) => (
                  <div key={entry.month} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3">
                    <span className="text-sm font-medium text-slate-700">{MONTHS[entry.month - 1]}</span>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(entry.total)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Todavia no hay presupuesto calendarizado.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Categorias</h3>
            <div className="mt-4 space-y-3">
              {categoryRollup.map((entry) => (
                <div key={entry.category} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{entry.category}</p>
                      <p className="mt-1 text-xs text-slate-500">{entry.rows} items</p>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(entry.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-sm">
            <h3 className="text-base font-bold">Uso rapido</h3>
            <ul className="mt-3 space-y-3 text-sm text-slate-200">
              <li>1. Selecciona el area y el anio.</li>
              <li>2. Usa Calcular aging para poblar meses faltantes.</li>
              <li>3. Haz clic en una celda para alternar pendiente, en proceso y completo.</li>
              <li>4. Genera el reporte documental para junta o autorizacion.</li>
            </ul>
          </div>
        </aside>
      </section>

      {isModalOpen ? (
        <ItemModal
          categories={currentCategories}
          form={newItem}
          setForm={setNewItem}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddItem}
        />
      ) : null}
    </div>
  )
}

function ReportDocumentView({ deptName, items, year, onClose }: ReportDocumentViewProps) {
  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = '@media print { @page { size: landscape; margin: 10mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }'
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const totalsByMonth = useMemo(() => {
    const totals: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
      9: 0,
      10: 0,
      11: 0,
      12: 0,
    }

    for (const item of items) {
      for (const [month, schedule] of Object.entries(item.schedules)) {
        totals[Number(month)] += schedule.budget
      }
    }

    return totals
  }, [items])

  const grandBase = items.reduce((sum, item) => sum + item.baseCost, 0)
  const grandAnnual = items.reduce(
    (sum, item) => sum + Object.values(item.schedules).reduce((local, schedule) => local + schedule.budget, 0),
    0,
  )

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-white p-8 text-xs text-slate-800">
      <div className="fixed right-8 top-4 flex gap-3 rounded-full border border-slate-200 bg-white p-2 shadow-lg print:hidden">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 font-bold text-slate-700 hover:bg-slate-200"
        >
          <X className="h-4 w-4" />
          Cerrar
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-6 py-2 font-bold text-white hover:bg-sky-500"
        >
          <Printer className="h-4 w-4" />
          Imprimir documento
        </button>
      </div>

      <div className="mb-6 border-b border-slate-300 pb-4">
        <h2 className="text-xl font-black uppercase tracking-[0.16em]">Programacion anual de intervenciones</h2>
        <h3 className="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">
          Depto: {deptName} | Anio: {year} | Hotel Victoria Ejecutivo
        </h3>
      </div>

      <table className="w-full border-collapse border border-slate-400 text-[10px] sm:text-xs">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-400 px-2 py-2 text-left">Categoria</th>
            <th className="border border-slate-400 px-2 py-2 text-left">Activo / Meta</th>
            {MONTHS.map((month) => (
              <th key={month} className="border border-slate-400 px-1 py-2 text-center">
                {month}
              </th>
            ))}
            <th className="border border-slate-400 px-2 py-2 text-center">Base</th>
            <th className="border border-slate-400 px-2 py-2 text-center">Anual</th>
            <th className="border border-slate-400 px-2 py-2 text-left">Proveedor</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const itemTotal = Object.values(item.schedules).reduce((sum, schedule) => sum + schedule.budget, 0)
            return (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-300 px-2 py-1.5 font-semibold">{item.category}</td>
                <td className="border border-slate-300 px-2 py-1.5">{item.name}</td>
                {Array.from({ length: 12 }, (_, idx) => idx + 1).map((month) => (
                  <td key={month} className="border border-slate-300 px-1 py-1.5 text-center">
                    {item.schedules[month] ? formatCurrency(item.schedules[month].budget) : ''}
                  </td>
                ))}
                <td className="border border-slate-300 bg-slate-50 px-2 py-1.5 text-center">{formatCurrency(item.baseCost)}</td>
                <td className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-center font-bold">{formatCurrency(itemTotal)}</td>
                <td className="border border-slate-300 px-2 py-1.5">{item.provider}</td>
              </tr>
            )
          })}
          <tr className="bg-slate-200 font-bold">
            <td colSpan={2} className="border border-slate-400 px-2 py-2 text-right">
              Totales generales
            </td>
            {Object.entries(totalsByMonth).map(([month, total]) => (
              <td key={month} className="border border-slate-400 px-1 py-2 text-center text-sky-900">
                {total > 0 ? formatCurrency(total) : ''}
              </td>
            ))}
            <td className="border border-slate-400 px-2 py-2 text-center">{formatCurrency(grandBase)}</td>
            <td className="border border-slate-400 bg-slate-300 px-2 py-2 text-center text-sky-900">
              {formatCurrency(grandAnnual)}
            </td>
            <td className="border border-slate-400 px-2 py-2" />
          </tr>
        </tbody>
      </table>

      <div className="mt-8 flex justify-between border-t border-slate-300 pt-4 text-[10px] text-slate-500">
        <p>Documento generado desde el modulo corporativo de planeacion anual</p>
        <p>Revision y autorizacion: ________________________________________</p>
      </div>
    </div>
  )
}

function ItemModal({
  categories,
  form,
  setForm,
  onClose,
  onSubmit,
}: {
  categories: string[]
  form: NewItemForm
  setForm: Dispatch<SetStateAction<NewItemForm>>
  onClose: () => void
  onSubmit: (e: FormEvent) => void
}) {
  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Plus className="h-5 w-5" />
            Agregar item al plan anual
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <input
            type="text"
            required
            placeholder="Nombre del activo o meta"
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <input
                type="text"
                required
                list="planning-categories"
                placeholder="Categoria"
                className={inputClass}
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              />
              <datalist id="planning-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>

            <input
              type="text"
              required
              placeholder="Proveedor"
              className={inputClass}
              value={form.provider}
              onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              type="number"
              min="1"
              required
              placeholder="Frecuencia en meses"
              className={inputClass}
              value={form.aging}
              onChange={(e) => setForm((prev) => ({ ...prev, aging: Number(e.target.value) }))}
            />
            <input
              type="number"
              min="0"
              required
              placeholder="Costo base"
              className={inputClass}
              value={form.baseCost}
              onChange={(e) => setForm((prev) => ({ ...prev, baseCost: e.target.value }))}
            />
          </div>

          <input
            type="date"
            required
            className={inputClass}
            value={form.startDate}
            onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button type="submit" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500">
              Guardar item
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FragmentRow({
  category,
  expanded,
  categoryItems,
  categoryTotal,
  toggleCategory,
  updateMonth,
}: {
  category: string
  expanded: boolean
  categoryItems: PlanningItem[]
  categoryTotal: number
  toggleCategory: (category: string) => void
  updateMonth: (itemId: number, month: number) => void
}) {
  return (
    <>
      <tr className="cursor-pointer bg-slate-50 hover:bg-slate-100" onClick={() => toggleCategory(category)}>
        <td className="sticky left-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-800">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            {category}
          </div>
        </td>
        <td colSpan={14} className="border-b border-slate-200 px-4 py-3 text-right font-bold text-slate-600">
          {formatCurrency(categoryTotal)}
        </td>
      </tr>

      {expanded
        ? categoryItems.map((item) => {
            const itemTotal = Object.values(item.schedules).reduce((sum, schedule) => sum + schedule.budget, 0)
            return (
              <tr key={item.id} className="group hover:bg-sky-50/40">
                <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-3 group-hover:bg-sky-50/40">
                  <div className="font-semibold text-slate-900">{item.name}</div>
                  <div className="mt-1 text-xs text-slate-400">Ultimo servicio: {item.lastDate}</div>
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-xs text-slate-600">{item.provider}</td>
                <td className="border-b border-slate-100 px-4 py-3 text-center">
                  <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                    {item.aging}m
                  </span>
                </td>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
                  const schedule = item.schedules[month]
                  const statusMeta = schedule ? getStatusMeta(schedule.status) : null
                  const StatusIcon = statusMeta?.icon ?? Plus
                  return (
                    <td key={month} className="border-b border-l border-slate-50 px-2 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => updateMonth(item.id, month)}
                        className={`mx-auto flex w-full min-w-[72px] flex-col items-center gap-1 rounded-lg border px-1.5 py-2 transition-all ${
                          schedule
                            ? `${statusMeta?.badgeClass ?? 'bg-slate-50 text-slate-600 border-slate-200'} hover:scale-[1.02]`
                            : 'border-dashed border-slate-200 bg-white text-slate-300 hover:border-sky-200 hover:text-sky-600'
                        }`}
                        title={schedule ? 'Cambiar estado de la intervencion' : 'Agregar intervencion en este mes'}
                      >
                        <span className="text-[10px] font-semibold">{schedule ? formatCurrency(schedule.budget) : 'Agregar'}</span>
                        <StatusIcon className={`h-4 w-4 ${statusMeta?.iconClass ?? ''}`} />
                      </button>
                    </td>
                  )
                })}
                <td className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-right font-bold text-sky-800">
                  {formatCurrency(itemTotal)}
                </td>
              </tr>
            )
          })
        : null}
    </>
  )
}

function ControlCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      {children}
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  wide,
}: {
  title: string
  value: string
  icon: LucideIcon
  wide?: boolean
}) {
  return (
    <div className={`rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm ${wide ? 'sm:col-span-1' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-slate-900 p-2 text-white">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
          <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
    </div>
  )
}

function KpiTile({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string
  value: string
  icon: LucideIcon
  tone: 'sky' | 'slate' | 'amber' | 'emerald'
}) {
  const toneMap = {
    sky: 'bg-sky-50 border-sky-200 text-sky-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  }[tone]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
        </div>
        <div className={`rounded-2xl border p-3 ${toneMap}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

export default function PlanningHubClient({ userProfile, initialYear }: Props) {
  const departments = useMemo(() => resolveDepartments(userProfile), [userProfile])
  const canSeeAll = userProfile.isAdmin || userProfile.isCorporate
  const initialDeptId = departments[0]?.id ?? 4
  const [currentView, setCurrentView] = useState<'dashboard' | 'planning'>(canSeeAll ? 'dashboard' : 'planning')
  const [selectedDept, setSelectedDept] = useState(initialDeptId)
  const [year, setYear] = useState(initialYear)
  const [items, setItems] = useState(INITIAL_MOCK_DATA)

  useEffect(() => {
    if (!departments.some((dept) => dept.id === selectedDept)) {
      setSelectedDept(initialDeptId)
    }
  }, [departments, initialDeptId, selectedDept])

  function openPlanning(deptId: number) {
    setSelectedDept(deptId)
    setCurrentView('planning')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {currentView === 'dashboard' ? (
          <DashboardView departments={departments} items={items} year={year} onSelectDept={openPlanning} />
        ) : (
          <PlanningView
            departments={departments}
            selectedDept={selectedDept}
            setSelectedDept={setSelectedDept}
            canChangeDepartment={canSeeAll}
            year={year}
            setYear={setYear}
            items={items}
            setItems={setItems}
            onBack={() => setCurrentView(canSeeAll ? 'dashboard' : 'planning')}
          />
        )}
      </div>
    </div>
  )
}
