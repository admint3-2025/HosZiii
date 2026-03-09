import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'
import { getPlanningExportBundle, normalizePlanningValue } from '@/lib/planificacion/export'
import { generatePlanningAnnualReportPdf } from '@/lib/pdf/planning-annual-report'
import { loadZiiiLogoDataUrl } from '@/lib/pdf/ziii-logo'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const user = await getSafeServerUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = Number(searchParams.get('year') ?? new Date().getFullYear())
    const department = normalizePlanningValue(searchParams.get('department')) || 'ALL'
    const locationId = searchParams.get('locationId') ?? 'ALL'

    const bundle = await getPlanningExportBundle({
      supabase,
      adminSupabase: createSupabaseAdminClient(),
      userId: user.id,
      filters: {
        year: Number.isFinite(year) ? year : new Date().getFullYear(),
        department,
        locationId,
      },
    })

    const logo = await loadZiiiLogoDataUrl()
    const pdf = generatePlanningAnnualReportPdf({ bundle, logo: logo ?? undefined })
    const fileName = `plan-anual-${bundle.year}-${bundle.filters.department === 'ALL' ? 'todos' : bundle.filters.department.toLowerCase().replace(/\s+/g, '-')}.pdf`

    return new Response(new Blob([pdf], { type: 'application/pdf' }), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[planificacion/export/pdf]', error)
    return new Response(error?.message ?? 'Error al generar PDF', { status: 500 })
  }
}