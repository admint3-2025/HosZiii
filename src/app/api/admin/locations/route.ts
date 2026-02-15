import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 })

  const admin = createSupabaseAdminClient()

  const { data: locations, error } = await admin
    .from('locations')
    .select('id,name,code,business_type,total_rooms,total_floors,brand,city,state,country,address,phone,email,manager_name,is_active,created_at')
    .order('name')

  if (error) return new Response(error.message, { status: 500 })

  return Response.json({ locations: locations ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
  const businessType = ['hotel', 'corporate', 'office', 'warehouse', 'other'].includes(body?.business_type)
    ? body.business_type
    : 'hotel'
  const city = typeof body?.city === 'string' ? body.city.trim() : ''
  const state = typeof body?.state === 'string' ? body.state.trim() : ''
  const country = typeof body?.country === 'string' ? body.country.trim() : 'México'
  const address = typeof body?.address === 'string' ? body.address.trim() : ''
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const managerName = typeof body?.manager_name === 'string' ? body.manager_name.trim() : ''
  const totalRooms = typeof body?.total_rooms === 'number' && body.total_rooms > 0 ? body.total_rooms : null
  const totalFloors = typeof body?.total_floors === 'number' && body.total_floors > 0 ? body.total_floors : null
  const brand = typeof body?.brand === 'string' ? body.brand.trim() : ''

  if (!name) return new Response('Nombre requerido', { status: 400 })
  if (!code) return new Response('Código requerido', { status: 400 })

  const admin = createSupabaseAdminClient()

  const { data: created, error } = await admin
    .from('locations')
    .insert({
      name,
      code,
      business_type: businessType,
      total_rooms: totalRooms,
      total_floors: totalFloors,
      brand: brand || null,
      city: city || null,
      state: state || null,
      country: country || null,
      address: address || null,
      phone: phone || null,
      email: email || null,
      manager_name: managerName || null,
      is_active: true,
    })
    .select('id,name,code')
    .single()

  if (error) return new Response(error.message, { status: 400 })

  await admin.from('audit_log').insert({
    entity_type: 'location',
    entity_id: created.id,
    action: 'CREATE',
    actor_id: user.id,
    metadata: { name, code, city, state },
  })

  return Response.json(created)
}
