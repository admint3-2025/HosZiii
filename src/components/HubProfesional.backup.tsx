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

const HubProfesional = () => {
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
      case 'Aprobado': return 'text-emerald-400 bg-emerald-900/30 border-emerald-800';
      case 'Pendiente': return 'text-amber-400 bg-amber-900/30 border-amber-800';
      case 'En Revisión': return 'text-blue-400 bg-blue-900/30 border-blue-800';
      case 'Rechazado': return 'text-red-400 bg-red-900/30 border-red-800';
      default: return 'text-gray-400 bg-gray-800 border-gray-700';
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
            <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={positive ? '#10b981' : '#ef4444'} stopOpacity="0.2" />
                <stop offset="100%" stopColor={positive ? '#10b981' : '#ef4444'} stopOpacity="0" />
            </linearGradient>
        </defs>
        <path
          d={`M0,100 L0,${100 - ((data[0] - min) / (max - min)) * 100} ${points.split(' ').map((p,i) => `L${p}`).join(' ')} L100,100 Z`}
          fill={`url(#grad-${color})`}
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
    <div className="flex h-screen bg-[#09090b] text-gray-300 font-sans text-sm selection:bg-gray-700 selection:text-white overflow-hidden">
      {loading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-[#121214] border border-gray-700 rounded-lg p-6 flex items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="text-white font-mono text-sm">Cargando datos reales...</span>
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
      
      {/* Sidebar Industrial */}
      <aside 
        className={`${sidebarOpen ? 'w-64' : 'w-20'} flex-shrink-0 bg-[#0c0c0e] border-r border-gray-800 transition-all duration-300 flex flex-col z-20`}
      >
        <div className="h-20 flex items-center px-6 border-b border-gray-800 bg-[#0f0f12]">
          <div className="flex items-center gap-4 overflow-hidden">
            <img 
              src="https://systemach-sas.com/logo_ziii/ZIII%20logo.png"
              alt="ZIII HoS"
              className={`object-contain flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-12 h-12' : 'w-10 h-10'}`}
            />
            <div className={`transition-opacity duration-300 ${!sidebarOpen && 'opacity-0'}`}>
              <span className="font-bold text-white text-xl tracking-wide block">
                ZIII
              </span>
              <span className="text-gray-400 text-xs font-medium tracking-wider">
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
              className={`w-full flex items-center gap-4 px-3 py-2.5 rounded transition-colors group relative ${
                activeSection === item.id 
                  ? 'bg-gray-800 text-white border-l-2 border-white' 
                  : 'hover:bg-gray-800/50 hover:text-gray-100 border-l-2 border-transparent'
              }`}
            >
              <item.icon size={18} strokeWidth={1.5} />
              <span className={`whitespace-nowrap transition-opacity duration-300 ${!sidebarOpen && 'opacity-0 hidden'}`}>
                {item.label}
              </span>
              {/* Tooltip for collapsed state */}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap border border-gray-700">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
          >
            {sidebarOpen ? <Menu size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b] relative z-10">
        
        {/* Top Navigation Bar - Functional */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-gray-800 bg-[#09090b]">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-white tracking-tight uppercase">Dashboard Corporativo</h1>
            <span className="h-4 w-px bg-gray-700 mx-2"></span>
            <div className="flex items-center text-xs text-gray-500 font-mono">
              <span className="mr-2">SISTEMA: EN LÍNEA</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Buscar referencia..." 
                className="bg-[#121214] border border-gray-700 text-sm rounded-sm pl-9 pr-4 py-1.5 w-64 focus:outline-none focus:border-gray-500 transition-colors placeholder:text-gray-600 text-gray-300"
              />
            </div>
            <button className="p-2 text-gray-400 hover:text-white border border-gray-700 rounded-sm hover:bg-gray-800 transition-colors">
              <Bell size={16} />
            </button>
            <div className="w-8 h-8 bg-gray-800 border border-gray-700 rounded-sm flex items-center justify-center text-xs font-bold text-white">
              AM
            </div>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          <div className="max-w-[1600px] mx-auto space-y-6">
            
            {/* Control Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-mono text-xs">PERIODO:</span>
                <select className="bg-[#121214] border border-gray-700 text-white text-xs py-1 px-3 rounded-sm focus:outline-none">
                  <option>Este Trimestre (Q4)</option>
                  <option>Año Fiscal 2024</option>
                  <option>Últimos 30 Días</option>
                  <option>Últimos 6 Meses</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-[#121214] border border-gray-700 hover:bg-gray-800 text-xs font-medium text-gray-300 transition-colors rounded-sm">
                  <Download size={14} /> Exportar
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-white border border-transparent text-black text-xs font-bold transition-colors rounded-sm shadow-sm">
                  <RefreshCw size={14} /> Actualizar Datos
                </button>
              </div>
            </div>

            {/* KPI Grid - Animated & Minimal */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiData.map((kpi, idx) => (
                <div 
                  key={idx} 
                  className={`bg-[#121214] border border-gray-800 rounded-sm p-5 relative overflow-hidden group cursor-default transition-all duration-300 hover:border-gray-600 hover:bg-[#161619] animate-enter`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {/* Hover Glow Effect */}
                  <div className={`absolute top-0 left-0 w-full h-[2px] transition-all duration-500 transform scale-x-0 group-hover:scale-x-100 ${kpi.positive ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

                  <div className="relative z-10 flex flex-col h-24 justify-between">
                    {/* Header - Always minimal */}
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono group-hover:text-gray-300 transition-colors">{kpi.label}</span>
                      
                      {/* Trend Badge - Starts subtle, pops on hover */}
                      <div className={`flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition-all duration-300 
                        ${kpi.positive ? 'text-emerald-500 bg-emerald-500/0 group-hover:bg-emerald-500/10' : 'text-red-500 bg-red-500/0 group-hover:bg-red-500/10'}`}>
                        {kpi.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {kpi.trend}
                      </div>
                    </div>

                    {/* Value - The Star */}
                    <div className="flex items-end justify-between mt-2">
                       <span className="text-3xl font-bold text-gray-100 font-mono tracking-tighter group-hover:translate-x-1 transition-transform duration-300">
                         {kpi.value}
                       </span>
                    </div>
                    
                    {/* Hidden Context - Revealed on Hover */}
                    <div className="h-0 group-hover:h-auto overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out flex items-center justify-between mt-2 pt-2 border-t border-dashed border-gray-700/0 group-hover:border-gray-700">
                       <span className="text-[10px] text-gray-500 font-mono">{kpi.code}</span>
                       <span className="text-[10px] text-gray-400">vs mes anterior</span>
                    </div>
                  </div>

                  {/* Sparkline Background - Minimal & Functional */}
                  <div className="absolute bottom-0 right-0 w-1/2 h-16 opacity-30 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none">
                     <Sparkline data={kpi.data} color={idx} positive={kpi.positive} />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-enter" style={{ animationDelay: '400ms' }}>
              
              {/* Main Chart Section - Utilitarian */}
              <div className="lg:col-span-2 bg-[#121214] border border-gray-800 rounded-sm flex flex-col hover:border-gray-700 transition-colors">
                <div className="px-5 py-4 border-b border-gray-800 flex justify-between items-center bg-[#0c0c0e]/50">
                  <h3 className="font-semibold text-gray-200 text-sm flex items-center gap-2">
                    <TrendingUp size={16} className="text-gray-500" />
                    TENDENCIA DE CUMPLIMIENTO
                  </h3>
                  <button className="text-gray-500 hover:text-white transition-colors"><MoreHorizontal size={16} /></button>
                </div>
                <div className="flex-1 p-5 min-h-[320px] relative group">
                  {/* Grid lines background */}
                  <div className="absolute inset-0 p-5 flex flex-col justify-between pointer-events-none opacity-20">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="w-full h-px bg-gray-500 border-t border-dashed border-gray-500"></div>
                    ))}
                  </div>
                  
                  {/* Bars representation - Real compliance trend data */}
                  <div className="h-full flex items-end justify-between gap-2 px-2 relative z-10">
                    {(stats?.complianceTrend || Array(12).fill({score: 0})).slice(-12).map((trend, i) => {
                      const h = trend.score || 0;
                      return (
                        <div key={i} className="w-full h-full flex items-end group/bar">
                          <div 
                            style={{ height: loaded ? `${h}%` : '0%' }} 
                            className="w-full bg-gray-700 hover:bg-gray-400 transition-all duration-500 ease-out min-h-[4px] relative"
                          >
                            {/* Tooltip for bars */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-gray-900 border border-gray-700 text-white text-[10px] px-2 py-1 rounded-sm pointer-events-none whitespace-nowrap z-50">
                              {h}% Cumplimiento
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="px-5 py-3 border-t border-gray-800 bg-[#0c0c0e] flex justify-between text-xs text-gray-500 font-mono uppercase">
                  <span>Últimos {stats?.complianceTrend.length || 12} meses • Promedio: {stats?.avgComplianceScore || 0}%</span>
                  <span>Fuente: Sistema ZIII</span>
                </div>
              </div>

              {/* Recent Inspections Table - Dense */}
              <div className="bg-[#121214] border border-gray-800 rounded-sm flex flex-col hover:border-gray-700 transition-colors">
                <div className="px-5 py-4 border-b border-gray-800 flex justify-between items-center bg-[#0c0c0e]/50">
                  <h3 className="font-semibold text-gray-200 text-sm flex items-center gap-2">
                    <ClipboardCheck size={16} className="text-gray-500" />
                    ÚLTIMAS INSPECCIONES
                  </h3>
                  <button className="text-xs text-blue-400 hover:text-blue-300 font-medium">VER TODO</button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0c0c0e] text-gray-500 font-mono uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium">Propiedad</th>
                        <th className="px-4 py-3 font-medium text-right">Score</th>
                        <th className="px-4 py-3 font-medium text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {recentInspections.map((insp) => (
                        <tr key={insp.id} className="hover:bg-gray-800/50 transition-colors group cursor-pointer">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-300 group-hover:text-white transition-colors">{insp.property}</div>
                            <div className="text-[10px] text-gray-600 font-mono group-hover:text-gray-500">{insp.code}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-gray-300 group-hover:text-white">
                            {insp.score}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-block px-2 py-0.5 border rounded-sm text-[10px] font-bold uppercase tracking-wide transition-all ${getStatusColor(insp.status)} group-hover:shadow-sm`}>
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

            {/* Secondary Panel - Animated Entry */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-enter" style={{ animationDelay: '600ms' }}>
              <div className="bg-[#121214] border border-gray-800 rounded-sm p-5 hover:border-gray-700 transition-colors">
                 <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                   <Activity size={16} className="text-gray-500" />
                   ÁREAS DE ATENCIÓN
                 </h3>
                 <div className="space-y-4">
                    {(stats?.criticalAreas || []).slice(0, 3).length > 0 ? (
                      stats!.criticalAreas.slice(0, 3).map((area, i) => (
                        <div key={i} className="group">
                          <div className="flex justify-between text-xs mb-1 text-gray-400 font-mono group-hover:text-gray-300 transition-colors">
                            <span className="truncate">{area.area_name}</span>
                            <span>{area.avgScore}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-800 rounded-sm overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ease-out ${
                                area.avgScore >= 85 ? 'bg-emerald-500' : 
                                area.avgScore >= 70 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: loaded ? `${area.avgScore}%` : '0%' }}
                            ></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="group">
                          <div className="flex justify-between text-xs mb-1 text-gray-400 font-mono group-hover:text-gray-300 transition-colors">
                            <span>Sin datos disponibles</span>
                            <span>-</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-800 rounded-sm overflow-hidden"></div>
                        </div>
                      </>
                    )}
                 </div>
              </div>
              
              <div className="bg-[#121214] border border-gray-800 rounded-sm p-5 flex items-center justify-between hover:border-gray-700 transition-colors">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-200">Reporte Consolidado</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">Generar reporte ejecutivo consolidado para presentación corporativa.</p>
                  </div>
                  <button className="px-4 py-2 bg-white text-black text-xs font-bold uppercase rounded-sm hover:bg-gray-200 transition-colors border border-gray-400 transform active:scale-95">
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

export default HubProfesional;
