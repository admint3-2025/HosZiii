import * as XLSX from 'xlsx'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient, getSafeServerUser } from '@/lib/supabase/server'
import {
  formatPlanningCurrency,
  getPlanningExportBundle,
  normalizePlanningValue,
  PLANNING_MONTHS,
} from '@/lib/planificacion/export'

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

    const workbook = XLSX.utils.book_new()
    const title = `ZIII - Plan anual por departamento ${bundle.year}`
    const generatedAt = bundle.generatedAt.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })

    const summarySheet = XLSX.utils.aoa_to_sheet([
      [title],
      ['Generado', generatedAt],
      ['Usuario', bundle.profile.fullName ?? 'Usuario del sistema'],
      ['Departamento', bundle.filters.departmentLabel],
      ['Sede', bundle.filters.locationLabel],
      [],
      ['Indicador', 'Valor'],
      ['Planes activos', bundle.summary.activePlans],
      ['Eventos del año', bundle.summary.totalEvents],
      ['Presupuesto planeado', formatPlanningCurrency(bundle.summary.totalPlanned)],
      ['Alertas críticas', bundle.summary.totalCritical],
    ])

    summarySheet['!cols'] = [{ wch: 28 }, { wch: 24 }]
    summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen')

    const matrixRows = [
      [title],
      [`Vista: ${bundle.filters.departmentLabel} | ${bundle.filters.locationLabel}`],
      [`Generado: ${generatedAt}`],
      [],
      ['Plan / entidad', 'Sede', 'Departamento', 'Estado', ...PLANNING_MONTHS, 'Total anual'],
      ...bundle.rows.map((row) => [
        `${row.plan.nombre}\n${row.plan.entidad?.nombre ?? 'Sin entidad'} | ${row.plan.responsable?.nombre ?? 'Sin proveedor'}`,
        row.locationLabel,
        row.department.label,
        row.plan.estado,
        ...Array.from({ length: 12 }, (_, index) => {
          const cell = row.matrix.get(index + 1)
          return cell ? `${cell.count} evt | ${formatPlanningCurrency(cell.budget)}` : '-'
        }),
        formatPlanningCurrency(row.annualBudget),
      ]),
    ]

    const matrixSheet = XLSX.utils.aoa_to_sheet(matrixRows)
    matrixSheet['!cols'] = [
      { wch: 42 },
      { wch: 22 },
      { wch: 18 },
      { wch: 12 },
      ...Array.from({ length: 12 }, () => ({ wch: 16 })),
      { wch: 18 },
    ]
    matrixSheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 16 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 16 } },
    ]
    matrixSheet['!autofilter'] = { ref: `A5:Q${Math.max(matrixRows.length, 5)}` }
    XLSX.utils.book_append_sheet(workbook, matrixSheet, 'Matriz anual')

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    const fileName = `plan-anual-${bundle.year}.xlsx`

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[planificacion/export/excel]', error)
    return new Response(error?.message ?? 'Error al generar Excel', { status: 500 })
  }
}