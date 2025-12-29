import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AssetDetailView from './ui/AssetDetailView'

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  // Obtener activo
  const { data: asset, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !asset) {
    notFound()
  }

  return <AssetDetailView asset={asset} />
}
