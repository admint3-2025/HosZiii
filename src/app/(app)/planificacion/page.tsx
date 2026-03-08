import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export type UserPlanningProfile = {
  role: string
  isAdmin: boolean
  isCorporate: boolean
  departamento: string | null
  allowed_departments: string[] | null
  full_name: string | null
}

export default async function PlanificacionPage() {
  // Modulo desactivado temporalmente para reinicio funcional sin romper navegacion.
  redirect('/hub')
}
