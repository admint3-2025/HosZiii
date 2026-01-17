'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient, getSafeUser } from '@/lib/supabase/browser'
import RRHHInspectionManager from './RRHHInspectionManager'

type Department = {
  id: string
  name: string
  iconType: 'users' | 'building' | 'bed' | 'wrench' | 'monitor' | 'utensils' | 'key' | 'calculator'
  color: string
}

type Property = {
  id: string
  code: string
  name: string
}

const DEPARTMENTS: Department[] = [
  { id: 'rrhh', name: 'RECURSOS HUMANOS', iconType: 'users', color: 'from-blue-500 to-blue-600' },
  { id: 'gsh', name: 'GSH', iconType: 'building', color: 'from-teal-500 to-teal-600' },
  { id: 'cuartos', name: 'DIV. CUARTOS', iconType: 'bed', color: 'from-purple-500 to-purple-600' },
  { id: 'mantenimiento', name: 'MANTENIMIENTO', iconType: 'wrench', color: 'from-orange-500 to-orange-600' },
  { id: 'sistemas', name: 'SISTEMAS', iconType: 'monitor', color: 'from-slate-500 to-slate-700' },
  { id: 'alimentos', name: 'ALIMENTOS Y BEBIDAS', iconType: 'utensils', color: 'from-red-500 to-red-600' },
  { id: 'llaves', name: 'AMA DE LLAVES', iconType: 'key', color: 'from-pink-500 to-pink-600' },
  { id: 'contabilidad', name: 'CONTABILIDAD', iconType: 'calculator', color: 'from-yellow-500 to-yellow-600' },
]

const DepartmentIcon = ({ type, className }: { type: Department['iconType'], className?: string }) => {
  const icons = {
    users: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    building: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    bed: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M5 21h14M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16m-4-5H9" />
      </svg>
    ),
    wrench: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    monitor: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    utensils: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    key: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
    calculator: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  }
  
  return icons[type]
}

