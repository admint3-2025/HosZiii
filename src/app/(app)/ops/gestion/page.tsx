import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function OpsGestionPage() {
  // Modulo desactivado temporalmente para reinicio funcional sin romper navegacion.
  redirect('/hub')
}
