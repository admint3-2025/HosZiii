'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import AttachmentUploader from '@/components/AttachmentUploader'

type Location = {
  id: string
  name: string
  code: string
}

type BEOTicketFormProps = {
  locations: Location[]
  requesterId: string
}

export default function BEOTicketForm({ locations, requesterId }: BEOTicketFormProps) {
  const [formData, setFormData] = useState({
    // Información BEO básica
    beo_number: '',
    event_name: '',
    event_client: '',
    event_date: '',
    event_time: '',
    event_room: '',
    event_setup_type: '',
    event_attendees: '',
    
    // Requerimientos técnicos
    tech_projector: false,
    tech_audio: false,
    tech_wifi: false,
    tech_videoconf: false,
    tech_lighting: false,
    tech_other: '',
    
    // Info adicional
    description: '',
    location_id: '',
  })
  
  const [beoFiles, setBeoFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setupTypes = [
    'Teatro',
    'Banquete',
    'Cóctel',
    'Herradura',
    'Escuela',
    'Boardroom',
    'Imperial',
    'Otro'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const supabase = createSupabaseBrowserClient()

      // Validaciones
      if (!formData.beo_number.trim()) {
        throw new Error('El número de BEO es obligatorio')
      }
      if (!formData.event_name.trim()) {
        throw new Error('El nombre del evento es obligatorio')
      }
      if (!formData.event_date) {
        throw new Error('La fecha del evento es obligatoria')
      }
      if (beoFiles.length === 0) {
        throw new Error('Debe adjuntar el documento BEO en formato PDF emitido del PMS')
      }

      // Validar que sea PDF
      const nonPdfFiles = beoFiles.filter(f => !f.type.includes('pdf'))
      if (nonPdfFiles.length > 0) {
        throw new Error('Solo se permiten archivos PDF del PMS. Por favor adjunte el documento oficial en formato PDF.')
      }

      // Combinar fecha y hora
      const eventDateTime = formData.event_time 
        ? `${formData.event_date}T${formData.event_time}:00`
        : `${formData.event_date}T00:00:00`

      // Construir título automático
      const title = `BEO #${formData.beo_number} - ${formData.event_name}`

      // Construir descripción detallada
      const techRequirements = []
      if (formData.tech_projector) techRequirements.push('Proyector/Pantalla')
      if (formData.tech_audio) techRequirements.push('Micrófono/Audio')
      if (formData.tech_wifi) techRequirements.push('Internet/WiFi')
      if (formData.tech_videoconf) techRequirements.push('Videoconferencia/Streaming')
      if (formData.tech_lighting) techRequirements.push('Iluminación especial')
      if (formData.tech_other.trim()) techRequirements.push(formData.tech_other.trim())

      const description = `
**Información del Evento:**
- Cliente: ${formData.event_client || 'No especificado'}
- Fecha y Hora: ${new Date(eventDateTime).toLocaleString('es-ES')}
- Salón: ${formData.event_room || 'No especificado'}
- Setup: ${formData.event_setup_type || 'No especificado'}
- Asistentes: ${formData.event_attendees || 'No especificado'}

**Requerimientos Técnicos:**
${techRequirements.length > 0 ? techRequirements.map(r => `- ${r}`).join('\n') : '- Ninguno especificado'}

${formData.description.trim() ? `\n**Notas adicionales:**\n${formData.description.trim()}` : ''}
      `.trim()

      // Crear ticket BEO
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          title,
          description,
          impact: 2,
          urgency: 2,
          priority: 2, // Prioridad MEDIA (1=LOW, 2=MEDIUM, 3=HIGH, 4=CRITICAL)
          status: 'NEW',
          requester_id: requesterId,
          location_id: formData.location_id || null,
          is_beo: true,
          beo_number: formData.beo_number.trim(),
          event_name: formData.event_name.trim(),
          event_client: formData.event_client.trim() || null,
          event_date: eventDateTime,
          event_room: formData.event_room.trim() || null,
          event_setup_type: formData.event_setup_type || null,
          event_attendees: formData.event_attendees ? parseInt(formData.event_attendees) : null,
          tech_projector: formData.tech_projector,
          tech_audio: formData.tech_audio,
          tech_wifi: formData.tech_wifi,
          tech_videoconf: formData.tech_videoconf,
          tech_lighting: formData.tech_lighting,
          tech_other: formData.tech_other.trim() || null,
        })
        .select()
        .single()

      if (ticketError) {
        console.error('Ticket creation error details:', ticketError)
        throw new Error(ticketError.message || JSON.stringify(ticketError))
      }
      
      if (!ticket) {
        throw new Error('No se pudo crear el ticket')
      }

      // Subir archivos BEO
      for (const file of beoFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${ticket.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, file)

        if (uploadError) {
          console.error('Error uploading BEO file:', uploadError)
          continue
        }

        // Registrar adjunto
        await supabase.from('attachments').insert({
          ticket_id: ticket.id,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: requesterId,
        })
      }

      // Auditoría
      await supabase.from('audit_log').insert({
        entity_type: 'ticket',
        entity_id: ticket.id,
        action: 'CREATE',
        actor_id: requesterId,
        metadata: {
          ticket_number: ticket.ticket_number,
          is_beo: true,
          beo_number: ticket.beo_number,
          event_name: ticket.event_name,
          event_date: ticket.event_date,
        },
      })

      // Redirigir a la vista de tickets BEO
      window.location.href = '/tickets/beo'
    } catch (err: any) {
      console.error('Error creating BEO ticket:', err)
      setError(err.message || 'Error al crear el ticket BEO')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Información del Evento */}
      <div className="card shadow-sm border border-slate-200">
        <div className="card-body p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Información del Evento</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Número de BEO <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.beo_number}
                onChange={(e) => setFormData({ ...formData, beo_number: e.target.value })}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: BEO-2026-001234"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nombre del Evento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.event_name}
                onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Conferencia Anual 2026"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Cliente / Empresa
              </label>
              <input
                type="text"
                value={formData.event_client}
                onChange={(e) => setFormData({ ...formData, event_client: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Empresa ABC S.A."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Fecha del Evento <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Hora del Evento
              </label>
              <input
                type="time"
                value={formData.event_time}
                onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Salón / Espacio
              </label>
              <input
                type="text"
                value={formData.event_room}
                onChange={(e) => setFormData({ ...formData, event_room: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Salón Principal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tipo de Setup
              </label>
              <select
                value={formData.event_setup_type}
                onChange={(e) => setFormData({ ...formData, event_setup_type: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar...</option>
                {setupTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                # Asistentes
              </label>
              <input
                type="number"
                value={formData.event_attendees}
                onChange={(e) => setFormData({ ...formData, event_attendees: e.target.value })}
                min="1"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: 150"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Sede
              </label>
              <select
                value={formData.location_id}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar sede...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Requerimientos Técnicos */}
      <div className="card shadow-sm border border-slate-200">
        <div className="card-body p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🔧 Requerimientos Técnicos (IT)</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.tech_projector}
                onChange={(e) => setFormData({ ...formData, tech_projector: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Proyector / Pantalla</div>
                <div className="text-xs text-gray-500">Equipo de proyección</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.tech_audio}
                onChange={(e) => setFormData({ ...formData, tech_audio: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Micrófono / Audio</div>
                <div className="text-xs text-gray-500">Sistema de audio</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.tech_wifi}
                onChange={(e) => setFormData({ ...formData, tech_wifi: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Internet / WiFi Dedicado</div>
                <div className="text-xs text-gray-500">Conexión a internet</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.tech_videoconf}
                onChange={(e) => setFormData({ ...formData, tech_videoconf: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Videoconferencia / Streaming</div>
                <div className="text-xs text-gray-500">Equipos para transmisión</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.tech_lighting}
                onChange={(e) => setFormData({ ...formData, tech_lighting: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Iluminación Especial</div>
                <div className="text-xs text-gray-500">Iluminación profesional</div>
              </div>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Otros Requerimientos
              </label>
              <textarea
                value={formData.tech_other}
                onChange={(e) => setFormData({ ...formData, tech_other: e.target.value })}
                rows={2}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Especificar otros requerimientos técnicos..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notas adicionales */}
      <div className="card shadow-sm border border-slate-200">
        <div className="card-body p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Información Adicional</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notas / Detalles Adicionales
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Incluir cualquier información adicional relevante..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Adjuntar Documento BEO <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setBeoFiles(Array.from(e.target.files || []))}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-red-50 file:text-red-700
                  hover:file:bg-red-100"
              />
              <p className="text-xs text-red-600 mt-1 font-medium">
                ⚠️ Solo PDF emitido del PMS (Opera). El documento BEO original es obligatorio.
              </p>
              {beoFiles.length > 0 && (
                <div className="mt-2 text-sm text-green-600">
                  ✓ {beoFiles.length} archivo(s) seleccionado(s)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => window.location.href = '/dashboard'}
          disabled={isSubmitting}
          className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Creando Ticket BEO...' : 'Crear Ticket BEO'}
        </button>
      </div>
    </form>
  )
}
