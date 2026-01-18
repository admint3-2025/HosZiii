import { redirect } from 'next/navigation'

export default function AdminPage() {
  // La validación está en layout.tsx, aquí solo redirigimos a usuarios
  redirect('/admin/users')
}
