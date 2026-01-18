import { redirect } from 'next/navigation'

// Redirect para compatibilidad: /admin/assets → /assets
export default function AdminAssetsRedirect() {
  redirect('/assets')
}
