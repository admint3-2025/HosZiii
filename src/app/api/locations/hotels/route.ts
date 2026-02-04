import { NextResponse } from "next/server"
import { createSupabaseServerClient, getSafeServerUser } from "@/lib/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/locations/hotels
 * Retorna solo ubicaciones de tipo 'hotel' (excluye corporativos, oficinas, etc.)
 * Usado para selectores de inspecciones hoteleras
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const user = await getSafeServerUser()

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, can_manage_assets")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 })
    }

    // Admin o usuario con permiso global: traer todos los hoteles activos
    if (profile.role === "admin" || profile.can_manage_assets === true) {
      const admin = createSupabaseAdminClient()
      const { data, error } = await admin
        .from("locations")
        .select("id, code, name, business_type")
        .eq("business_type", "hotel")
        .eq("is_active", true)
        .order("code", { ascending: true })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ locations: data || [] })
    }

    // Supervisores/agentes: limitar a hoteles asignados
    const { data: userLocs, error: locErr } = await supabase
      .from("user_locations")
      .select("location_id")
      .eq("user_id", user.id)

    if (locErr) return NextResponse.json({ error: locErr.message }, { status: 500 })

    const locationIds = (userLocs || []).map((l) => l.location_id).filter(Boolean)

    // fallback al location_id del profile si no hay registros en user_locations
    if (!locationIds.length && (profile as any).location_id) {
      locationIds.push((profile as any).location_id)
    }

    if (!locationIds.length) {
      return NextResponse.json({ locations: [] })
    }

    const { data, error } = await supabase
      .from("locations")
      .select("id, code, name, business_type")
      .in("id", locationIds)
      .eq("business_type", "hotel")
      .eq("is_active", true)
      .order("code", { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ locations: data || [] })
  } catch (err: any) {
    console.error("[locations/hotels]", err)
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 })
  }
}
