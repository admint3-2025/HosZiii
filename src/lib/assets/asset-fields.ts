/**
 * Configuración de campos dinámicos por tipo de activo
 */

export type AssetFieldConfig = {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'select'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
}

export type AssetTypeConfig = {
  category: string
  fields: AssetFieldConfig[]
}

/**
 * Configuración de campos específicos por tipo de activo
 */
export const ASSET_TYPE_CONFIGS: Record<string, AssetTypeConfig> = {
  // ============= IT =============
  DESKTOP: {
    category: 'IT',
    fields: [
      { name: 'processor', label: 'Procesador', type: 'text', placeholder: 'Intel Core i5-11400' },
      { name: 'ram_gb', label: 'RAM (GB)', type: 'number', placeholder: '8' },
      { name: 'storage_gb', label: 'Almacenamiento (GB)', type: 'number', placeholder: '500' },
      { name: 'os', label: 'Sistema Operativo', type: 'text', placeholder: 'Windows 11 Pro' },
    ],
  },
  LAPTOP: {
    category: 'IT',
    fields: [
      { name: 'processor', label: 'Procesador', type: 'text', placeholder: 'Intel Core i7-1165G7' },
      { name: 'ram_gb', label: 'RAM (GB)', type: 'number', placeholder: '16' },
      { name: 'storage_gb', label: 'Almacenamiento (GB)', type: 'number', placeholder: '512' },
      { name: 'os', label: 'Sistema Operativo', type: 'text', placeholder: 'Windows 11 Pro' },
    ],
  },
  TABLET: {
    category: 'IT',
    fields: [
      { name: 'brand', label: 'Marca', type: 'text', placeholder: 'Samsung' },
      { name: 'model', label: 'Modelo', type: 'text', placeholder: 'Galaxy Tab S7' },
      { name: 'storage_gb', label: 'Almacenamiento (GB)', type: 'number', placeholder: '128' },
      { name: 'os', label: 'Sistema Operativo', type: 'text', placeholder: 'Android' },
    ],
  },
  SERVER: {
    category: 'IT',
    fields: [
      { name: 'processor', label: 'Procesador', type: 'text', placeholder: 'Intel Xeon Silver 4214' },
      { name: 'ram_gb', label: 'RAM (GB)', type: 'number', placeholder: '64' },
      { name: 'storage_gb', label: 'Almacenamiento (GB)', type: 'number', placeholder: '2000' },
      { name: 'os', label: 'Sistema Operativo', type: 'text', placeholder: 'Ubuntu Server 22.04' },
    ],
  },
  PRINTER: {
    category: 'IT',
    fields: [
      { name: 'capacity', label: 'Capacidad', type: 'text', placeholder: '30 ppm' },
    ],
  },
  MONITOR: {
    category: 'IT',
    fields: [
      { name: 'capacity', label: 'Tamaño', type: 'text', placeholder: '27 pulgadas' },
    ],
  },

  // ============= HVAC =============
  AIR_CONDITIONING: {
    category: 'HVAC',
    fields: [
      { name: 'asset_name', label: 'Nombre del Activo', type: 'text', required: true, placeholder: 'Mini Split Inverter 1.5 Toneladas' },
      { name: 'tonnage', label: 'Tonelaje', type: 'text', placeholder: '1.5 TON' },
      { name: 'btu_rating', label: 'Capacidad (BTU)', type: 'text', placeholder: '18000 BTU' },
      { name: 'refrigerant_type', label: 'Tipo de Refrigerante', type: 'text', placeholder: 'R-410A' },
      { name: 'voltage', label: 'Voltaje', type: 'text', placeholder: '220V' },
      { name: 'installation_date', label: 'Fecha de Instalación', type: 'date', required: true },
      { name: 'service_provider', label: 'Proveedor de Servicio', type: 'text', placeholder: 'Climas y Proyectos S.A.' },
      { name: 'responsible_area', label: 'Área Responsable', type: 'text', placeholder: 'Climatización / HVAC' },
    ],
  },
  HVAC_SYSTEM: {
    category: 'HVAC',
    fields: [
      { name: 'asset_name', label: 'Nombre del Activo', type: 'text', required: true, placeholder: 'Sistema HVAC Central' },
      { name: 'capacity', label: 'Capacidad', type: 'text', placeholder: '50 TON' },
      { name: 'power_rating', label: 'Potencia', type: 'text', placeholder: '45 kW' },
      { name: 'voltage', label: 'Voltaje', type: 'text', placeholder: '440V' },
      { name: 'installation_date', label: 'Fecha de Instalación', type: 'date' },
      { name: 'service_provider', label: 'Proveedor de Servicio', type: 'text' },
      { name: 'responsible_area', label: 'Área Responsable', type: 'text', placeholder: 'Climatización' },
    ],
  },
  BOILER: {
    category: 'HVAC',
    fields: [
      { name: 'asset_name', label: 'Nombre del Activo', type: 'text', required: true, placeholder: 'Caldera de Vapor' },
      { name: 'capacity', label: 'Capacidad', type: 'text', placeholder: '500 HP' },
      { name: 'power_rating', label: 'Potencia', type: 'text', placeholder: '15 MMBtu/hr' },
      { name: 'voltage', label: 'Voltaje', type: 'text', placeholder: '440V' },
      { name: 'installation_date', label: 'Fecha de Instalación', type: 'date' },
      { name: 'service_provider', label: 'Proveedor de Servicio', type: 'text' },
      { name: 'responsible_area', label: 'Área Responsable', type: 'text', placeholder: 'Mantenimiento' },
    ],
  },

  // ============= Cocina/Lavandería =============
  REFRIGERATOR: {
    category: 'Cocina/Minibar',
    fields: [
      { name: 'asset_name', label: 'Nombre del Activo', type: 'text', required: true, placeholder: 'Refrigerador Minibar' },
      { name: 'capacity', label: 'Capacidad', type: 'text', placeholder: '50 litros' },
      { name: 'voltage', label: 'Voltaje', type: 'text', placeholder: '110V' },
      { name: 'installation_date', label: 'Fecha de Instalación', type: 'date' },
      { name: 'service_provider', label: 'Proveedor de Servicio', type: 'text' },
      { name: 'responsible_area', label: 'Área Responsable', type: 'text', placeholder: 'Housekeeping' },
    ],
  },
  WASHING_MACHINE: {
    category: 'Lavandería',
    fields: [
      { name: 'asset_name', label: 'Nombre del Activo', type: 'text', required: true, placeholder: 'Lavadora Industrial' },
      { name: 'capacity', label: 'Capacidad', type: 'text', placeholder: '20 kg' },
      { name: 'power_rating', label: 'Potencia', type: 'text', placeholder: '3 HP' },
      { name: 'voltage', label: 'Voltaje', type: 'text', placeholder: '220V' },
      { name: 'installation_date', label: 'Fecha de Instalación', type: 'date' },
      { name: 'service_provider', label: 'Proveedor de Servicio', type: 'text' },
      { name: 'responsible_area', label: 'Área Responsable', type: 'text', placeholder: 'Lavandería' },
    ],
  },
  DRYER: {
    category: 'Lavandería',
    fields: [
      { name: 'asset_name', label: 'Nombre del Activo', type: 'text', required: true, placeholder: 'Secadora Industrial' },
      { name: 'capacity', label: 'Capacidad', type: 'text', placeholder: '20 kg' },
      { name: 'power_rating', label: 'Potencia', type: 'text', placeholder: '5 HP' },
      { name: 'voltage', label: 'Voltaje', type: 'text', placeholder: '220V' },
      { name: 'installation_date', label: 'Fecha de Instalación', type: 'date' },
      { name: 'service_provider', label: 'Proveedor de Servicio', type: 'text' },
      { name: 'responsible_area', label: 'Área Responsable', type: 'text', placeholder: 'Lavandería' },
    ],
  },

  // ============= Plomería/Eléctrico =============
  WATER_HEATER: {
    category: 'Plomería',
    fields: [
      { name: 'asset_name', label: 'Nombre del Activo', type: 'text', required: true, placeholder: 'Calentador de Agua Eléctrico' },
      { name: 'capacity', label: 'Capacidad', type: 'text', placeholder: '80 litros' },
      { name: 'power_rating', label: 'Potencia', type: 'text', placeholder: '3000W' },
      { name: 'voltage', label: 'Voltaje', type: 'text', placeholder: '220V' },
      { name: 'installation_date', label: 'Fecha de Instalación', type: 'date' },
      { name: 'service_provider', label: 'Proveedor de Servicio', type: 'text' },
      { name: 'responsible_area', label: 'Área Responsable', type: 'text', placeholder: 'Plomería' },
    ],
  },
  PUMP: {
    category: 'Plomería',
    fields: [
      { name: 'asset_name', label: 'Nombre del Activo', type: 'text', required: true, placeholder: 'Bomba de Agua' },
      { name: 'capacity', label: 'Capacidad', type: 'text', placeholder: '1000 LPM' },
      { name: 'power_rating', label: 'Potencia', type: 'text', placeholder: '5 HP' },
      { name: 'voltage', label: 'Voltaje', type: 'text', placeholder: '440V' },
      { name: 'installation_date', label: 'Fecha de Instalación', type: 'date' },
      { name: 'service_provider', label: 'Proveedor de Servicio', type: 'text' },
      { name: 'responsible_area', label: 'Área Responsable', type: 'text', placeholder: 'Plomería' },
    ],
  },
  GENERATOR: {
    category: 'Eléctrico',
    fields: [
      { name: 'asset_name', label: 'Nombre del Activo', type: 'text', required: true, placeholder: 'Generador Diesel' },
      { name: 'capacity', label: 'Capacidad', type: 'text', placeholder: '500 kVA' },
      { name: 'power_rating', label: 'Potencia', type: 'text', placeholder: '400 kW' },
      { name: 'voltage', label: 'Voltaje', type: 'text', placeholder: '440V' },
      { name: 'installation_date', label: 'Fecha de Instalación', type: 'date' },
      { name: 'service_provider', label: 'Proveedor de Servicio', type: 'text' },
      { name: 'responsible_area', label: 'Área Responsable', type: 'text', placeholder: 'Eléctrico' },
    ],
  },

  // ============= Infraestructura =============
  ELEVATOR: {
    category: 'Infraestructura',
    fields: [
      { name: 'asset_name', label: 'Nombre del Activo', type: 'text', required: true, placeholder: 'Elevador de Pasajeros' },
      { name: 'capacity', label: 'Capacidad', type: 'text', placeholder: '1000 kg / 13 personas' },
      { name: 'power_rating', label: 'Potencia', type: 'text', placeholder: '10 HP' },
      { name: 'voltage', label: 'Voltaje', type: 'text', placeholder: '440V' },
      { name: 'installation_date', label: 'Fecha de Instalación', type: 'date' },
      { name: 'service_provider', label: 'Proveedor de Servicio', type: 'text' },
      { name: 'responsible_area', label: 'Área Responsable', type: 'text', placeholder: 'Mantenimiento' },
    ],
  },

  // ============= General =============
  FURNITURE: {
    category: 'Housekeeping',
    fields: [
      { name: 'asset_name', label: 'Nombre del Activo', type: 'text', required: true, placeholder: 'Cama King Size' },
      { name: 'installation_date', label: 'Fecha de Instalación', type: 'date' },
      { name: 'service_provider', label: 'Proveedor', type: 'text' },
      { name: 'responsible_area', label: 'Área Responsable', type: 'text', placeholder: 'Housekeeping' },
    ],
  },
  OTHER: {
    category: 'General',
    fields: [
      { name: 'asset_name', label: 'Nombre del Activo', type: 'text', placeholder: 'Descripción del activo' },
      { name: 'installation_date', label: 'Fecha de Instalación', type: 'date' },
      { name: 'service_provider', label: 'Proveedor de Servicio', type: 'text' },
      { name: 'responsible_area', label: 'Área Responsable', type: 'text' },
    ],
  },
}

