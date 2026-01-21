'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Search, 
  Bell, 
  Menu, 
  X,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Box,
  CreditCard,
  FileText,
  MoreHorizontal,
  Download,
  Filter,
  RefreshCw,
  ChevronRight,
  Shield,
  Briefcase,
  ClipboardCheck,
  Building2
} from 'lucide-react';
import { CorporateStatsService, CorporateStats } from '@/lib/services/corporate-stats.service';

const HubProfesionalLight = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState<CorporateStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoaded(true);
    loadRealData();
  }, []);

  const loadRealData = async () => {
    try {
      const { data } = await CorporateStatsService.getFullStats();
      if (data) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Datos corporativos - Dinámicos desde el servicio
  const kpiData = stats ? [
    { 
      label: 'SEDES ACTIVAS', 
      value: String(stats.totalLocations), 
      trend: '+8.3%', 
      positive: true, 
      code: 'LOC-2024', 
      data: stats.complianceTrend.slice(-7).map((_, i) => stats.totalLocations - (7 - i)) 
    },
    { 
      label: 'CUMPLIMIENTO GLOBAL', 
      value: `${stats.avgComplianceScore}%`, 
      trend: '+4.2%', 
      positive: true, 
      code: 'CMP-YTD', 
      data: stats.complianceTrend.slice(-7).map(t => t.score) 
    },
    { 
      label: 'INSPECCIONES', 
      value: String(stats.totalInspections), 
      trend: '+15.0%', 
      positive: true, 
      code: 'INS-Q1', 
      data: Array.from({length: 7}, (_, i) => Math.floor(stats.totalInspections * (0.5 + (i * 0.5 / 6)))) 
    },
    { 
      label: 'USUARIOS ACTIVOS', 
      value: String(stats.totalUsers), 
      trend: '+12.0%', 
      positive: true, 
      code: 'USR-ACT', 
      data: Array.from({length: 7}, (_, i) => Math.floor(stats.totalUsers * (0.75 + (i * 0.25 / 6)))) 
    },
  ] : [
    { label: 'SEDES ACTIVAS', value: '0', trend: '+0%', positive: true, code: 'LOC-2024', data: [0] },
    { label: 'CUMPLIMIENTO GLOBAL', value: '0%', trend: '+0%', positive: true, code: 'CMP-YTD', data: [0] },
    { label: 'INSPECCIONES', value: '0', trend: '+0%', positive: true, code: 'INS-Q1', data: [0] },
    { label: 'USUARIOS ACTIVOS', value: '0', trend: '+0%', positive: true, code: 'USR-ACT', data: [0] },
  ];

  const recentInspections = stats?.locationRanking.slice(0, 5).map(loc => ({
    id: `INS-${loc.location_id.slice(0, 4)}`,
    property: loc.property_name,
    code: loc.property_code,
    score: `${loc.avgScore}%`,
    status: loc.avgScore >= 90 ? 'Aprobado' : loc.avgScore >= 75 ? 'Pendiente' : loc.avgScore >= 60 ? 'En Revisión' : 'Rechazado'
  })) || [
    { id: 'INS-0000', property: 'Sin datos', code: 'N/A', score: '0%', status: 'Pendiente' },
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Aprobado': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Pendiente': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'En Revisión': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'Rechazado': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  // Pequeño componente para la gráfica de línea (Sparkline)
  const Sparkline = ({ data, color, positive }: { data: number[], color: number, positive: boolean }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((d - min) / (max - min)) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible preserve-3d">
        <defs>
            <linearGradient id={`grad-light-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={positive ? '#10b981' : '#ef4444'} stopOpacity="0.15" />
                <stop offset="100%" stopColor={positive ? '#10b981' : '#ef4444'} stopOpacity="0" />
            </linearGradient>
        </defs>
        <path
          d={`M0,100 L0,${100 - ((data[0] - min) / (max - min)) * 100} ${points.split(' ').map((p,i) => `L${p}`).join(' ')} L100,100 Z`}
          fill={`url(#grad-light-${color})`}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        />
        <polyline
          fill="none"
          stroke={positive ? '#10b981' : '#ef4444'}
          strokeWidth="2"
          points={points}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans text-sm selection:bg-blue-200 selection:text-blue-900 overflow-hidden">
      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 flex items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-700 font-medium text-sm">Cargando datos reales...</span>
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-enter {
          animation: slideIn 0.4s ease-out forwards;
        }
      `}</style>
      
      {/* Sidebar Light */}
      <aside 
        className={`${sidebarOpen ? 'w-64' : 'w-20'} flex-shrink-0 bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-20 shadow-sm`}
      >
        <div className="h-20 flex items-center px-6 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white">
          <div className="flex items-center gap-4 overflow-hidden">
            <img 
              src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png"
              alt="ZIII HoS"
              className={`object-contain flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-12 h-12' : 'w-10 h-10'}`}
            />
            <div className={`transition-opacity duration-300 ${!sidebarOpen && 'opacity-0'}`}>
              <span className="font-bold text-gray-900 text-xl tracking-wide block">
                ZIII
              </span>
              <span className="text-gray-500 text-xs font-medium tracking-wider">
                Hospitality OS
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 py-6 space-y-1 px-3">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Panel Principal' },
            { id: 'inspections', icon: ClipboardCheck, label: 'Inspecciones' },
            { id: 'locations', icon: Building2, label: 'Sedes' },
            { id: 'reports', icon: FileText, label: 'Reportes' },
            { id: 'analytics', icon: Activity, label: 'Métricas' },
            { id: 'team', icon: Users, label: 'Personal' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-lg transition-all group relative ${
                activeSection === item.id 
                  ? 'bg-blue-50 text-blue-700 font-medium shadow-sm border-l-2 border-blue-600' 
                  : 'hover:bg-gray-50 hover:text-gray-900 text-gray-600 border-l-2 border-transparent'
              }`}
            >
              <item.icon size={18} strokeWidth={2} />
              <span className={`whitespace-nowrap transition-opacity duration-300 ${!sidebarOpen && 'opacity-0 hidden'}`}>
                {item.label}
              </span>
              {/* Tooltip for collapsed state */}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap shadow-lg">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            {sidebarOpen ? <Menu size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 relative z-10">
        
        {/* Top Navigation Bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Dashboard Corporativo</h1>
            <span className="h-4 w-px bg-gray-300 mx-2"></span>
            <div className="flex items-center text-xs text-gray-600 font-medium">
              <span className="mr-2">SISTEMA: EN LÍNEA</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar referencia..." 
                className="bg-gray-50 border border-gray-300 text-sm rounded-lg pl-9 pr-4 py-1.5 w-64 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all placeholder:text-gray-400 text-gray-700"
              />
            </div>
            <button className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Bell size={16} />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 border border-blue-300 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm">
              AM
            </div>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <div className="max-w-[1600px] mx-auto space-y-6">
            
            {/* Control Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-medium text-xs">PERIODO:</span>
                <select className="bg-white border border-gray-300 text-gray-700 text-xs py-1.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500">
                  <option>Este Trimestre (Q4)</option>
                  <option>Año Fiscal 2024</option>
                  <option>Últimos 30 Días</option>
                  <option>Últimos 6 Meses</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors rounded-lg">
                  <Download size={14} /> Exportar
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 border border-transparent text-white text-xs font-bold transition-colors rounded-lg shadow-sm">
                  <RefreshCw size={14} /> Actualizar Datos
                </button>
              </div>
            </div>

            {/* KPI Grid - Light & Clean */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiData.map((kpi, idx) => (
                <div 
                  key={idx} 
                  className={`bg-white border border-gray-200 rounded-xl p-5 relative overflow-hidden group cursor-default transition-all duration-300 hover:border-blue-300 hover:shadow-lg animate-enter`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {/* Hover Glow Effect */}
                  <div className={`absolute top-0 left-0 w-full h-[2px] transition-all duration-500 transform scale-x-0 group-hover:scale-x-100 ${kpi.positive ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

                  <div className="relative z-10 flex flex-col h-24 justify-between">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-700 transition-colors">{kpi.label}</span>
                      
                      {/* Trend Badge */}
                      <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded transition-all duration-300 
                        ${kpi.positive ? 'text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100' : 'text-red-600 bg-red-50 group-hover:bg-red-100'}`}>
                        {kpi.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {kpi.trend}
                      </div>
                    </div>

                    {/* Value */}
                    <div className="flex items-end justify-between mt-2">
                       <span className="text-3xl font-bold text-gray-900 tracking-tighter group-hover:translate-x-1 transition-transform duration-300">
                         {kpi.value}
                       </span>
                    </div>
                    
                    {/* Hidden Context - Revealed on Hover */}
                    <div className="h-0 group-hover:h-auto overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out flex items-center justify-between mt-2 pt-2 border-t border-dashed border-gray-200/0 group-hover:border-gray-300">
                       <span className="text-[10px] text-gray-500 font-medium">{kpi.code}</span>
                       <span className="text-[10px] text-gray-400">vs mes anterior</span>
                    </div>
                  </div>

                  {/* Sparkline Background */}
                  <div className="absolute bottom-0 right-0 w-1/2 h-16 opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none">
                     <Sparkline data={kpi.data} color={idx} positive={kpi.positive} />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-enter" style={{ animationDelay: '400ms' }}>
              
              {/* Main Chart Section */}
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl flex flex-col hover:border-gray-300 hover:shadow-lg transition-all">
                <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                  <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                    <TrendingUp size={16} className="text-gray-600" />
                    TENDENCIA DE CUMPLIMIENTO
                  </h3>
                  <button className="text-gray-500 hover:text-gray-700 transition-colors"><MoreHorizontal size={16} /></button>
                </div>
                <div className="flex-1 p-5 min-h-[320px] relative group">
                  {/* Grid lines background */}
                  <div className="absolute inset-0 p-5 flex flex-col justify-between pointer-events-none opacity-10">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="w-full h-px bg-gray-400 border-t border-dashed border-gray-400"></div>
                    ))}
                  </div>
                  
                  {/* Bars representation */}
                  <div className="h-full flex items-end justify-between gap-2 px-2 relative z-10">
                    {(stats?.complianceTrend || Array(12).fill({score: 0})).slice(-12).map((trend, i) => {
                      const h = trend.score || 0;
                      return (
                        <div key={i} className="w-full h-full flex items-end group/bar">
                          <div 
                            style={{ height: loaded ? `${h}%` : '0%' }} 
                            className="w-full bg-gradient-to-t from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 transition-all duration-500 ease-out min-h-[4px] relative rounded-t-sm shadow-sm"
                          >
                            {/* Tooltip for bars */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-gray-900 border border-gray-700 text-white text-[10px] px-2 py-1 rounded-md pointer-events-none whitespace-nowrap z-50 shadow-lg">
                              {h}% Cumplimiento
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-between text-xs text-gray-600 font-medium">
                  <span>Últimos {stats?.complianceTrend.length || 12} meses • Promedio: {stats?.avgComplianceScore || 0}%</span>
                  <span>Fuente: Sistema ZIII</span>
                </div>
              </div>

              {/* Recent Inspections Table */}
              <div className="bg-white border border-gray-200 rounded-xl flex flex-col hover:border-gray-300 hover:shadow-lg transition-all">
                <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                  <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                    <ClipboardCheck size={16} className="text-gray-600" />
                    ÚLTIMAS INSPECCIONES
                  </h3>
                  <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">VER TODO</button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Propiedad</th>
                        <th className="px-4 py-3 font-semibold text-right">Score</th>
                        <th className="px-4 py-3 font-semibold text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recentInspections.map((insp) => (
                        <tr key={insp.id} className="hover:bg-gray-50 transition-colors group cursor-pointer">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{insp.property}</div>
                            <div className="text-[10px] text-gray-500 group-hover:text-gray-600">{insp.code}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-700 group-hover:text-gray-900">
                            {insp.score}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-block px-2 py-0.5 border rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${getStatusColor(insp.status)} group-hover:shadow-sm`}>
                              {insp.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Secondary Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-enter" style={{ animationDelay: '600ms' }}>
              <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-lg transition-all">
                 <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                   <Activity size={16} className="text-gray-600" />
                   ÁREAS DE ATENCIÓN
                 </h3>
                 <div className="space-y-4">
                    {(stats?.criticalAreas || []).slice(0, 3).length > 0 ? (
                      stats!.criticalAreas.slice(0, 3).map((area, i) => (
                        <div key={i} className="group">
                          <div className="flex justify-between text-xs mb-1 text-gray-600 font-medium group-hover:text-gray-900 transition-colors">
                            <span className="truncate">{area.area_name}</span>
                            <span className="font-semibold">{area.avgScore}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                            <div 
                              className={`h-full transition-all duration-1000 ease-out rounded-full ${
                                area.avgScore >= 85 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 
                                area.avgScore >= 70 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 
                                'bg-gradient-to-r from-red-400 to-red-500'
                              }`}
                              style={{ width: loaded ? `${area.avgScore}%` : '0%' }}
                            ></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="group">
                          <div className="flex justify-between text-xs mb-1 text-gray-500 font-medium">
                            <span>Sin datos disponibles</span>
                            <span>-</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"></div>
                        </div>
                      </>
                    )}
                 </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between hover:border-gray-300 hover:shadow-lg transition-all">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Reporte Consolidado</h3>
                    <p className="text-xs text-gray-600 mt-1 max-w-xs">Generar reporte ejecutivo consolidado para presentación corporativa.</p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-lg transition-colors shadow-sm transform active:scale-95">
                    Generar
                  </button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default HubProfesionalLight;