export default function InspectionFlowSelector() {
  const [step, setStep] = useState<'department' | 'property' | 'dashboard'>('department')
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [availableProperties, setAvailableProperties] = useState<Property[]>([])
  const [propertiesError, setPropertiesError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Cargar usuario y ubicaciones al montar
  useEffect(() => {
    const loadUserData = async () => {
      const supabase = createSupabaseBrowserClient()
      const user = await getSafeUser(supabase)
      
      if (user) {
        setCurrentUser(user)
        
        // Obtener perfil del usuario
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .single()
        
        setUserProfile(profile)

        const isAdmin = profile?.role === 'admin'

        if (isAdmin) {
          const { data, error } = await supabase
            .from('locations')
            .select('id, code, name')
            .eq('is_active', true)
            .order('code')

          if (error) {
            setPropertiesError(error.message)
            setAvailableProperties([])
          } else {
            setAvailableProperties((data || []).map(l => ({ id: l.id, code: l.code, name: l.name })))
          }
        } else {
          const { data, error } = await supabase
            .from('user_locations')
            .select('location_id, locations(id, code, name)')
            .eq('user_id', user.id)

          if (error) {
            setPropertiesError(error.message)
            setAvailableProperties([])
          } else {
            const mapped = (data || [])
              .map((row: any) => row.locations)
              .filter(Boolean)
              .map((l: any) => ({ id: l.id, code: l.code, name: l.name }))
            setAvailableProperties(mapped)
          }
        }
      }
      
      setLoading(false)
    }
    
    loadUserData()
  }, [])

  const handleDepartmentSelect = (dept: Department) => {
    setSelectedDepartment(dept)
    setStep('property')
  }

  const handlePropertySelect = (prop: Property) => {
    setSelectedProperty(prop)
    setStep('dashboard')
  }

  const handleBack = () => {
    if (step === 'property') {
      setSelectedDepartment(null)
      setStep('department')
    } else if (step === 'dashboard') {
      setSelectedProperty(null)
      setStep('property')
    }
  }

  if (step === 'dashboard' && selectedDepartment && selectedProperty && currentUser) {
    const isAdmin = userProfile?.role === 'admin'

    return (
      <div>
        {/* Breadcrumb */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 mb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => {
                  setSelectedDepartment(null)
                  setSelectedProperty(null)
                  setStep('department')
                }}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                Inspecciones
              </button>
              <span className="text-slate-400">/</span>
              <button
                onClick={() => {
                  setSelectedProperty(null)
                  setStep('property')
                }}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                {selectedDepartment.name}
              </button>
              <span className="text-slate-400">/</span>
              <span className="text-slate-900 font-semibold">{selectedProperty.code}</span>
              {isAdmin && (
                <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                  ADMIN
                </span>
              )}
            </div>

            <button
              onClick={() => {
                const locationId = selectedProperty.id
                window.location.href = `/inspections/inbox?locationId=${encodeURIComponent(locationId)}`
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h11M9 12h11M9 18h11" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6l1 1 2-2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12l1 1 2-2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 18l1 1 2-2" />
              </svg>
              Bandeja
            </button>
          </div>
        </div>

        <RRHHInspectionManager
          locationId={selectedProperty.id}
          departmentName={selectedDepartment.name}
          propertyCode={selectedProperty.code}
          propertyName={selectedProperty.name}
          currentUser={currentUser}
          userName={currentUser.user_metadata?.full_name || currentUser.email || 'Usuario'}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Profesional */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 shadow-lg mb-8 p-6">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 to-transparent"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Módulo de Inspecciones Corporativas
                </h1>
                <p className="text-slate-400 text-sm">
                  {step === 'department' 
                    ? 'Seleccione el departamento a inspeccionar' 
                    : 'Seleccione la propiedad a evaluar'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Header Antiguo - Removido */}

        {/* Stepper Moderno */}
        {step !== 'department' && (
          <div className="mb-6 flex items-center gap-4 px-4 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-700">Departamento seleccionado</span>
            </div>
            
            <div className="flex-1 h-px bg-gradient-to-r from-emerald-300 to-blue-300"></div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-blue-700">Seleccionar propiedad</span>
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500">
                <span className="text-xs font-bold text-white">2</span>
              </div>
            </div>
          </div>
        )}

        {/* Botón de Regreso */}
        {step !== 'department' && (
          <button
            onClick={handleBack}
            className="mb-4 group inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all duration-300 text-sm"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Regresar
          </button>
        )}

        {/* Department Selection */}
        {step === 'department' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept.id}
                onClick={() => handleDepartmentSelect(dept)}
                className="group relative overflow-hidden rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-300 p-4 text-left"
              >
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-all duration-300 mb-3 group-hover:scale-105">
                    <DepartmentIcon type={dept.iconType} className="w-5 h-5 text-blue-600 group-hover:text-blue-700 transition-colors" />
                  </div>
                  
                  {/* Text */}
                  <h3 className="font-bold text-slate-900 text-sm leading-tight mb-1 group-hover:text-blue-700 transition-colors">
                    {dept.name}
                  </h3>
                  <p className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">Seleccionar</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Property Selection */}
        {step === 'property' && selectedDepartment && (
          <div>
            {/* Department Badge */}
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <DepartmentIcon type={selectedDepartment.iconType} className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Departamento</p>
                <p className="font-bold text-slate-900 text-sm">{selectedDepartment.name}</p>
              </div>
            </div>

            {propertiesError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 rounded-lg p-3">
                <p className="text-rose-700 text-xs font-semibold">Error cargando propiedades: {propertiesError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableProperties.map((prop) => (
                <button
                  key={prop.id}
                  onClick={() => handlePropertySelect(prop)}
                  className="group relative overflow-hidden rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-300 p-4"
                >
                  {/* Background Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-10 h-10 rounded-lg bg-cyan-100 group-hover:bg-cyan-200 flex items-center justify-center transition-all duration-300 group-hover:scale-105 flex-shrink-0">
                        <svg className="w-5 h-5 text-cyan-600 group-hover:text-cyan-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="text-left flex-1">
                        <h3 className="font-bold text-slate-900 text-sm mb-0.5 group-hover:text-blue-700 transition-colors">{prop.code}</h3>
                        <p className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors line-clamp-2">{prop.name}</p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {!propertiesError && availableProperties.length === 0 && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                <svg className="w-8 h-8 text-amber-400/50 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-amber-900 font-semibold text-sm">No hay propiedades disponibles</p>
                <p className="text-amber-800/70 text-xs mt-0.5">Contacta a tu administrador para obtener acceso</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
