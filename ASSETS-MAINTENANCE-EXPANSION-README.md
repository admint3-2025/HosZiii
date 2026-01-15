# Expansión de Activos para Mantenimiento General

## Resumen

El módulo de activos ha sido expandido para soportar **mantenimiento general de hotel** (HVAC, lavandería, plomería, etc.), no solo IT.

## Cambios Realizados

### 1. Base de Datos (`migration-expand-assets-maintenance.sql`)

#### Nuevos Tipos de Activos
- **HVAC**: `AIR_CONDITIONING`, `HVAC_SYSTEM`, `BOILER`
- **Cocina/Lavandería**: `REFRIGERATOR`, `WASHING_MACHINE`, `DRYER`, `KITCHEN_EQUIPMENT`
- **Infraestructura**: `WATER_HEATER`, `PUMP`, `GENERATOR`, `ELEVATOR`
- **General**: `FURNITURE`, `FIXTURE`, `CLEANING_EQUIPMENT`, `SECURITY_SYSTEM`, `FIRE_SYSTEM`, `PLUMBING`, `ELECTRICAL`, `LIGHTING`, `VEHICLE`

#### Nuevos Campos en Tabla `assets`
```sql
asset_name           TEXT      -- Nombre descriptivo (ej: Mini Split Inverter 1.5 Toneladas)
installation_date    DATE      -- Fecha de instalación
service_provider     TEXT      -- Proveedor de servicio
responsible_area     TEXT      -- Área responsable (ej: Climatización, Housekeeping)
capacity             TEXT      -- Capacidad (ej: 100 litros, 5 kg)
power_rating         TEXT      -- Potencia (ej: 1500W, 3HP)
voltage              TEXT      -- Voltaje (110V, 220V, 440V)
refrigerant_type     TEXT      -- Tipo de refrigerante (para HVAC)
btu_rating           TEXT      -- Capacidad en BTU
tonnage              TEXT      -- Tonelaje (para HVAC)
```

#### Vista `asset_type_labels`
Etiquetas en español y categorías para todos los tipos:
```sql
SELECT * FROM asset_type_labels WHERE category = 'HVAC';
-- AIR_CONDITIONING | Aire Acondicionado | HVAC
-- HVAC_SYSTEM      | Sistema HVAC       | HVAC
-- BOILER           | Caldera            | HVAC
```

#### Función `generate_asset_code()` Actualizada
Nuevos prefijos para códigos automáticos:
- `AC-XXX-12345` → Aire Acondicionado
- `REFR-XXX-12345` → Refrigerador
- `WASH-XXX-12345` → Lavadora
- `GEN-XXX-12345` → Generador

### 2. Configuración de Campos Dinámicos (`/src/lib/assets/asset-fields.ts`)

Define qué campos mostrar según el tipo de activo:

```typescript
// Ejemplo: Aire Acondicionado
AIR_CONDITIONING: {
  category: 'HVAC',
  fields: [
    { name: 'asset_name', label: 'Nombre del Activo', type: 'text', required: true },
    { name: 'tonnage', label: 'Tonelaje', type: 'text', placeholder: '1.5 TON' },
    { name: 'btu_rating', label: 'Capacidad (BTU)', type: 'text', placeholder: '18000 BTU' },
    { name: 'refrigerant_type', label: 'Tipo de Refrigerante', type: 'text', placeholder: 'R-410A' },
    { name: 'voltage', label: 'Voltaje', type: 'text', placeholder: '220V' },
    { name: 'installation_date', label: 'Fecha de Instalación', type: 'date', required: true },
    { name: 'service_provider', label: 'Proveedor de Servicio', type: 'text' },
    { name: 'responsible_area', label: 'Área Responsable', type: 'text', placeholder: 'Climatización / HVAC' },
  ],
}
```

### 3. Formulario de Creación Actualizado

**Archivo**: `/src/app/(app)/admin/assets/new/ui/AssetCreateForm.tsx`

Cambios:
- Selector de **Categoría** + **Tipo de Activo** (agrupado)
- Campos dinámicos según el tipo seleccionado
- Soporte para todos los nuevos campos de mantenimiento

#### UI Mejorada
```
┌─────────────────────────────┐
│ Categoría: [HVAC ▼]        │
│ Tipo: [Aire Acondicionado ▼]│
└─────────────────────────────┘

┌─ Especificaciones de Aire Acondicionado ─┐
│ Nombre del Activo *: [Mini Split Inve...] │
│ Tonelaje: [1.5 TON]                       │
│ Capacidad (BTU): [18000 BTU]              │
│ Tipo de Refrigerante: [R-410A]            │
│ Voltaje: [220V]                            │
│ Fecha de Instalación *: [2024-05-15]      │
│ Proveedor de Servicio: [Climas y Proy...] │
│ Área Responsable: [Climatización / HVAC]  │
└────────────────────────────────────────────┘
```

## Ejemplo de Uso: Aire Acondicionado

### Datos de Entrada
```
Código Interno: AC-T1-105
Nombre del Activo: Mini Split Inverter 1.5 Toneladas
Marca: Carrier
Modelo: 53HCV183A
Número de Serie: 423984239XJK
Ubicación Física: Torre 1, Piso 1, Habitación 105
Área Responsable: Climatización / HVAC
Fecha de Instalación: 15/05/2024
Proveedor de Servicio: Climas y Proyectos S.A.
Fecha Vencimiento Garantía: 15/05/2027
Tonelaje: 1.5 TON
Capacidad: 18000 BTU
Voltaje: 220V
Refrigerante: R-410A
```

