# ⚡ ACCIÓN REQUERIDA: Ejecutar SQL en Supabase

## 1️⃣ Ir a Supabase Dashboard

Navega a: **SQL Editor → New Query**

## 2️⃣ Copiar y Ejecutar

Pega el contenido COMPLETO de este archivo:
```
supabase/inspections-rrhh-schema.sql
```

Luego presiona **RUN** o **Ctrl+Enter**

## 3️⃣ Verificar Creación

Deberías ver en **Table Editor**:
- ✅ `inspections_rrhh`
- ✅ `inspections_rrhh_areas`
- ✅ `inspections_rrhh_items`

## 4️⃣ Probar el Dashboard

El sistema ya está conectado y funcional:

### Archivos Principales:
- **Servicio BD:** `src/lib/services/inspections-rrhh.service.ts`
- **Servicio PDF:** `src/lib/services/inspections-rrhh-pdf.service.ts`
- **Manager UI:** `src/app/(app)/inspections/ui/RRHHInspectionManager.tsx`
- **Dashboard UI:** `src/app/(app)/inspections/ui/RRHHDashboard.tsx`

### Características:
✅ **Guardar Borrador** - Guarda sin completar (status = 'draft')  
✅ **Guardar y Completar** - Marca como completada (status = 'completed')  
✅ **Generar PDF** - Descarga reporte profesional con KPIs, gráficos, detalle por área  
✅ **Trend Data** - Carga historial de las últimas 5 inspecciones  
✅ **Auto-cálculo** - Stats y scores se recalculan automáticamente por triggers  
✅ **RLS Seguro** - Usuarios solo ven sus locations  

### Próximos Pasos:
1. Ejecutar el SQL
2. Integrar `RRHHInspectionManager` en tu routing
3. Decidir áreas de inspección para otros departamentos
4. (Opcional) Crear listado de inspecciones históricas

---

**Ver documentación completa:** `INSPECCIONES-RRHH-README.md`
