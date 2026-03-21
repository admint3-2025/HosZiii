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

  const systemPrompt = `Eres un agente de helpdesk de nivel 2 para ZIII, empresa de hospitalidad/hotelería en México.
Tu tarea es analizar tickets de soporte y generar una sugerencia de respuesta CONCRETA y ACCIONABLE en español.

REGLAS:
- NO saludes ni agradezcas el contacto. Ve directo al diagnóstico y los pasos.
- Proporciona pasos de resolución numerados y específicos cuando sea posible.
- Si necesitas más información, indica exactamente QUÉ datos faltan y POR QUÉ los necesitas.
- Considera el contexto hotelero: impacto en huéspedes, urgencia operativa, disponibilidad de técnicos en sitio.
- Máximo 4 pasos de resolución. Sé directo y técnico.

Responde SOLO con JSON válido:
{
  "suggestedReply": "respuesta concreta con pasos de acción",
  "confidence": "high|medium|low",
  "shouldEscalate": true|false
}
- confidence: high = solución clara con pasos definidos, medium = necesita más contexto o diagnóstico en sitio, low = problema complejo o sin información suficiente
- shouldEscalate: true si requiere especialista, proveedor externo, o afecta operación crítica del hotel`

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
