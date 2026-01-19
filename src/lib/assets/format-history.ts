/**
 * Formatea valores del historial de cambios de activos
 * Convierte IDs, UUIDs y códigos en valores legibles
 */

export type Location = {
  id: string
  name: string
  code: string
}

export type UserOption = {
  id: string
  full_name: string | null
}

export type AssignedUser = {
  id: string
  full_name: string | null
  location_name: string | null
}

/**
 * Formatea un valor del historial de cambios
 * @param value - Valor a formatear (puede ser UUID, código, etc.)
 * @param fieldName - Nombre del campo (location_id, assigned_to, etc.)
 * @param locations - Array de sedes disponibles
 * @param users - Array de usuarios disponibles
 * @param assignedUser - Usuario asignado actual
 * @returns Valor formateado y legible
 */
export function formatHistoryValue(
  value: string | null,
  fieldName: string,
  locations?: Location[],
  users?: UserOption[],
  assignedUser?: AssignedUser | null
): string {
  if (!value) return 'Sin asignar'
  
  // Casos especiales
  if (value === 'EMPTY') return 'Sin asignar'
  if (value === 'Sin imagen') return 'Sin imagen'
  if (value === 'Imagen eliminada') return 'Imagen eliminada'
  
  // Campo de imagen
  if (fieldName === 'image_url') {
    if (value.startsWith('http')) return 'Imagen agregada'
    return value
  }
  
  // Campo de sede (location_id) - mostrar solo código
  if (fieldName === 'location_id' && locations) {
    const location = locations.find(loc => loc.id === value)
    if (location) return location.code
    // Si no encontramos, podría ser un código directamente
    const locationByCode = locations.find(loc => loc.code === value)
    if (locationByCode) return locationByCode.code
  }
  
  // Campo de responsable (assigned_to) - buscar el nombre
  if (fieldName === 'assigned_to') {
    if (users) {
      const user = users.find(u => u.id === value)
      if (user && user.full_name) return user.full_name
    }
    // Si no lo encontramos en users, podría ser assignedUser
    if (assignedUser && assignedUser.id === value && assignedUser.full_name) {
      return assignedUser.full_name
    }
    return 'Usuario'
  }
  
  return value
}

/**
 * Obtiene la etiqueta en español para un nombre de campo
 */
export const FIELD_LABELS: Record<string, string> = {
  status: 'Estado',
  asset_type: 'Tipo',
  brand: 'Marca',
  model: 'Modelo',
  serial_number: 'Número de Serie',
  processor: 'Procesador',
  ram_gb: 'Memoria RAM',
  storage_gb: 'Almacenamiento',
  os: 'Sistema Operativo',
  location_id: 'Sede',
  assigned_to: 'Responsable',
  department: 'Departamento',
  created: 'Creación',
  deleted: 'Eliminación',
  image_url: 'Imagen',
  asset_tag: 'Etiqueta',
  location: 'Ubicación Física',
  purchase_date: 'Fecha de Compra',
  warranty_end_date: 'Fin de Garantía',
  notes: 'Notas',
  // Campos de mantenimiento
  asset_name: 'Nombre',
  category: 'Categoría',
  installation_date: 'Fecha de Instalación',
  service_provider: 'Proveedor',
  responsible_area: 'Área Responsable',
  capacity: 'Capacidad',
  power_rating: 'Potencia',
  voltage: 'Voltaje',
  refrigerant_type: 'Tipo de Refrigerante',
  btu_rating: 'BTU',
  tonnage: 'Tonelaje',
}
