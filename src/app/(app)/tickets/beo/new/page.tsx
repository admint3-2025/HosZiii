import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import BEOTicketForm from '@/components/BEOTicketForm'

export const metadata = {
  title: 'Crear Ticket BEO | ZIII HoS',
  description: 'Crear solicitud técnica basada en BEO (Banquet Event Order)',
}

export default async function CreateBEOTicketPage() {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, department')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Solo usuarios de ventas/eventos pueden crear tickets BEO
  const allowedDepartments = [
    'ventas',
    'comercial',
    'banquetes',
    'eventos',
    'revenue'
  ]

  const userDepartment = (profile.department || '').toLowerCase()
  
  const canCreateBEO = 
    profile.role === 'admin' || 
    profile.role === 'supervisor' ||
    allowedDepartments.some(dept => userDepartment.includes(dept))

  if (!canCreateBEO) {
    redirect('/dashboard')
  }

  // Obtener sedes disponibles
  const { data: locations } = await supabase
    .from('locations')
    .select('id, code, name')
    .eq('is_active', true)
    .order('code')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Nuevo Ticket BEO</h1>
              <p className="text-sm text-gray-600 mt-1">
                Requerimientos técnicos para eventos (Banquet Event Order)
              </p>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">¿Qué es un ticket BEO?</p>
                <p>
                  Los tickets BEO registran requerimientos técnicos específicos para eventos basados en 
                  Banquet Event Orders de OPERA. Esto asegura que IT tenga visibilidad completa y 
                  trazabilidad de todas las solicitudes con el documento BEO adjunto como soporte.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <BEOTicketForm
          locations={locations || []}
          requesterId={profile.id}
        />
      </div>
    </div>
  )
}
