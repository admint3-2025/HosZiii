import nodemailer from 'nodemailer'

export type SmtpConfig = {
  host: string
  port: number
  user: string
  pass: string
  from: string
  secure: boolean
}

export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST
  const portRaw = process.env.SMTP_PORT
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const fromRaw = process.env.SMTP_FROM
  const secureRaw = process.env.SMTP_SECURE

  if (!host || !portRaw || !user || !pass || !fromRaw) return null

  const port = Number(portRaw)
  if (!Number.isFinite(port) || port <= 0) return null

  const secure = secureRaw ? secureRaw === 'true' : port === 465

  const from = normalizeFrom(fromRaw, user)

  return { host, port, user, pass, from, secure }
}

function normalizeFrom(fromRaw: string, fallbackEmail: string) {
  const trimmed = fromRaw.trim()
  // If it already includes an email, keep it (e.g., "Name <email@domain>").
  if (/[<][^>]*@[^>]*[>]/.test(trimmed) || /\b[^\s@]+@[^\s@]+\b/.test(trimmed)) {
    return trimmed
  }
  // If only a display name was provided, compose with SMTP_USER.
  const safeName = trimmed.replaceAll('"', '').trim() || 'ZIII HoS'
  return `${safeName} <${fallbackEmail}>`
}

export async function sendMail(params: {
  to: string
  subject: string
  html: string
  text?: string
}) {
  const cfg = getSmtpConfig()
  if (!cfg) {
    throw new Error('SMTP is not configured (missing SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM)')
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    tls: {
      // Permitir certificados auto-firmados
      rejectUnauthorized: false,
    },
  })

  await transporter.sendMail({
    from: cfg.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  })
}
