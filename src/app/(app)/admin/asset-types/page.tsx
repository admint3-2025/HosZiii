import { createSupabaseServerClient } from '@/lib/supabase/server'
import AssetTypesManager from '@/components/admin/AssetTypesManager'

export default async function Page() {
  // Server component could prefetch, but the manager fetches client-side
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Administrar Tipos de Activo</h1>
      <div className="bg-white rounded shadow p-6">
        <AssetTypesManager />
      </div>
    </div>
  )
}
