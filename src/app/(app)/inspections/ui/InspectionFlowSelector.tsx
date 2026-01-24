'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient, getSafeUser } from '@/lib/supabase/browser'
import RRHHInspectionManager from './RRHHInspectionManager'
import GSHInspectionManager from './GSHInspectionManager'
import type { InspectionRRHHArea } from '@/lib/services/inspections-rrhh.service'

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

export default function InspectionFlowSelector({
  templateOverride,
  context = 'self'
}: {
  templateOverride?: InspectionRRHHArea[] | null
  context?: 'self' | 'corporate'
}) {
  const [step, setStep] = useState<'department' | 'property' | 'dashboard'>('department')
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [availableProperties, setAvailableProperties] = useState<Property[]>([])
  const [allowedDepartments, setAllowedDepartments] = useState<string[] | null>(null)
  const [propertiesError, setPropertiesError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Cargar usuario y ubicaciones al montar
  useEffect(() => {
    const loadUserData = async () => {
      const supabase = createSupabaseBrowserClient()
      const user = await getSafeUser(supabase)
      
      if (user) {
        setCurrentUser(user)
        
        // Obtener perfil del usuario incluyendo allowed_departments
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, allowed_departments, location_id')
          .eq('id', user.id)
          .single()
        
        setUserProfile(profile)
        
        // Guardar departamentos permitidos para corporate_admin
        if (profile?.role === 'corporate_admin' && profile.allowed_departments) {
          setAllowedDepartments(profile.allowed_departments as string[])
        }

        const isAdmin = profile?.role === 'admin'
        const isCorporateAdmin = profile?.role === 'corporate_admin'

        // En contexto corporativo: todas las sedes activas son inspeccionables.
        // El permiso especial del perfil filtra DEPARTAMENTOS (allowed_departments), no sedes.
        if (context === 'corporate' || isAdmin || isCorporateAdmin) {
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
    const filterByCurrentUser = context === 'self'
    const isRRHH = selectedDepartment.id === 'rrhh'
    const isGSH = selectedDepartment.id === 'gsh'

    // Lista de módulos implementados
    const implementedModules = ['rrhh', 'gsh']
    const isImplemented = implementedModules.includes(selectedDepartment.id)

    // Si el módulo no está implementado, mostrar mensaje de pendiente
    if (!isImplemented) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 p-8">
          <div className="max-w-md text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-3">
              Módulo en Desarrollo
            </h2>
            
            <p className="text-slate-600 mb-6">
              El módulo de inspecciones para <span className="font-semibold text-slate-800">{selectedDepartment.name}</span> estará disponible próximamente.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Módulos disponibles actualmente:</strong>
              </p>
              <ul className="mt-2 text-sm text-blue-700 space-y-1">
                <li>✓ Recursos Humanos (RRHH)</li>
                <li>✓ Guest Service Handler (GSH)</li>
              </ul>
            </div>
            
            <button
              onClick={() => {
                setSelectedDepartment(null)
                setSelectedProperty(null)
                setStep('department')
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Seleccionar otro departamento
            </button>
          </div>
        </div>
      )
    }

    const commonProps = {
      locationId: selectedProperty.id,
      departmentName: selectedDepartment.name,
      propertyCode: selectedProperty.code,
      propertyName: selectedProperty.name,
      currentUser: currentUser,
      userName: currentUser.user_metadata?.full_name || currentUser.email || 'Usuario',
      isAdmin: isAdmin,
      filterByCurrentUser: filterByCurrentUser,
      onChangeProperty: () => {
        setSelectedProperty(null)
        setStep('property')
      },
      onChangeDepartment: () => {
        setSelectedDepartment(null)
        setSelectedProperty(null)
        setStep('department')
      }
    }

    if (isGSH) {
      return (
        <GSHInspectionManager
          {...commonProps}
          templateOverride={templateOverride}
          isGSH={true}
        />
      )
    }

    return (
      <RRHHInspectionManager
        {...commonProps}
        templateOverride={templateOverride}
        isRRHH={isRRHH}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="mt-2 text-slate-500 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white">
      <div className="p-4">
        {/* Indicador de paso actual */}
        <div className="mb-4 flex items-center gap-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full ${step === 'department' ? 'bg-blue-500' : 'bg-emerald-500'} flex items-center justify-center`}>
              {step === 'department' ? (
                <span className="text-[10px] font-bold text-white">1</span>
              ) : (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className={`text-xs font-medium ${step === 'department' ? 'text-blue-600' : 'text-emerald-600'}`}>
              {step === 'department' ? 'Departamento' : selectedDepartment?.name}
            </span>
          </div>
          
          <div className="flex-1 h-px bg-slate-200"></div>
          
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${step === 'property' ? 'text-blue-600' : 'text-slate-400'}`}>Propiedad</span>
            <div className={`w-6 h-6 rounded-full ${step === 'property' ? 'bg-blue-500' : 'bg-slate-200'} flex items-center justify-center`}>
              <span className={`text-[10px] font-bold ${step === 'property' ? 'text-white' : 'text-slate-500'}`}>2</span>
            </div>
          </div>
          
          {step === 'property' && (
            <button
              onClick={handleBack}
              className="ml-2 p-1.5 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
              title="Regresar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Department Selection - Grid expandido */}
        {step === 'department' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {DEPARTMENTS
              .filter(dept => {
                if (!allowedDepartments || allowedDepartments.length === 0) return true
                return allowedDepartments.includes(dept.name)
              })
              .map((dept) => (
              <button
                key={dept.id}
                onClick={() => handleDepartmentSelect(dept)}
                className="group relative overflow-hidden rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 p-3 text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                
                <div className="relative z-10">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-all duration-200 mb-1.5 group-hover:scale-105">
                    <DepartmentIcon type={dept.iconType} className="w-4 h-4 text-blue-600 group-hover:text-blue-700 transition-colors" />
                  </div>
                  
                  <h3 className="font-semibold text-slate-900 text-xs leading-tight group-hover:text-blue-700 transition-colors line-clamp-2">
                    {dept.name}
                  </h3>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Property Selection */}
        {step === 'property' && selectedDepartment && (
          <div>
            {propertiesError && (
              <div className="mb-3 bg-rose-50 border border-rose-200 rounded-lg p-3">
                <p className="text-rose-700 text-xs font-semibold">Error: {propertiesError}</p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {availableProperties.map((prop) => (
                <button
                  key={prop.id}
                  onClick={() => handlePropertySelect(prop)}
                  className="group relative overflow-hidden rounded-lg bg-white border border-slate-200 hover:border-cyan-400 hover:shadow-md transition-all duration-200 p-2.5"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  
                  <div className="relative z-10 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-cyan-100 group-hover:bg-cyan-200 flex items-center justify-center transition-all duration-200 flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="text-left min-w-0">
                      <h3 className="font-semibold text-slate-900 text-xs group-hover:text-cyan-700 transition-colors">{prop.code}</h3>
                      <p className="text-[10px] text-slate-500 truncate">{prop.name}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {!propertiesError && availableProperties.length === 0 && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                <svg className="w-6 h-6 text-amber-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-amber-900 font-medium text-sm">Sin propiedades asignadas</p>
                <p className="text-amber-700 text-xs mt-0.5">Contacta a tu administrador</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
