import { Fragment, type ReactNode } from 'react'

export type SubmissionStage = 'publishing' | 'analyzing' | 'uploading' | 'refreshing'

type Tone = 'violet' | 'amber'

type CommentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'ordered-list'; items: string[] }
  | { type: 'unordered-list'; items: string[] }

type StepDefinition = {
  id: SubmissionStage
  title: string
  hint: string
}

const AI_HEADER_PATTERN = /^🤖\s+\*\*(Asistente ZIII|Apoyo IA)\*\*(?:\s+\(confianza\s+(alta|media|baja)\))?:\s*/i

const toneStyles: Record<Tone, {
  card: string
  orbPrimary: string
  orbSecondary: string
  spinner: string
  badge: string
  stepActive: string
  stepDone: string
  stepPending: string
  preview: string
}> = {
  violet: {
    card: 'border-slate-900/70 bg-gradient-to-br from-slate-950 via-indigo-950 to-sky-950 text-white',
    orbPrimary: 'bg-sky-400/20',
    orbSecondary: 'bg-fuchsia-400/15',
    spinner: 'border-sky-300/40 border-t-sky-200',
    badge: 'bg-white/10 text-sky-100 ring-1 ring-white/15',
    stepActive: 'border-sky-300/60 bg-sky-300/15 text-sky-50',
    stepDone: 'border-emerald-300/30 bg-emerald-300/15 text-emerald-50',
    stepPending: 'border-white/10 bg-white/5 text-slate-300',
    preview: 'border-white/10 bg-white/5',
  },
  amber: {
    card: 'border-slate-900/70 bg-gradient-to-br from-slate-950 via-amber-950 to-orange-950 text-white',
    orbPrimary: 'bg-amber-300/20',
    orbSecondary: 'bg-orange-400/15',
    spinner: 'border-amber-200/35 border-t-amber-100',
    badge: 'bg-white/10 text-amber-50 ring-1 ring-white/15',
    stepActive: 'border-amber-200/50 bg-amber-200/15 text-amber-50',
    stepDone: 'border-emerald-300/30 bg-emerald-300/15 text-emerald-50',
    stepPending: 'border-white/10 bg-white/5 text-slate-300',
    preview: 'border-white/10 bg-white/5',
  },
}

const confidenceStyles: Record<'alta' | 'media' | 'baja', string> = {
  alta: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  media: 'border-amber-200 bg-amber-50 text-amber-700',
  baja: 'border-rose-200 bg-rose-50 text-rose-700',
}

function joinClasses(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(' ')
}

function renderInlineFormatting(text: string, keyPrefix: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={`${keyPrefix}-${index}`} className="font-semibold text-inherit">
            {part.slice(2, -2)}
          </strong>
        )
      }

      return <Fragment key={`${keyPrefix}-${index}`}>{part}</Fragment>
    })
}

function buildBlocks(content: string): CommentBlock[] {
  const blocks: CommentBlock[] = []
  const paragraphLines: string[] = []
  let listType: 'ordered-list' | 'unordered-list' | null = null
  let listItems: string[] = []

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return
    blocks.push({ type: 'paragraph', text: paragraphLines.join('\n').trim() })
    paragraphLines.length = 0
  }

  const flushList = () => {
    if (!listType || listItems.length === 0) return
    blocks.push({ type: listType, items: [...listItems] })
    listType = null
    listItems = []
  }

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/)
    if (orderedMatch) {
      flushParagraph()
      if (listType !== 'ordered-list') {
        flushList()
        listType = 'ordered-list'
      }
      listItems.push(orderedMatch[1])
      continue
    }

    const unorderedMatch = line.match(/^[-*•]\s+(.+)$/)
    if (unorderedMatch) {
      flushParagraph()
      if (listType !== 'unordered-list') {
        flushList()
        listType = 'unordered-list'
      }
      listItems.push(unorderedMatch[1])
      continue
    }

    flushList()
    paragraphLines.push(line)
  }

  flushParagraph()
  flushList()

  return blocks
}

function parseAIComment(body: string) {
  const normalizedBody = body.replace(/\r\n/g, '\n').trim()
  const headerMatch = normalizedBody.match(AI_HEADER_PATTERN)
  const confidence = (headerMatch?.[2]?.toLowerCase() as 'alta' | 'media' | 'baja' | undefined) ?? null
  const content = normalizedBody.replace(AI_HEADER_PATTERN, '').trim()

  return {
    confidence,
    content,
    blocks: buildBlocks(content),
  }
}

function buildStepDefinitions(willGenerateAI: boolean, attachmentsCount: number): StepDefinition[] {
  if (willGenerateAI && attachmentsCount > 0) {
    return [
      { id: 'publishing', title: 'Publicando comentario', hint: 'Registrando el mensaje en el hilo.' },
      { id: 'analyzing', title: 'Analizando contexto', hint: 'Revisando historial, ticket y detalles del caso.' },
      { id: 'uploading', title: 'Cargando evidencia', hint: 'Subiendo archivos adjuntos al comentario.' },
      { id: 'refreshing', title: 'Actualizando conversacion', hint: 'Mostrando la respuesta completa del asistente.' },
    ]
  }

  if (willGenerateAI) {
    return [
      { id: 'publishing', title: 'Publicando comentario', hint: 'Registrando el mensaje en el hilo.' },
      { id: 'analyzing', title: 'Analizando contexto', hint: 'Preparando una respuesta completa y util.' },
      { id: 'refreshing', title: 'Actualizando conversacion', hint: 'Insertando la respuesta del asistente en el hilo.' },
    ]
  }

  if (attachmentsCount > 0) {
    return [
      { id: 'publishing', title: 'Publicando comentario', hint: 'Registrando el mensaje en el hilo.' },
      { id: 'uploading', title: 'Cargando archivos', hint: 'Subiendo evidencia al comentario.' },
      { id: 'refreshing', title: 'Actualizando conversacion', hint: 'Refrescando el historial de comentarios.' },
    ]
  }

  return [
    { id: 'publishing', title: 'Publicando comentario', hint: 'Guardando el seguimiento en el ticket.' },
    { id: 'refreshing', title: 'Actualizando conversacion', hint: 'Refrescando el historial del caso.' },
  ]
}

