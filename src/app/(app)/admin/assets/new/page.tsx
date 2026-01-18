import { redirect } from 'next/navigation'

// Redirect para compatibilidad: /admin/assets/new → /assets/new
export default function AdminAssetsNewRedirect() {
  redirect('/assets/new')
}
