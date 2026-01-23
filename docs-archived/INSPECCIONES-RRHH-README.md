# Inspecciones RRHH - Sistema Funcional con BD y PDF

## ✅ Completado

Se ha implementado un sistema completo de inspecciones para el departamento de RRHH con:

1. **Base de datos (Supabase)**
2. **Guardado y consulta de inspecciones**
3. **Generación de PDF profesional**

---

## 📦 Archivos Creados

### SQL Schema
- **`/supabase/inspections-rrhh-schema.sql`**
  - Tablas: `inspections_rrhh`, `inspections_rrhh_areas`, `inspections_rrhh_items`
  - Triggers automáticos para cálculo de estadísticas
  - Funciones: `calculate_inspection_rrhh_stats()`, `calculate_area_rrhh_score()`
  - Políticas RLS para seguridad por ubicación

### Servicios TypeScript
- **`/src/lib/services/inspections-rrhh.service.ts`**
  - CRUD completo de inspecciones
  - Carga de trend data (últimas evaluaciones)
  - Actualización de status (draft → completed)

- **`/src/lib/services/inspections-rrhh-pdf.service.ts`**
  - Generador de PDF con diseño profesional
  - KPIs, gráficos, detalle por área, comentarios
  - Formato A4, multi-página, footer automático

### Componentes UI
- **`/src/app/(app)/inspections/ui/RRHHInspectionManager.tsx`**
  - Wrapper que maneja lógica de negocio
  - Carga/creación/guardado de inspecciones
  - Integración con Supabase y PDF

- **`/src/app/(app)/inspections/ui/RRHHDashboard.tsx` (actualizado)**
  - Ahora acepta props controladas
  - Botones "Guardar Borrador" / "Guardar y Completar" / "Generar PDF"
  - Contador de caracteres en comentarios (1000 max)

---

## 🚀 Instrucciones de Despliegue

### 1. Ejecutar el SQL en Supabase

```bash
# Copiar el contenido de:
cat supabase/inspections-rrhh-schema.sql

# Ejecutar en: Supabase Dashboard → SQL Editor → New Query
```

**El script creará:**
- 3 tablas con índices optimizados
- 2 funciones de cálculo automático
- 2 triggers para mantener stats actualizadas
- Políticas RLS basadas en `user_locations`

### 2. Verificar Dependencias

Las librerías ya están instaladas en `package.json`:
```json
{
  "jspdf": "^4.0.0",
  "jspdf-autotable": "^5.0.7"
}
```

### 3. Uso del Componente

```tsx
import RRHHInspectionManager from '@/app/(app)/inspections/ui/RRHHInspectionManager'
import { createClient } from '@/lib/supabase/server'

export default async function InspectionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Para crear una nueva inspección:
  return (
    <RRHHInspectionManager
      locationId="uuid-de-la-location"
      departmentName="RRHH"
      propertyCode="PROP-001"
      propertyName="Mi Propiedad"
      currentUser={user!}
      userName={user!.email || 'Usuario'}
      mode="create"
    />
  )
  
  // Para editar una existente:
  return (
    <RRHHInspectionManager
      inspectionId="uuid-de-la-inspección"
      locationId="uuid-de-la-location"
      departmentName="RRHH"
      propertyCode="PROP-001"
      propertyName="Mi Propiedad"
      currentUser={user!}
      userName={user!.email || 'Usuario'}
      mode="edit"
    />
  )
}
```

---

## 🔄 Flujo de Trabajo

1. **Usuario crea inspección:**
   - Se carga template de 10 áreas RRHH con 40 items en blanco
   - Estado inicial: `draft`

2. **Usuario evalúa items:**
   - Selecciona `Cumple` / `No Cumple` / `N/A` / vacío
   - Si "Cumple": ingresa calificación 0-10
   - Agrega comentarios por item

3. **Guardado:**
   - **"Guardar Borrador"**: guarda y mantiene `status = 'draft'`
   - **"Guardar y Completar"**: guarda y cambia a `status = 'completed'`
   - Los triggers de BD recalculan automáticamente:
     - Score promedio por área
     - Cobertura, cumplimiento, conteos
     - Estadísticas globales

4. **PDF:**
   - Botón "Generar PDF" descarga reporte con:
     - Encabezado con logo/fecha/inspector
     - KPIs (Promedio/Cobertura/Cumplimiento/Riesgo)
     - Gráfico de distribución
     - Detalle de cada área con tabla de items
     - Comentarios generales
     - Footer con timestamp y paginado

---

## 📊 Estructura de Datos

### Tabla Principal: `inspections_rrhh`
```sql
id, location_id, department, inspector_user_id, inspector_name,
inspection_date, property_code, property_name, status,
total_areas, total_items, items_cumple, items_no_cumple, items_na, items_pending,
coverage_percentage, compliance_percentage, average_score,
general_comments, created_at, updated_at, completed_at
```

### Áreas: `inspections_rrhh_areas`
```sql
id, inspection_id, area_name, area_order, calculated_score
```

### Items: `inspections_rrhh_items`
```sql
id, area_id, inspection_id, item_order, descripcion, tipo_dato,
cumplimiento_valor ('', 'Cumple', 'No Cumple', 'N/A'),
cumplimiento_editable, calif_valor, calif_editable,
comentarios_valor, comentarios_libre
```

---

## 🔐 Seguridad (RLS)

- **Usuarios** solo ven inspecciones de sus `user_locations`
- **Inspectores** pueden crear/editar sus propias inspecciones en `draft`
- **Supervisores/Gerentes/Admins** pueden editar cualquier inspección en sus locations
- **Completadas** son de solo lectura para todos excepto supervisores

---

## 📈 Próximos Pasos

1. **Otros Departamentos:**
   - Copiar template de RRHH
   - Ajustar áreas/items específicos del departamento
   - Reutilizar la misma infraestructura

2. **Dashboard de Reportes:**
   - Listado de inspecciones históricas
   - Filtros por fecha/departamento/status
   - Gráficos de tendencia

3. **Notificaciones:**
   - Alertar a supervisores cuando se completa una inspección
   - Recordatorios de inspecciones pendientes

---

## 🐛 Troubleshooting

### Error: "Missing Supabase credentials"
Verificar `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

### Error: "Permission denied" en BD
- Ejecutar el SQL de RLS políticas
- Verificar que el usuario tiene entrada en `user_locations`

### PDF no se genera
- Verificar que `jspdf` y `jspdf-autotable` están instaladas
- Revisar console del navegador para errores

---

**Sistema listo para producción** ✅
