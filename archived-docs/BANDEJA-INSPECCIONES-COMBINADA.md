# Bandeja de Inspecciones Combinada

**Fecha:** 24 de enero de 2026  
**Objetivo:** Implementar bandeja unificada que muestre inspecciones RRHH + GSH + futuros módulos

## Problema Reportado

Las inspecciones GSH no aparecían en la bandeja general de inspecciones para administradores corporativos. La bandeja solo consultaba `InspectionsRRHHService`, por lo que solo mostraba inspecciones RRHH.

**Usuario afectado:** jmosorioe@gmail.com (corporate_admin)  
**Comportamiento esperado:** Ver RRHH + GSH en bandeja general

---

## Solución Implementada

### 1. Servicio Combinado de Inspecciones

**Archivo creado:** `src/lib/services/inspections-combined.service.ts`

Servicio genérico que:
- Consulta múltiples tablas de inspecciones (`inspections_rrhh`, `inspections_gsh`, etc.)
- Combina resultados y los ordena por fecha
- Agrega metadata `inspection_type` a cada registro
- Soporta CRUD genérico según tipo de inspección

**Métodos principales:**
```typescript
InspectionsCombinedService.listInspectionsMultiple(
  locationIds: string[],
  inspectionTypes: InspectionType[] = ['rrhh', 'gsh'],
  limit = 200,
  offset = 0
)

InspectionsCombinedService.updateInspectionStatus(
  inspectionId: string,
  inspectionType: InspectionType,
  status: 'draft' | 'completed' | 'approved' | 'rejected'
)

InspectionsCombinedService.deleteInspection(
  inspectionId: string,
  inspectionType: InspectionType
)
```

**Ventajas:**
- Fácil agregar nuevos módulos: solo pasar `['rrhh', 'gsh', 'ama']`
- Un solo punto de consulta para bandeja general
- Maneja errores por tabla independientemente

---

### 2. Actualización de Bandeja de Inspecciones

**Archivo modificado:** `src/app/(app)/inspections/ui/InspectionsInbox.tsx`

**Cambios principales:**

#### Import del servicio combinado
```typescript
// ANTES
import { InspectionsRRHHService, type InspectionRRHHStatus } from '@/lib/services/inspections-rrhh.service'

// AHORA
import { InspectionsCombinedService, type CombinedInspection } from '@/lib/services/inspections-combined.service'
```

#### Carga de inspecciones combinadas
```typescript
// Consultar RRHH + GSH en una sola llamada
const { data, error } = await InspectionsCombinedService.listInspectionsMultiple(
  locationIds, 
  ['rrhh', 'gsh'], // Solo tipos implementados
  200, 
  0
)
```

#### Redirección dinámica según tipo
```typescript
const handleOpen = (inspection: CombinedInspection) => {
  // Redirige a /inspections/rrhh/{id} o /inspections/gsh/{id}
  router.push(`/inspections/${inspection.inspection_type}/${inspection.id}`)
}
```

#### Mostrar tipo en tabla
```typescript
<td>
  {r.department || '—'}
  <span className="text-[10px] text-slate-400 font-mono">
    ({r.inspection_type.toUpperCase()})
  </span>
</td>
```

#### Eliminación genérica
```typescript
// Usa tabla de log correcta según tipo
const logTableName = `inspections_${row.inspection_type}_deletion_log`

// Elimina usando servicio combinado
await InspectionsCombinedService.deleteInspection(
  row.id,
  row.inspection_type
)
```

---

## Resultado

### Antes
- Bandeja solo mostraba inspecciones RRHH
- Corporate admins no veían GSH
- Requería consultas separadas por módulo

### Después
- Bandeja muestra RRHH + GSH combinados
- Corporate admins ven todos los módulos a los que tienen acceso
- Cada inspección muestra badge con tipo (RRHH/GSH)
- Botones redirigen a página correcta automáticamente
- Fácil agregar futuros módulos (AMA, Cocina, Housekeeping)

---

## Cómo Agregar Nuevos Módulos

Para que un nuevo módulo aparezca en bandeja general:

1. Crear schema en Supabase: `inspections_{tipo}`
2. Implementar servicio: `inspections-{tipo}.service.ts`
3. Crear Manager y página de detalle
4. **Agregar tipo a bandeja:**

```typescript
// En InspectionsInbox.tsx, línea ~177
const { data } = await InspectionsCombinedService.listInspectionsMultiple(
  locationIds, 
  ['rrhh', 'gsh', 'ama'], // ← Agregar 'ama'
  200, 
  0
)
```

5. **Agregar a InspectionFlowSelector:**

```typescript
// En InspectionFlowSelector.tsx
const implementedModules = ['rrhh', 'gsh', 'ama'] // ← Agregar 'ama'
```

---

## SQL Pendiente

**IMPORTANTE:** Re-habilitar RLS después de confirmar que funciona:

```sql
ALTER TABLE inspections_gsh ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections_gsh_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections_gsh_items ENABLE ROW LEVEL SECURITY;
```

Verificar con:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename LIKE 'inspections_gsh%';
```

---

## Testing Recomendado

1. **Admin corporativo (jmosorioe@gmail.com):**
   - Ver bandeja general → Debe mostrar RRHH + GSH
   - Filtrar por propiedad → Ver solo inspecciones de esa propiedad
   - Click en inspección GSH → Debe abrir `/inspections/gsh/{id}`
   - Click en inspección RRHH → Debe abrir `/inspections/rrhh/{id}`

2. **Usuario con una sola ubicación:**
   - Ver bandeja → Solo inspecciones de su ubicación (RRHH + GSH)

3. **Aprobar/Rechazar:**
   - Cambiar estado de inspección GSH → Debe funcionar
   - Cambiar estado de inspección RRHH → Debe funcionar

4. **Eliminar (admin):**
   - Eliminar inspección GSH → Debe registrar en `inspections_gsh_deletion_log`
   - Eliminar inspección RRHH → Debe registrar en `inspections_rrhh_deletion_log`

---

## Archivos Modificados

1. `src/lib/services/inspections-combined.service.ts` ✅ CREADO
2. `src/app/(app)/inspections/ui/InspectionsInbox.tsx` ✅ ACTUALIZADO

## Archivos Relacionados

- `src/lib/services/inspections-rrhh.service.ts` (sin cambios)
- `src/lib/services/inspections-gsh.service.ts` (sin cambios)
- `src/app/(app)/inspections/inbox/page.tsx` (sin cambios)

---

## Estado

✅ **Implementado**  
⏳ **Pendiente:** Re-habilitar RLS y testing completo
