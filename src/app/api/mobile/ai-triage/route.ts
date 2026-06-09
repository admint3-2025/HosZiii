import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTicketTriage, isAIEnabled } from '@/lib/ai/openrouter'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * POST /api/mobile/ai-triage
 *
 * Endpoint para que la app mobile solicite Apoyo IA sobre un ticket.
 * Autentica con el JWT de Supabase (Bearer token).
 *
 * Body: { ticketId, body, module: 'it' | 'maintenance' }
 */
export async function POST(req: NextRequest) {
  // ── Auth ──
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ).auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  // ── Validar rol ──
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const staffRoles = ['admin', 'corporate_admin', 'supervisor', 'agent_l1', 'agent_l2', 'maintenance_tech', 'maintenance_supervisor']
  if (!profile || !staffRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  if (!isAIEnabled()) {
    return NextResponse.json({ error: 'AI no habilitado' }, { status: 503 })
  }

  // ── Body ──
  const { ticketId, body, module } = await req.json() as {
    ticketId: string
    body: string
    module: 'it' | 'maintenance'
  }

  if (!ticketId || !body?.trim()) {
    return NextResponse.json({ error: 'ticketId y body son requeridos' }, { status: 400 })
  }

  // ── Obtener ticket ──
  const ticketTable = module === 'maintenance' ? 'tickets_maintenance' : 'tickets'
  const commentsTable = module === 'maintenance' ? 'ticket_comments_maintenance' : 'ticket_comments'
  const numberCol = module === 'maintenance' ? 'ticket_number' : 'ticket_number'

  const { data: ticket, error: ticketErr } = await supabase
    .from(ticketTable)
    .select('id, title, description, status, priority, created_at, requester_id, ticket_number, location_id')
    .eq('id', ticketId)
    .single()

  if (ticketErr || !ticket) {
    return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
  }

  // ── Historial de comentarios ──
  const { data: recentComments } = await supabase
    .from(commentsTable)
    .select('body, author_id, created_at')
    .eq('ticket_id', ticketId)
    .not('body', 'like', '🔒 **Ticket cerrado**%')
    .order('created_at', { ascending: true })
    .limit(10)

  const conversationHistory = (recentComments || [])
    .filter(c => c.body)
    .map(c => ({
      role: (c.body!.startsWith('🤖') ? 'assistant' : 'user') as 'user' | 'assistant',
      content: c.body!,
      timestamp: c.created_at ?? undefined,
    }))

  // ── Ubicación ──
  let locationName = ''
  if (ticket.location_id) {
    const { data: loc } = await supabase
      .from('locations')
      .select('name, code')
      .eq('id', ticket.location_id)
      .single()
    if (loc) locationName = loc.code ? `${loc.code} - ${loc.name}` : loc.name
  }

  // ── Llamar AI ──
  const triage = await getTicketTriage({
    ticketCode: `#${ticket.ticket_number}`,
    title: ticket.title,
    description: ticket.description || '',
    status: ticket.status,
    priority: ticket.priority,
    location: locationName,
    userRole: profile.role,
    conversationHistory,
    ticketCreatedAt: ticket.created_at,
    currentCommentAt: new Date().toISOString(),
  }, body)

  if (!triage) {
    return NextResponse.json({ error: 'AI no pudo generar respuesta' }, { status: 502 })
  }

  // ── Insertar respuesta AI como comentario interno ──
  const confidenceLabel = { high: 'alta', medium: 'media', low: 'baja' }[triage.confidence]
  const escalateNote = triage.shouldEscalate ? '\n\n⚠️ **Recomendación:** Considera escalar este ticket.' : ''
  const aiBody = `🤖 **Apoyo IA** (confianza ${confidenceLabel}):\n\n${triage.suggestedReply}${escalateNote}`

  const insertPayload = module === 'maintenance'
    ? { ticket_id: ticketId, body: aiBody, visibility: 'internal', created_by: user.id }
    : { ticket_id: ticketId, body: aiBody, visibility: 'internal', author_id: user.id }

  await supabase.from(commentsTable).insert(insertPayload)

  return NextResponse.json({ ok: true, confidence: triage.confidence, shouldEscalate: triage.shouldEscalate })
}
