import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireOpsUser } from '@/lib/ops/auth'
import { listEntidades, createEntidad, deleteEntidad, updateEntidad } from '@/lib/ops/service'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireOpsUser(supabase)
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

    const data = await listEntidades(supabase)
    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message ?? error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireOpsUser(supabase)
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    if (!auth.canManage) return NextResponse.json({ ok: false, error: 'Sin permisos de gestión' }, { status: 403 })

    const body = await request.json()
    const data = await createEntidad(supabase, body)
    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message ?? error) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireOpsUser(supabase)
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    if (!auth.canManage) return NextResponse.json({ ok: false, error: 'Sin permisos de gestión' }, { status: 403 })

    const body = await request.json()
    if (!body?.id) return NextResponse.json({ ok: false, error: 'id requerido' }, { status: 400 })

    const data = await updateEntidad(supabase, body.id, {
      ...(typeof body.codigo === 'string' ? { codigo: body.codigo.trim() || null } : {}),
      ...(typeof body.nombre === 'string' ? { nombre: body.nombre.trim() } : {}),
      ...(typeof body.tipo_entidad === 'string' ? { tipo_entidad: body.tipo_entidad.trim() } : {}),
      ...(typeof body.categoria === 'string' ? { categoria: body.categoria.trim() } : {}),
      ...(typeof body.departamento === 'string' ? { departamento: body.departamento.trim() } : {}),
      ...(body.centro_costo !== undefined ? { centro_costo: typeof body.centro_costo === 'string' ? body.centro_costo.trim() || null : null } : {}),
      ...(body.responsable_proveedor_id !== undefined ? { responsable_proveedor_id: body.responsable_proveedor_id || null } : {}),
      ...(typeof body.activo === 'boolean' ? { activo: body.activo } : {}),
    })

    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message ?? error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireOpsUser(supabase)
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    if (!auth.canManage) return NextResponse.json({ ok: false, error: 'Sin permisos de gestión' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ ok: false, error: 'id requerido' }, { status: 400 })

    await deleteEntidad(supabase, id)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message ?? error) }, { status: 500 })
  }
}
