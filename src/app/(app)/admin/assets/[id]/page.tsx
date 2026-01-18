import { redirect } from 'next/navigation'

// Redirect para compatibilidad: /admin/assets/[id] → /assets/[id]
export default async function AdminAssetDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/assets/${id}`)
}