### Registro en BD
```sql
INSERT INTO assets (
  asset_code,         -- 'AC-T1-105' (generado o manual)
  asset_type,         -- 'AIR_CONDITIONING'
  asset_name,         -- 'Mini Split Inverter 1.5 Toneladas'
  brand,              -- 'Carrier'
  model,              -- '53HCV183A'
  serial_number,      -- '423984239XJK'
  location,           -- 'Torre 1, Piso 1, Habitación 105'
  responsible_area,   -- 'Climatización / HVAC'
  installation_date,  -- '2024-05-15'
  service_provider,   -- 'Climas y Proyectos S.A.'
  warranty_end_date,  -- '2027-05-15'
  tonnage,            -- '1.5 TON'
  btu_rating,         -- '18000 BTU'
  voltage,            -- '220V'
  refrigerant_type,   -- 'R-410A'
  status              -- 'OPERATIONAL'
)
```

## Instrucciones de Despliegue

### 1. Aplicar Migración SQL
```bash
# Desde raíz del proyecto
cd /media/jmosorioe/DEV/deV/ZIII-helpdesk

# Opción A: Supabase CLI (recomendado)
supabase db push

# Opción B: Manual en Dashboard de Supabase
# 1. Ir a: https://supabase.com/dashboard/project/[tu-proyecto]/editor
# 2. Copiar contenido de: supabase/migration-expand-assets-maintenance.sql
# 3. Ejecutar en SQL Editor
```

### 2. Verificar Migración
```sql
-- Verificar nuevos tipos de activos
SELECT unnest(enum_range(NULL::asset_type)) AS asset_type;

-- Verificar nuevos campos
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'assets'
  AND column_name IN ('asset_name', 'installation_date', 'service_provider', 'responsible_area', 
                      'capacity', 'power_rating', 'voltage', 'refrigerant_type', 'btu_rating', 'tonnage');

-- Verificar vista
SELECT * FROM asset_type_labels WHERE category = 'HVAC';
```

### 3. Reiniciar Aplicación
```bash
# En ambiente de desarrollo
cd /home/jmosorioe/ziii-helpdesk-dev
rm -rf .next
npm run dev

# En producción (Docker)
docker-compose restart helpdesk
```

## Agregar Nuevos Tipos de Activos

### 1. Agregar Tipo en Base de Datos
```sql
-- En Supabase SQL Editor
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'NEW_TYPE';
```

### 2. Agregar Configuración en TypeScript
```typescript
// En /src/lib/assets/asset-fields.ts
export const ASSET_TYPE_CONFIGS: Record<string, AssetTypeConfig> = {
  // ... tipos existentes ...
  
  NEW_TYPE: {
    category: 'General',  // o 'HVAC', 'Cocina', etc.
    fields: [
      { name: 'asset_name', label: 'Nombre', type: 'text', required: true },
      { name: 'capacity', label: 'Capacidad', type: 'text' },
      { name: 'installation_date', label: 'Fecha de Instalación', type: 'date' },
      // ... más campos según necesidad
    ],
  },
}
```

### 3. Agregar Etiqueta
```sql
-- Actualizar vista asset_type_labels
CREATE OR REPLACE VIEW asset_type_labels AS
SELECT 'DESKTOP'::text AS type_code, 'PC de Escritorio' AS label, 'IT' AS category
-- ... tipos existentes ...
UNION ALL SELECT 'NEW_TYPE', 'Nombre Amigable', 'Categoría';
```

### 4. Agregar Prefijo de Código
```sql
-- Actualizar función generate_asset_code()
CREATE OR REPLACE FUNCTION generate_asset_code(...)
  type_prefix := CASE p_asset_type
    -- ... casos existentes ...
    WHEN 'NEW_TYPE' THEN 'NTYP'
    ELSE 'XXXX'
  END;
```

## Auditoría de Cambios

La función `track_asset_changes()` ha sido actualizada para registrar cambios en los nuevos campos:
- `asset_name`
- `installation_date`
- `service_provider`
- `responsible_area`

## Compatibilidad

✅ **Activos IT existentes**: Mantienen su estructura original (processor, ram_gb, storage_gb, os)

✅ **Activos de mantenimiento**: Usan los nuevos campos específicos

✅ **Formularios dinámicos**: Muestran solo los campos relevantes según el tipo

## Pendientes

- [ ] Actualizar vista de detalle de activos (`AssetDetailView.tsx`) para mostrar campos específicos
- [ ] Actualizar formulario de edición de activos
- [ ] Agregar filtros por categoría en listado de activos
- [ ] Reportes específicos por categoría (HVAC, Lavandería, etc.)
- [ ] Campos custom adicionales si se requieren más tipos de activos

## Ejemplos de Otros Tipos

### Lavadora
```
Categoría: Lavandería
Tipo: Lavadora
Nombre: Lavadora Industrial 20kg
Marca: Electrolux
Modelo: W5180N
Capacidad: 20 kg
Potencia: 3 HP
Voltaje: 220V
Fecha Instalación: 2024-03-10
Proveedor: Lavandería Industrial S.A.
Área Responsable: Lavandería
```

### Elevador
```
Categoría: Infraestructura
Tipo: Elevador
Nombre: Elevador de Pasajeros
Capacidad: 1000 kg / 13 personas
Potencia: 10 HP
Voltaje: 440V
Fecha Instalación: 2023-01-15
Proveedor: Otis Elevadores
Área Responsable: Mantenimiento
```

### Generador
```
Categoría: Eléctrico
Tipo: Generador
Nombre: Generador Diesel
Capacidad: 500 kVA
Potencia: 400 kW
Voltaje: 440V
Fecha Instalación: 2022-06-20
Proveedor: Cummins Power
Área Responsable: Eléctrico
```

## Soporte

Para preguntas o problemas, contactar al administrador del sistema.
