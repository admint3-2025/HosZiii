import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, location_id, can_manage_assets")
      .eq("id", user.id)
      .single()

    if (!profile || !["admin", "supervisor"].includes(profile.role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const query = (searchParams.get("q") || "").trim()
    const locationId = (searchParams.get("locationId") || "").trim()

    // Determinar si puede ver todos los activos
    const canViewAllAssets = profile.role === "admin" || profile.can_manage_assets === true
    const adminClient = canViewAllAssets ? createSupabaseAdminClient() : null
    const client = adminClient || supabase

    // Para no-admin sin permiso global: validar sedes accesibles y forzar filtro
    let allowedLocationIds: string[] = []
    if (!canViewAllAssets) {
      const { data: userLocs } = await supabase
        .from("user_locations")
        .select("location_id")
        .eq("user_id", user.id)

      allowedLocationIds = (userLocs || []).map((l) => l.location_id).filter(Boolean)
      if (!allowedLocationIds.length && profile.location_id) {
        allowedLocationIds.push(profile.location_id)
      }
      if (!allowedLocationIds.length) {
        return NextResponse.json({ assets: [] })
      }
      // Si se solicita locationId, validar pertenencia
      if (locationId && !allowedLocationIds.includes(locationId)) {
        return NextResponse.json({ error: "Sede no permitida" }, { status: 403 })
      }
    }

    let assetQuery = client
      .from("assets_it")
      .select("id, asset_code, category, status, brand, model, location_id, asset_location:locations!location_id(code, name)")
      .is("deleted_at", null)

    if (locationId) {
      assetQuery = assetQuery.eq("location_id", locationId)
    } else if (!canViewAllAssets && allowedLocationIds.length) {
      assetQuery = assetQuery.in("location_id", allowedLocationIds)
    }

    // Aplicar filtro de búsqueda solo si se proporciona un query
    if (query.length >= 2) {
      assetQuery = assetQuery.or(`asset_code.ilike.%${query}%,brand.ilike.%${query}%,model.ilike.%${query}%`)
    }

    const { data, error } = await assetQuery
      .order("asset_code", { ascending: true })
      .limit(200)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Mapear asset_code a asset_tag y category a asset_type para compatibilidad con el frontend
    const mappedAssets = (data ?? []).map((asset: any) => ({
      ...asset,
      asset_tag: asset.asset_code,
      asset_type: asset.category,
    }))

    return NextResponse.json({ assets: mappedAssets })
  } catch (err: any) {
    console.error("[assets/search]", err)
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 })
  }
}
