const MX_UTC_OFFSET = -6 // México está en UTC-6 (CST)

export function formatTicketCode(params: { ticket_number: number; created_at: string | null }): string {
  const { ticket_number, created_at } = params

  if (!created_at) {
    // Fallback para tickets sin fecha
    const seq = String(ticket_number).padStart(4, '0')
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}${month}${day}-${seq}`
  }

  // Parsear fecha UTC que viene de Supabase
  const utcDate = new Date(created_at)
  
  // Aplicar offset de México (UTC-6) para obtener la fecha local de México
  const mxTime = new Date(utcDate.getTime() + (MX_UTC_OFFSET * 60 * 60 * 1000))
  
  // Extraer componentes en UTC (que ahora representa tiempo de México)
  const year = mxTime.getUTCFullYear()
  const month = String(mxTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(mxTime.getUTCDate()).padStart(2, '0')
  const seq = String(ticket_number).padStart(4, '0')

  return `${year}${month}${day}-${seq}`
}