/**
 * Obtiene los campos específicos para un tipo de activo
 */
export function getAssetFieldsForType(assetType: string): AssetFieldConfig[] {
  return ASSET_TYPE_CONFIGS[assetType]?.fields || []
}

/**
 * Obtiene la categoría de un tipo de activo
 */
export function getAssetCategory(assetType: string): string {
  return ASSET_TYPE_CONFIGS[assetType]?.category || 'General'
}

/**
 * Verifica si un tipo de activo es de IT
 */
export function isITAsset(assetType: string): boolean {
  return getAssetCategory(assetType) === 'IT'
}

/**
 * Agrupa tipos de activos por categoría
 */
export function getAssetTypesByCategory(): Record<string, { value: string; label: string }[]> {
  const categories: Record<string, { value: string; label: string }[]> = {}
  
  const allTypes = [
    // IT
    { value: 'DESKTOP', label: 'PC de Escritorio', category: 'IT' },
    { value: 'LAPTOP', label: 'Laptop', category: 'IT' },
    { value: 'TABLET', label: 'Tablet', category: 'IT' },
    { value: 'PHONE', label: 'Teléfono', category: 'IT' },
    { value: 'MONITOR', label: 'Monitor', category: 'IT' },
    { value: 'PRINTER', label: 'Impresora', category: 'IT' },
    { value: 'SCANNER', label: 'Escáner', category: 'IT' },
    { value: 'SERVER', label: 'Servidor', category: 'IT' },
    { value: 'NETWORK', label: 'Equipo de Red', category: 'IT' },
    { value: 'UPS', label: 'UPS/No-Break', category: 'IT' },
    { value: 'PROJECTOR', label: 'Proyector', category: 'IT' },
    // HVAC
    { value: 'AIR_CONDITIONING', label: 'Aire Acondicionado', category: 'HVAC' },
    { value: 'HVAC_SYSTEM', label: 'Sistema HVAC', category: 'HVAC' },
    { value: 'BOILER', label: 'Caldera', category: 'HVAC' },
    // Cocina/Lavandería
    { value: 'REFRIGERATOR', label: 'Refrigerador', category: 'Cocina/Minibar' },
    { value: 'WASHING_MACHINE', label: 'Lavadora', category: 'Lavandería' },
    { value: 'DRYER', label: 'Secadora', category: 'Lavandería' },
    { value: 'KITCHEN_EQUIPMENT', label: 'Equipo de Cocina', category: 'Cocina' },
    // Infraestructura
    { value: 'WATER_HEATER', label: 'Calentador de Agua', category: 'Plomería' },
    { value: 'PUMP', label: 'Bomba', category: 'Plomería' },
    { value: 'GENERATOR', label: 'Generador', category: 'Eléctrico' },
    { value: 'ELEVATOR', label: 'Elevador', category: 'Infraestructura' },
    // General
    { value: 'FURNITURE', label: 'Mobiliario', category: 'Housekeeping' },
    { value: 'FIXTURE', label: 'Fixture/Accesorio', category: 'Housekeeping' },
    { value: 'CLEANING_EQUIPMENT', label: 'Equipo de Limpieza', category: 'Housekeeping' },
    { value: 'SECURITY_SYSTEM', label: 'Sistema de Seguridad', category: 'Seguridad' },
    { value: 'FIRE_SYSTEM', label: 'Sistema Contra Incendios', category: 'Seguridad' },
    { value: 'PLUMBING', label: 'Equipo de Plomería', category: 'Plomería' },
    { value: 'ELECTRICAL', label: 'Equipo Eléctrico', category: 'Eléctrico' },
    { value: 'LIGHTING', label: 'Iluminación', category: 'Eléctrico' },
    { value: 'VEHICLE', label: 'Vehículo', category: 'Transporte' },
    { value: 'OTHER', label: 'Otro', category: 'General' },
  ]

  allTypes.forEach(type => {
    if (!categories[type.category]) {
      categories[type.category] = []
    }
    categories[type.category].push({ value: type.value, label: type.label })
  })

  return categories
}
