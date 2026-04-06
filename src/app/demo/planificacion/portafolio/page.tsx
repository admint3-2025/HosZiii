import PlanningHubClient from '@/app/(app)/planificacion/PlanningHubClient'
import { getPlanningDemoPageContext } from '../demo-page-context'

export const dynamic = 'force-dynamic'

export default function DemoPlanificacionPortafolioPage() {
  const context = getPlanningDemoPageContext()

  return <PlanningHubClient {...context} mode="portfolio" />
}