import PlanningHubClient from './PlanningHubClient'
import { getPlanningPageContext } from './planning-page-context'

export const dynamic = 'force-dynamic'

export default async function PlanificacionPage() {
  const { userProfile, initialYear } = await getPlanningPageContext()

  return <PlanningHubClient userProfile={userProfile} initialYear={initialYear} mode="overview" />
}
