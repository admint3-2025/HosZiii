'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CorporateStatsService, CorporateStats } from '@/lib/services/corporate-stats.service'

// Iconos SVG inline
const Icons = {
  Building: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Users: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  ClipboardCheck: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  TrendingUp: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  TrendingDown: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Star: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
}

// Componente de KPI Card
function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  color = 'blue' 
}: { 
  title: string
  value: string | number
  subtitle?: string
  icon: () => React.ReactNode
  trend?: { value: number; direction: 'up' | 'down' }
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'red'
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 border-blue-200',
    green: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-200',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-200',
    red: 'bg-red-500/10 text-red-600 border-red-200',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend.direction === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend.direction === 'up' ? <Icons.TrendingUp /> : <Icons.TrendingDown />}
            <span>{trend.value}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
        <p className="text-sm text-gray-500 mt-1">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}

// Componente de Score Circle
function ScoreCircle({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const getColor = (s: number) => {
    if (s >= 90) return { bg: 'bg-emerald-100', text: 'text-emerald-700', stroke: '#10b981' }
    if (s >= 70) return { bg: 'bg-amber-100', text: 'text-amber-700', stroke: '#f59e0b' }
    return { bg: 'bg-red-100', text: 'text-red-700', stroke: '#ef4444' }
  }

  const colors = getColor(score)
  const sizeClasses = {
    sm: { container: 'w-10 h-10', text: 'text-xs' },
    md: { container: 'w-16 h-16', text: 'text-lg' },
    lg: { container: 'w-24 h-24', text: 'text-2xl' }
  }

  const radius = size === 'sm' ? 16 : size === 'md' ? 28 : 44
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className={`relative ${sizeClasses[size].container}`}>
      <svg className="w-full h-full -rotate-90" viewBox={size === 'sm' ? '0 0 40 40' : size === 'md' ? '0 0 64 64' : '0 0 96 96'}>
        <circle
          cx={size === 'sm' ? 20 : size === 'md' ? 32 : 48}
          cy={size === 'sm' ? 20 : size === 'md' ? 32 : 48}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={size === 'sm' ? 3 : 4}
        />
        <circle
          cx={size === 'sm' ? 20 : size === 'md' ? 32 : 48}
          cy={size === 'sm' ? 20 : size === 'md' ? 32 : 48}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={size === 'sm' ? 3 : 4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700"
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-bold ${sizeClasses[size].text} ${colors.text}`}>
        {score}%
      </div>
    </div>
  )
}

// Componente de barra de progreso animada
function AnimatedBar({ value, label, color = 'blue' }: { value: number; label: string; color?: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{value}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${colorMap[color]} transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export default function CorporateDashboardClient() {
  const [stats, setStats] = useState<CorporateStats | null>(null)
  const [pendingReviews, setPendingReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    try {
      const [statsResult, reviewsResult] = await Promise.all([
        CorporateStatsService.getFullStats(),
        CorporateStatsService.getPendingReviews()
      ])

      if (statsResult.data) setStats(statsResult.data)
      if (reviewsResult.data) setPendingReviews(reviewsResult.data)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const handleApprove = async (id: string) => {
    const { error } = await CorporateStatsService.approveInspection(id)
    if (!error) {
      loadData()
    }
  }

  const handleReject = async (id: string) => {
    const { error } = await CorporateStatsService.rejectInspection(id)
    if (!error) {
      loadData()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Cargando dashboard corporativo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con última actualización */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Panel de Control Corporativo</h2>
          <p className="text-sm text-gray-500 mt-1">
            Visión ejecutiva del cumplimiento organizacional
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <span className={refreshing ? 'animate-spin' : ''}><Icons.Refresh /></span>
          Actualizar
        </button>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Sedes Activas"
          value={stats?.totalLocations || 0}
          subtitle="Propiedades monitoreadas"
          icon={Icons.Building}
          color="blue"
        />
        <KPICard
          title="Personal"
          value={stats?.totalUsers || 0}
          subtitle="Usuarios en el sistema"
          icon={Icons.Users}
          color="purple"
        />
        <KPICard
          title="Inspecciones"
          value={stats?.totalInspections || 0}
          subtitle="Total realizadas"
          icon={Icons.ClipboardCheck}
          color="amber"
        />
        <KPICard
          title="Cumplimiento Global"
          value={`${stats?.avgComplianceScore || 0}%`}
          subtitle="Promedio corporativo"
          icon={() => <Icons.Star />}
          color="green"
        />
      </div>

      {/* Fila de contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de estado de inspecciones */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Inspecciones</h3>
          <div className="flex items-center justify-center mb-6">
            <ScoreCircle score={stats?.avgComplianceScore || 0} size="lg" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span className="text-gray-600">Borrador</span>
              </div>
              <span className="font-semibold text-gray-900">{stats?.inspectionsByStatus.draft || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-gray-600">Pendiente Revisión</span>
              </div>
              <span className="font-semibold text-gray-900">{stats?.inspectionsByStatus.completed || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-gray-600">Aprobadas</span>
              </div>
              <span className="font-semibold text-gray-900">{stats?.inspectionsByStatus.approved || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-600">Rechazadas</span>
              </div>
              <span className="font-semibold text-gray-900">{stats?.inspectionsByStatus.rejected || 0}</span>
            </div>
          </div>
        </div>

        {/* Tendencia de cumplimiento */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Cumplimiento</h3>
          {stats?.complianceTrend && stats.complianceTrend.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-end justify-between h-40 gap-2 px-2">
                {stats.complianceTrend.map((point, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end">
                    <div 
                      className="w-full bg-gradient-to-t from-amber-500 to-orange-400 rounded-t-md transition-all duration-500 hover:from-amber-400 hover:to-orange-300"
                      style={{ height: `${point.score}%` }}
                    />
                    <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left">{point.month}</span>
                  </div>
                ))}
              </div>
              <div className="text-center text-sm text-gray-500 mt-8">
                Últimos {stats.complianceTrend.length} meses
              </div>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400">
              Sin datos suficientes
            </div>
          )}
        </div>

        {/* Áreas críticas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-amber-500"><Icons.AlertTriangle /></div>
            <h3 className="text-lg font-semibold text-gray-900">Áreas de Atención</h3>
          </div>
          {stats?.criticalAreas && stats.criticalAreas.length > 0 ? (
            <div className="space-y-4">
              {stats.criticalAreas.map((area, i) => (
                <AnimatedBar 
                  key={i} 
                  label={area.area_name} 
                  value={area.avgScore}
                  color={area.avgScore < 60 ? 'red' : 'amber'}
                />
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-emerald-500">
              <div className="text-center">
                <Icons.Check />
                <p className="text-sm mt-2">Todas las áreas cumplen estándares</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Segunda fila */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking de sedes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Ranking de Sedes</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Pos</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Propiedad</th>
                  <th className="text-center py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Insp.</th>
                  <th className="text-center py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="text-center py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats?.locationRanking?.map((loc, i) => (
                  <tr key={loc.location_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        i === 0 ? 'bg-amber-100 text-amber-700' :
                        i === 1 ? 'bg-gray-100 text-gray-700' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'text-gray-500'
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-gray-900">{loc.property_name}</div>
                      <div className="text-xs text-gray-500">{loc.property_code}</div>
                    </td>
                    <td className="py-3 text-center text-sm text-gray-600">{loc.totalInspections}</td>
                    <td className="py-3 text-center">
                      <ScoreCircle score={loc.avgScore} size="sm" />
                    </td>
                    <td className="py-3 text-center">
                      {loc.trend === 'up' && <span className="text-emerald-500"><Icons.TrendingUp /></span>}
                      {loc.trend === 'down' && <span className="text-red-500"><Icons.TrendingDown /></span>}
                      {loc.trend === 'stable' && <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
                {(!stats?.locationRanking || stats.locationRanking.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      Sin datos de inspecciones
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inspecciones pendientes de revisión */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">📋 Pendientes de Revisión</h3>
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              {pendingReviews.length} pendientes
            </span>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {pendingReviews.map((review) => (
              <div key={review.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{review.property_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {review.inspector_name} • {new Date(review.inspection_date).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  <ScoreCircle score={Math.round((review.average_score || 0) * 10)} size="sm" />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleApprove(review.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    <Icons.Check /> Aprobar
                  </button>
                  <button
                    onClick={() => handleReject(review.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Icons.X /> Rechazar
                  </button>
                  <Link
                    href={`/inspections/${review.id}`}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Ver
                  </Link>
                </div>
              </div>
            ))}
            {pendingReviews.length === 0 && (
              <div className="py-8 text-center text-gray-400">
                <Icons.Check />
                <p className="mt-2">No hay inspecciones pendientes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inspectores destacados */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 Inspectores Más Activos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats?.activeInspectors?.map((inspector, i) => (
            <div key={inspector.user_id} className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
              <div className="w-12 h-12 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2">
                {inspector.user_name.charAt(0).toUpperCase()}
              </div>
              <div className="font-medium text-gray-900 text-sm truncate">{inspector.user_name}</div>
              <div className="text-xs text-gray-500 mt-1">{inspector.inspectionsCount} inspecciones</div>
              <div className="mt-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  inspector.avgScore >= 90 ? 'bg-emerald-100 text-emerald-700' :
                  inspector.avgScore >= 70 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {inspector.avgScore}% prom
                </span>
              </div>
            </div>
          ))}
          {(!stats?.activeInspectors || stats.activeInspectors.length === 0) && (
            <div className="col-span-full py-8 text-center text-gray-400">
              Sin datos de inspectores
            </div>
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          href="/corporativo/inspecciones"
          className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg text-white group-hover:scale-110 transition-transform">
              <Icons.ClipboardCheck />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Inspecciones</div>
              <div className="text-xs text-gray-500">Gestionar auditorías</div>
            </div>
          </div>
        </Link>

        <Link
          href="#"
          className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:shadow-md transition-all group opacity-60 cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Políticas</div>
              <div className="text-xs text-gray-500">Próximamente</div>
            </div>
          </div>
        </Link>

        <Link
          href="#"
          className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl hover:shadow-md transition-all group opacity-60 cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Procedimientos</div>
              <div className="text-xs text-gray-500">Próximamente</div>
            </div>
          </div>
        </Link>

        <Link
          href="#"
          className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl hover:shadow-md transition-all group opacity-60 cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-lg text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Academia</div>
              <div className="text-xs text-gray-500">Próximamente</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Footer info */}
      <div className="text-center text-xs text-gray-400 py-4">
        Dashboard Corporativo ZIII • Datos actualizados en tiempo real
      </div>
    </div>
  )
}
