type AssetStats = {
  total_assets: number
  operational: number
  in_maintenance: number
  out_of_service: number
  retired: number
  total_incidents: number
  open_incidents: number
}

export default function AssetStats({ stats }: { stats: AssetStats }) {
  const statCards = [
    {
      label: 'Total Activos',
      value: stats.total_assets,
      icon: '🖥️',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      label: 'Operativos',
      value: stats.operational,
      icon: '✅',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
    },
    {
      label: 'En Mantenimiento',
      value: stats.in_maintenance,
      icon: '🔧',
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
    },
    {
      label: 'Fuera de Servicio',
      value: stats.out_of_service,
      icon: '⚠️',
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
    },
    {
      label: 'Total Incidencias',
      value: stats.total_incidents,
      icon: '📋',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
    },
    {
      label: 'Incidencias Abiertas',
      value: stats.open_incidents,
      icon: '🎯',
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className="card shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="card-body p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center text-xl`}>
                {stat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 font-medium truncate">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
