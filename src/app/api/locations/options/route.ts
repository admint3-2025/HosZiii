import { NextResponse } from "next/server"
import { createSupabaseServerClient, getSafeServerUser } from "@/lib/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const user = await getSafeServerUser()

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, can_manage_assets, is_corporate, location_id")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 })
    }

    // Solo admin o usuarios con permiso global de activos ven todas las sedes.
    // Un supervisor corporativo debe limitarse a sus sedes asignadas.
    if (profile.role === "admin" || profile.can_manage_assets === true) {
      const admin = createSupabaseAdminClient()
      const { data, error } = await admin
        .from("locations")
        .select("id, code, name")
        .order("code", { ascending: true })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, locations: data || [] })
    }

    // Supervisores/agentes: limitar a sedes asignadas (sin depender solo de RLS)
    const { data: userLocs, error: locErr } = await supabase
      .from("user_locations")
      .select("location_id")
      .eq("user_id", user.id)

    if (locErr) return NextResponse.json({ error: locErr.message }, { status: 500 })

    const locationIds = (userLocs || []).map((l) => l.location_id).filter(Boolean)

    // fallback al location_id del profile si no hay registros en user_locations
    if (!locationIds.length && profile.location_id) {
      locationIds.push(profile.location_id)
    }

    if (!locationIds.length) {
      return NextResponse.json({ ok: true, locations: [] })
    }

    const { data, error } = await supabase
      .from("locations")
      .select("id, code, name")
      .in("id", locationIds)
      .order("code", { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, locations: data || [] })
  } catch (err: any) {
    console.error("[locations/options]", err)
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 })
  }
}
