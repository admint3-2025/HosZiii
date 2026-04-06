import PlanningHubClient from '@/app/(app)/planificacion/PlanningHubClient'
import { getPlanningDemoPageContext } from '../demo-page-context'

export const dynamic = 'force-dynamic'

export default function DemoPlanificacionCatalogosPage() {
  const context = getPlanningDemoPageContext()

  return <PlanningHubClient {...context} mode="catalogs" />
}