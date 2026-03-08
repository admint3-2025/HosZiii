import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type OpsSearchParams = {
  view?: string
  departamento?: string
  centro_costo?: string
  estado?: string
  from?: string
  to?: string
  as_of_date?: string
}

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<OpsSearchParams>
}) {
  void searchParams
  // Modulo desactivado temporalmente para reinicio funcional sin romper navegacion.
  redirect('/hub')
}
