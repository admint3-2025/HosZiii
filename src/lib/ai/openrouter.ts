/**
 * Adaptador OpenRouter para triage de tickets
 * Llama a la API de OpenRouter (compatible con OpenAI) para generar sugerencias.
 *
 * Variables de entorno requeridas:
 *   OPENROUTER_API_KEY   — sk-or-v1-...
 *   OPENROUTER_MODEL     — modelo a usar (ver opciones abajo)
 *   AI_TRIAGE_ENABLED    — "true" para activar
 *
 * Modelos recomendados (configurar en OPENROUTER_MODEL):
 *   google/gemini-2.0-flash-001          — Recomendado: rápido, análisis preciso, bajo costo
 *   google/gemini-2.5-pro-preview-03-25  — Máxima calidad analítica (más lento y costoso)
 *   anthropic/claude-3.5-haiku-20241022  — Muy preciso siguiendo instrucciones complejas
 *   anthropic/claude-3.7-sonnet          — Máxima calidad Anthropic
 *   openai/gpt-4o-mini                   — Opción OpenAI balanceada
 */

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'google/gemini-2.0-flash-001'
const TIMEOUT_MS = 20_000 // ampliado para modelos más analíticos

export type TriageResult = {
  suggestedReply: string
  confidence: 'high' | 'medium' | 'low'
  shouldEscalate: boolean
}

export type TicketContext = {
  ticketCode: string
  title: string
  description: string
  category?: string
  priority?: string
  status: string
  location?: string
  kbArticles?: { title: string; content: string }[]
  userRole?: string
  conversationHistory?: { role: 'user' | 'assistant'; content: string; timestamp?: string }[]
  ticketCreatedAt?: string   // ISO string — fecha de creación del ticket
  currentCommentAt?: string  // ISO string — fecha del comentario actual
}

function formatDateES(iso: string): string {
  try {
    const d = new Date(iso)
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    const day = d.getUTCDate()
    const month = months[d.getUTCMonth()]
    const year = d.getUTCFullYear()
    const hh = String(d.getUTCHours()).padStart(2, '0')
    const mm = String(d.getUTCMinutes()).padStart(2, '0')
    return `${day} ${month} ${year}, ${hh}:${mm} UTC`
  } catch { return iso }
}

function minutesBetween(from: string, to: string): number {
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000))
}

/**
 * Devuelve true si el módulo AI está habilitado vía env.
 */
export function isAIEnabled(): boolean {
  return process.env.AI_TRIAGE_ENABLED === 'true' && !!process.env.OPENROUTER_API_KEY
}

/**
 * Genera una sugerencia de respuesta para un ticket usando OpenRouter.
 * Si AI está deshabilitado o falla, retorna null.
 */