export function isAICommentBody(body?: string | null) {
  return Boolean(body?.startsWith('🤖 **Asistente ZIII**') || body?.startsWith('🤖 **Apoyo IA**'))
}

export function AICommentContent({ body }: { body: string }) {
  const parsed = parseAIComment(body)

  if (!parsed.content) {
    return null
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/40 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
          Respuesta IA
        </span>
        {parsed.confidence ? (
          <span className={joinClasses('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', confidenceStyles[parsed.confidence])}>
            Confianza {parsed.confidence}
          </span>
        ) : null}
      </div>

      <div className="space-y-3 text-sm leading-relaxed text-slate-800">
        {parsed.blocks.length > 0
          ? parsed.blocks.map((block, blockIndex) => {
              if (block.type === 'paragraph') {
                return (
                  <p key={`paragraph-${blockIndex}`} className="whitespace-pre-wrap">
                    {renderInlineFormatting(block.text, `paragraph-${blockIndex}`)}
                  </p>
                )
              }

              if (block.type === 'ordered-list') {
                return (
                  <ol key={`ordered-${blockIndex}`} className="space-y-2">
                    {block.items.map((item, itemIndex) => (
                      <li key={`ordered-${blockIndex}-${itemIndex}`} className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/80 px-3 py-2.5">
                        <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white shadow-sm">
                          {itemIndex + 1}
                        </span>
                        <span className="min-w-0 text-slate-800">
                          {renderInlineFormatting(item, `ordered-${blockIndex}-${itemIndex}`)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )
              }

              return (
                <ul key={`unordered-${blockIndex}`} className="space-y-2">
                  {block.items.map((item, itemIndex) => (
                    <li key={`unordered-${blockIndex}-${itemIndex}`} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-slate-400" />
                      <span className="min-w-0 text-slate-800">
                        {renderInlineFormatting(item, `unordered-${blockIndex}-${itemIndex}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            })
          : <p className="whitespace-pre-wrap">{body}</p>}
      </div>
    </div>
  )
}

export function CommentSubmissionStatusCard({
  stage,
  willGenerateAI,
  attachmentsCount,
  body,
  visibility,
  tone = 'violet',
}: {
  stage: SubmissionStage
  willGenerateAI: boolean
  attachmentsCount: number
  body: string
  visibility: 'public' | 'internal'
  tone?: Tone
}) {
  const theme = toneStyles[tone]
  const steps = buildStepDefinitions(willGenerateAI, attachmentsCount)
  const currentIndex = Math.max(steps.findIndex((step) => step.id === stage), 0)
  const preview = body.trim() || (attachmentsCount > 0 ? `Adjuntando ${attachmentsCount} archivo(s).` : 'Preparando comentario...')
  const stageMessage = steps[currentIndex]?.hint || 'Procesando comentario...'

  return (
    <div className={joinClasses('relative overflow-hidden rounded-2xl border p-5 shadow-xl', theme.card)}>
      <div className={joinClasses('absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl animate-pulse', theme.orbPrimary)} />
      <div className={joinClasses('absolute -left-8 bottom-0 h-24 w-24 rounded-full blur-3xl animate-pulse', theme.orbSecondary)} />

      <div className="relative space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
            <span className={joinClasses('h-5 w-5 animate-spin rounded-full border-2', theme.spinner)} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-white">
                {willGenerateAI ? 'El asistente esta preparando la respuesta' : 'Estamos publicando tu comentario'}
              </p>
              <span className={joinClasses('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]', theme.badge)}>
                En proceso
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-200">{stageMessage}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => {
            const status = index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'pending'
            const chipClass = status === 'done'
              ? theme.stepDone
              : status === 'active'
                ? theme.stepActive
                : theme.stepPending

            return (
              <div key={step.id} className={joinClasses('rounded-xl border px-3 py-3 transition-colors', chipClass)}>
                <div className="flex items-center gap-2">
                  <span className={joinClasses(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    status === 'done' && 'bg-emerald-400/25 text-emerald-50',
                    status === 'active' && 'bg-white/15 text-white',
                    status === 'pending' && 'bg-black/10 text-slate-300'
                  )}>
                    {status === 'done' ? '✓' : index + 1}
                  </span>
                  <span className="text-sm font-semibold">{step.title}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed opacity-80">{step.hint}</p>
              </div>
            )
          })}
        </div>

        <div className={joinClasses('rounded-2xl border px-4 py-3', theme.preview)}>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
            <span>{visibility === 'internal' ? 'Nota interna' : 'Comentario publico'}</span>
            {attachmentsCount > 0 ? <span>{attachmentsCount} adjunto(s)</span> : null}
          </div>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-100">{preview}</p>
        </div>
      </div>
    </div>
  )
}