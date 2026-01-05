import { createSupabaseServerClient } from '@/lib/supabase/server'
import TicketCreateForm from './ui/TicketCreateForm'

export default async function NewTicketPage() {
  const supabase = await createSupabaseServerClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id,name,parent_id,sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header mejorado */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl -ml-32 -mb-32"></div>
          
          <div className="relative z-10 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Crear ticket</h1>
                <p className="text-blue-100 text-xs">Completa la información para evitar ida y vuelta</p>
              </div>
            </div>
          </div>
        </div>

        <TicketCreateForm
          categories={(categories ?? []).filter((c) => c.name !== 'BEO - Evento')}
        />
      </div>
    </main>
  )
}
