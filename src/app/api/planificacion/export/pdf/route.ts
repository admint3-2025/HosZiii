import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'
import { getPlanningExportBundle, normalizePlanningValue } from '@/lib/planificacion/export'
import { generatePlanningAnnualReportPdf } from '@/lib/pdf/planning-annual-report'
import { loadPdfLogoFromUrl, loadZiiiLogoDataUrl } from '@/lib/pdf/ziii-logo'

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
    const reportMode = searchParams.get('reportMode') === 'alerts' ? 'alerts' : 'informative'
    const brandLogoMode = (searchParams.get('brandLogoMode') ?? '').trim().toLowerCase()
    const brandLogoKey = (searchParams.get('brandLogoKey') ?? '').trim().toLowerCase()
    const brandLogoUrl = (searchParams.get('brandLogoUrl') ?? '').trim()

    const bundle = await getPlanningExportBundle({
      supabase,
      adminSupabase: createSupabaseAdminClient(),
      userId: user.id,
      filters: {
        year: Number.isFinite(year) ? year : new Date().getFullYear(),
        department,
        locationId,
        reportMode,
      },
    })

    const requestOrigin = new URL(request.url).origin
    const logo = await loadZiiiLogoDataUrl({ boxWidth: 160, boxHeight: 160, quality: 84 })

    let brandLogo = null
    if (brandLogoMode !== 'none') {
      if (brandLogoKey) {
        brandLogo = await loadPdfLogoFromUrl(
          `${requestOrigin}/api/brand-logo?brand=${encodeURIComponent(brandLogoKey)}`,
          { boxWidth: 360, boxHeight: 120, quality: 84 }
        )
      } else if (/^https?:\/\//i.test(brandLogoUrl)) {
        brandLogo = await loadPdfLogoFromUrl(
          `${requestOrigin}/api/proxy-image?url=${encodeURIComponent(brandLogoUrl)}`,
          { boxWidth: 360, boxHeight: 120, quality: 84 }
        )
      }
    }

    const pdf = generatePlanningAnnualReportPdf({
      bundle,
      logo: logo ? { ...logo, width: 36, height: 36 } : undefined,
      brandLogo: brandLogo ? { ...brandLogo, width: 116, height: 34 } : undefined,
    })
    const fileName = `plan-anual-${bundle.year}-${bundle.filters.department === 'ALL' ? 'todos' : bundle.filters.department.toLowerCase().replace(/\s+/g, '-')}-${reportMode}.pdf`

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