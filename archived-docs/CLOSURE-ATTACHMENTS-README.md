# Cierre de Tickets con Evidencia Fotográfica

## Descripción
Se ha implementado la capacidad de adjuntar imágenes al momento de cerrar un ticket, permitiendo documentar la resolución con evidencia visual.

## Funcionalidad

### Modal de Cierre
- Al cambiar el estado de un ticket a "CLOSED", se abre un modal profesional en lugar del prompt simple anterior
- El modal incluye:
  - Campo de texto para la resolución (mínimo 20 caracteres, obligatorio)
  - Componente de carga de archivos para adjuntar imágenes (opcional, hasta 10 archivos)
  - Validación en tiempo real del número de caracteres
  - Botones de Cancelar y Cerrar Ticket

### Almacenamiento
- Las imágenes se suben al bucket `ticket-attachments` de Supabase Storage
- Se registran en la tabla `ticket_attachments` con:
  - Vinculación al ticket
  - Vinculación al comentario de resolución
  - Metadata del archivo (nombre, tamaño, tipo)
  - Ruta de almacenamiento
  - ID del usuario que subió el archivo

### Visualización
- Los adjuntos se muestran en el comentario de cierre
- Cada adjunto aparece como un enlace con:
  - Icono apropiado (imagen o archivo genérico)
  - Nombre del archivo (truncado si es muy largo)
  - Tamaño en KB
  - Estilo visual consistente (fondo azul con hover)
  - Se abre en nueva pestaña al hacer clic

### Flujo Completo
1. Agente selecciona estado "CLOSED" en las acciones del ticket
2. Se abre el modal de cierre
3. Agente escribe la resolución detallada
4. Opcionalmente, adjunta imágenes de evidencia
5. Al confirmar:
   - Se cierra el ticket
   - Se crea un comentario público con la resolución
   - Se suben los archivos a Supabase Storage
   - Se registran los adjuntos vinculados al comentario
   - Se envían notificaciones por email
6. Los adjuntos quedan visibles en el historial del ticket

## Archivos Modificados

### Nuevos Archivos
- `src/app/(app)/tickets/[id]/ui/CloseTicketModal.tsx` - Modal de cierre con upload

### Archivos Actualizados
- `src/app/(app)/tickets/[id]/ui/TicketActions.tsx` - Integración del modal
- `src/app/(app)/tickets/[id]/actions.ts` - Procesamiento de adjuntos al cerrar
- `src/app/(app)/tickets/[id]/page.tsx` - Query para cargar adjuntos
- `src/app/(app)/tickets/[id]/ui/TicketComments.tsx` - Visualización de adjuntos

## Validaciones
- Resolución: mínimo 20 caracteres
- Archivos: máximo 10 por cierre
- Tamaño: 10 MB por archivo
- Tipos: images/* (PNG, JPG, GIF, etc.) y documentos comunes

## Beneficios
✅ Trazabilidad completa de la resolución
✅ Evidencia visual del trabajo realizado
✅ Mejor documentación para auditorías
✅ Cumplimiento con estándares ITIL
✅ Interfaz profesional y amigable
