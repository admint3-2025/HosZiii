/**
 * Adaptador OpenRouter para triage de tickets
 * Llama a la API de OpenRouter (compatible con OpenAI) para generar sugerencias.
 *
 * Variables de entorno requeridas:
 *   OPENROUTER_API_KEY   — sk-or-v1-...
 *   OPENROUTER_MODEL     — e.g. "google/gemini-flash-1.5" (opcional, default abajo)
 *   AI_TRIAGE_ENABLED    — "true" para activar
 */

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'google/gemini-flash-1.5'
const TIMEOUT_MS = 15_000

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

  const systemPrompt = isTechRole
    ? `Eres un agente de helpdesk de nivel 2 para ZIII, empresa de hospitalidad/hotelería en México.
Tu tarea es analizar tickets de soporte y generar una sugerencia de respuesta TÉCNICA, CONCRETA y ACCIONABLE en español.

REGLAS:
- NO saludes ni agradezcas el contacto. Ve directo al diagnóstico y los pasos.
- Proporciona pasos de resolución numerados y específicos: comandos, rutas, configuraciones, herramientas.
- Si necesitas más información, indica exactamente QUÉ datos técnicos faltan y POR QUÉ.
- Considera el contexto hotelero: impacto en huéspedes, urgencia operativa, disponibilidad de técnicos en sitio.
- Máximo 4 pasos. Sé directo y técnico.

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

Responde SOLO con JSON válido:
{
  "suggestedReply": "respuesta estructurada para el usuario final",
  "confidence": "high|medium|low",
  "shouldEscalate": true|false
}
- confidence: high = hay pasos claros que el usuario puede intentar, medium = podría resolverse con guía pero necesita verificación técnica, low = requiere técnico presencial sí o sí
- shouldEscalate: true si el problema afecta operación del hotel, múltiples usuarios, o requiere intervención física`

  const userContent = `TICKET: ${ticket.ticketCode}
TÍTULO: ${ticket.title}
DESCRIPCIÓN: ${ticket.description}
CATEGORÍA: ${ticket.category || 'No especificada'}
PRIORIDAD: ${ticket.priority || 'No especificada'}
ESTADO: ${ticket.status}
SEDE: ${ticket.location || 'No especificada'}${kbContext}${userQuestion ? `\n\nPREGUNTA DEL TÉCNICO: ${userQuestion}` : ''}`

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
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 500,
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
    const raw = data.choices?.[0]?.message?.content
    if (!raw) return null

    const parsed = JSON.parse(raw) as TriageResult
    return parsed
  } catch (err) {
    console.error('[OpenRouter] Error en triage:', err)
    return null
  }
}