export async function getTicketTriage(
  ticket: TicketContext,
  userQuestion?: string,
): Promise<TriageResult | null> {
  if (!isAIEnabled()) return null

  const apiKey = process.env.OPENROUTER_API_KEY!
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL

  const kbContext =
    ticket.kbArticles && ticket.kbArticles.length > 0
      ? '\n\nARTÍCULOS DE BASE DE CONOCIMIENTO RELEVANTES:\n' +
        ticket.kbArticles
          .map((a, i) => `[${i + 1}] ${a.title}:\n${a.content.slice(0, 500)}`)
          .join('\n\n')
      : ''

  const isTechRole = ticket.userRole && ['admin', 'corporate_admin', 'supervisor', 'agent', 'tech_l1', 'tech_l2'].includes(ticket.userRole)

  const hasHistory = (ticket.conversationHistory ?? []).length > 0

  // Bloque de tiempo real para que el modelo pueda verificar afirmaciones temporales
  let timelineInfo = ''
  if (ticket.ticketCreatedAt && ticket.currentCommentAt) {
    const elapsedMinutes = minutesBetween(ticket.ticketCreatedAt, ticket.currentCommentAt)
    const elapsedText = elapsedMinutes < 60
      ? `${elapsedMinutes} minuto(s)`
      : elapsedMinutes < 1440
        ? `${Math.floor(elapsedMinutes / 60)} hora(s) y ${elapsedMinutes % 60} minuto(s)`
        : `${Math.floor(elapsedMinutes / 1440)} día(s) y ${Math.floor((elapsedMinutes % 1440) / 60)} hora(s)`
    timelineInfo = `\nCREACIÓN DEL TICKET: ${formatDateES(ticket.ticketCreatedAt)}\nCOMENTARIO ACTUAL: ${formatDateES(ticket.currentCommentAt)}\nTIEMPO REAL TRANSCURRIDO DESDE CREACIÓN: ${elapsedText} (${elapsedMinutes} min)`
  } else if (ticket.ticketCreatedAt) {
    timelineInfo = `\nCREACIÓN DEL TICKET: ${formatDateES(ticket.ticketCreatedAt)}`
  }

  const antiRepetitionRule = hasHistory
    ? '\n- CRÍTICO: Ya existe un historial de conversación. NO repitas sugerencias que ya diste. Responde al último mensaje del usuario teniendo en cuenta lo que ya se intentó o dijo antes.'
    : ''

  const timeVerificationRule = timelineInfo
    ? `\n- VERIFICACIÓN TEMPORAL: Tienes acceso a las marcas de tiempo reales de cada mensaje. Si el usuario afirma que "lleva X horas/días esperando", "ya pasaron 24 horas" u otras afirmaciones sobre tiempo transcurrido, CRÚCELAS contra los timestamps reales. Si la afirmación es incorrecta o exagerada, corrígela con empatía pero con precisión: indícale cuánto tiempo ha transcurrido REALMENTE según el sistema.`
    : ''

  const systemPrompt = isTechRole
    ? `Eres un agente de helpdesk de nivel 2 para ZIII, empresa de hospitalidad/hotelería en México.
Tu tarea es analizar tickets de soporte y generar una sugerencia de respuesta TÉCNICA, CONCRETA y ACCIONABLE en español.

REGLAS:
- NO saludes ni agradezcas el contacto. Ve directo al diagnóstico y los pasos.
- Proporciona pasos de resolución numerados y específicos: comandos, rutas, configuraciones, herramientas.
- Si necesitas más información, indica exactamente QUÉ datos técnicos faltan y POR QUÉ.
- Considera el contexto hotelero: impacto en huéspedes, urgencia operativa, disponibilidad de técnicos en sitio.
- Máximo 4 pasos. Sé directo y técnico.${antiRepetitionRule}${timeVerificationRule}

Responde SOLO con JSON válido:
{
  "suggestedReply": "respuesta técnica con pasos de diagnóstico y resolución",
  "confidence": "high|medium|low",
  "shouldEscalate": true|false
}
- confidence: high = causa identificada y pasos claros, medium = requiere diagnóstico en sitio o más contexto, low = problema complejo o información insuficiente
- shouldEscalate: true si requiere especialista externo, proveedor, o afecta operación crítica del hotel`
    : `Eres el asistente de soporte de primer contacto para ZIII, empresa de hospitalidad/hotelería en México.
Tu tarea es orientar al usuario que reportó el problema con lenguaje SIMPLE, CLARO y SIN JERGA TÉCNICA, y darle pasos concretos que pueda intentar por su cuenta antes de que llegue un técnico.

ESTRUCTURA DE RESPUESTA (siempre en este orden):
1. Una oración corta describiendo qué puede estar causando el problema (sin tecnicismos).
2. Pasos numerados que el usuario puede intentar YA (máximo 3, solo si son seguros y sencillos).
3. Una oración final indicando: "Nuestro equipo técnico revisará tu caso. Si los pasos anteriores resolvieron el problema, responde confirmándolo para que podamos cerrarlo."
   — Si el problema claramente necesita técnico presencial, di en su lugar: "Un técnico se comunicará contigo a la brevedad. Ten a la mano [indicar qué información necesitarán]."

REGLAS:
- NO saludes ni agradezcas el contacto. Ve directo.
- Usa verbos de acción simples: "apaga", "desconecta", "espera", "abre", "verifica".
- NO menciones términos como IP, driver, firmware, cache, DNS salvo que sea absolutamente necesario y lo expliques en palabras simples.
- Si no hay pasos seguros que el usuario pueda hacer solo, ve directo al cierre con técnico.
- Máximo 3 pasos de auto-atención. Si el problema es claramente hardware o de infraestructura, no inventes pasos inútiles.
- Si el usuario pide algo que requiere una decisión humana (como prestar un equipo, autorizar un gasto, etc.), reconoce su solicitud e indícale que un técnico la gestionará.${antiRepetitionRule}${timeVerificationRule}

Responde SOLO con JSON válido:
{
  "suggestedReply": "respuesta estructurada para el usuario final",
  "confidence": "high|medium|low",
  "shouldEscalate": true|false
}
- confidence: high = hay pasos claros que el usuario puede intentar, medium = podría resolverse con guía pero necesita verificación técnica, low = requiere técnico presencial sí o sí
- shouldEscalate: true si el problema afecta operación del hotel, múltiples usuarios, o requiere intervención física`

  const ticketContextContent = `TICKET: ${ticket.ticketCode}
TÍTULO: ${ticket.title}
DESCRIPCIÓN: ${ticket.description}
CATEGORÍA: ${ticket.category || 'No especificada'}
PRIORIDAD: ${ticket.priority || 'No especificada'}
ESTADO: ${ticket.status}
SEDE: ${ticket.location || 'No especificada'}${timelineInfo}${kbContext}`

  // Construir el historial de conversación como mensajes de chat para evitar repetición
  const history = ticket.conversationHistory ?? []
  const currentComment = userQuestion
    ? (isTechRole ? `PREGUNTA DEL TÉCNICO: ${userQuestion}` : userQuestion)
    : ''

  const chatMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ]

  if (history.length === 0) {
    // Primera respuesta: combinar contexto del ticket con el comentario actual en un solo mensaje
    const combined = currentComment
      ? `${ticketContextContent}\n\nCOMENTARIO DEL USUARIO: ${currentComment}`
      : ticketContextContent
    chatMessages.push({ role: 'user', content: combined })
  } else {
    // Hay historial: primero el contexto, luego los turnos anteriores, luego el nuevo mensaje
    chatMessages.push({ role: 'user', content: ticketContextContent })
    for (const m of history) {
      const timestampPrefix = m.timestamp ? `[${formatDateES(m.timestamp)}]\n` : ''
      chatMessages.push({ role: m.role, content: `${timestampPrefix}${m.content}` })
    }
    if (currentComment) {
      chatMessages.push({ role: 'user', content: currentComment })
    }
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://ziii-helpdesk.local',
        'X-Title': 'ZIII Helpdesk',
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        temperature: 0.3,
        max_tokens: 1200,  // suficiente para JSON completo incluso con respuestas largas
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (!res.ok) {
      console.error('[OpenRouter] Error HTTP:', res.status, await res.text())
      return null
    }

    const data = await res.json()
    const raw: string | undefined = data.choices?.[0]?.message?.content
    if (!raw) return null

    // Verificar si el JSON fue truncado por límite de tokens
    const finishReason = data.choices?.[0]?.finish_reason
    if (finishReason === 'length') {
      console.warn('[OpenRouter] Respuesta truncada por max_tokens. Intentando recuperar JSON parcial...')
      // Intentar cerrar el JSON truncado extrayendo los campos presentes
      const replyMatch = raw.match(/"suggestedReply"\s*:\s*"((?:[^"\\]|\\.)*)/)
      const confidenceMatch = raw.match(/"confidence"\s*:\s*"(high|medium|low)"/)
      const escalateMatch = raw.match(/"shouldEscalate"\s*:\s*(true|false)/)
      if (replyMatch) {
        return {
          suggestedReply: replyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
          confidence: (confidenceMatch?.[1] as TriageResult['confidence']) ?? 'low',
          shouldEscalate: escalateMatch?.[1] === 'true',
        }
      }
      console.error('[OpenRouter] No se pudo recuperar respuesta truncada. Raw:', raw.slice(0, 200))
      return null
    }

    try {
      const parsed = JSON.parse(raw) as TriageResult
      return parsed
    } catch (parseErr) {
      console.error('[OpenRouter] Error al parsear JSON. finish_reason:', finishReason, '| Raw:', raw.slice(0, 300))
      return null
    }
  } catch (err) {
    console.error('[OpenRouter] Error en triage:', err)
    return null
  }
}
