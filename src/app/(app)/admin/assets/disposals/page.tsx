import { redirect } from 'next/navigation'

// Redirect para compatibilidad: /admin/assets/disposals → /assets/disposals
export default function AdminAssetsDisposalsRedirect() {
  redirect('/assets/disposals')
}
