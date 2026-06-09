import type { UserPlanningProfile } from '@/app/(app)/planificacion/planning-page-context'

const DEMO_BASE_PATH = '/demo/planificacion'

const DEMO_USER_PROFILE: UserPlanningProfile = {
  role: 'viewer',
  isAdmin: false,
  isCorporate: true,
  departamento: null,
  allowed_departments: null,
  full_name: 'Demo Planeacion ZIII',
}

export function getPlanningDemoPageContext() {
  return {
    userProfile: DEMO_USER_PROFILE,
    initialYear: new Date().getFullYear(),
    basePath: DEMO_BASE_PATH,
    demoMode: true as const,
  }
}