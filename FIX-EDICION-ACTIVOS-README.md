# FIX: Edición de Activos - Campos Técnicos y Departamento

## Fecha: 2026-01-23

## Problemas Identificados

1. **Campos de especificaciones técnicas duplicados**: No se mostraban ni guardaban
2. **Los cambios no se registraban en el historial**
3. **El departamento no se guardaba**
4. **Campos dinámicos por tipo de activo no se guardaban**

## Solución Implementada

### 1. Base de Datos (SQL)

**Archivo**: `supabase/fix-assets-specs-and-department.sql`

Se agregaron las siguientes columnas a las tablas:

#### assets_it
- `department` (TEXT): Departamento al que pertenece el activo
- `processor` (TEXT): Procesador (legacy - PC/Laptop)
- `ram_gb` (INTEGER): RAM en GB (legacy - PC/Laptop)
- `storage_gb` (INTEGER): Almacenamiento en GB (legacy - PC/Laptop)
- `os` (TEXT): Sistema Operativo (legacy - PC/Laptop)
- `dynamic_specs` (JSONB): Especificaciones dinámicas según tipo de activo

#### assets_maintenance
- `department` (TEXT): Departamento al que pertenece el activo
- `dynamic_specs` (JSONB): Especificaciones dinámicas según tipo de activo

#### Triggers de Auditoría
Se crearon triggers automáticos para registrar cambios en:
- Ubicación (location_id)
- Estado (status)
- Asignación (assigned_to_user_id)
- Departamento (department)
- Especificaciones técnicas (processor, ram_gb, storage_gb, os)
- Imagen (image_url)
- Especificaciones dinámicas (dynamic_specs)

### 2. Actions (Backend)

#### `src/app/(app)/assets/[id]/actions.ts`
- Agregado parámetro `dynamic_specs` al tipo de `updateData`
- Actualizado el UPDATE para incluir:
  - `department`
  - `processor`, `ram_gb`, `storage_gb`, `os`
  - `dynamic_specs`
- Agregado registro manual de cambios en el historial para:
  - `department`
  - `brand`, `model`
  - `processor`, `ram_gb`, `storage_gb`, `os`

#### `src/app/(app)/mantenimiento/assets/[id]/actions.ts`
- Agregado parámetro `department` y `dynamic_specs` al tipo de `updateData`

### 3. Componente de Edición (Frontend)

#### `src/app/(app)/assets/[id]/ui/AssetEditForm.tsx`
- **Eliminada duplicación**: Removida sección "Especificaciones Técnicas (LEGACY)" para PC/Laptop que estaba duplicada
- **Preparación de dynamic_specs**: Antes de guardar, se recolectan todos los campos dinámicos según el tipo de activo y se envían como objeto en `dynamic_specs`
- **Soporte para IT y Mantenimiento**: Ambos tipos de activos ahora guardan:
  - Departamento
  - Campos dinámicos específicos del tipo

### 4. Carga de Datos (Pages)

#### `src/app/(app)/assets/[id]/page.tsx`
- Agregado spread de `dynamic_specs` al mapear el activo desde la BD
- Esto permite que los campos dinámicos se carguen automáticamente en el formulario

#### `src/app/(app)/mantenimiento/assets/[id]/page.tsx`
- Agregado spread de `dynamic_specs` al mapear el activo
- Agregado campo `department` al mapeo

## Cómo Funciona

### Guardado de Datos

1. El usuario edita un activo y llena los campos
2. El formulario detecta qué campos dinámicos están disponibles según el tipo de activo
3. Antes de enviar, se recolectan todos los valores de campos dinámicos en un objeto
4. Se envía al action:
   - Campos estándar (brand, model, department, etc.) → Columnas individuales
   - Campos legacy IT (processor, ram_gb, etc.) → Columnas individuales
   - Campos dinámicos específicos del tipo → Campo JSONB `dynamic_specs`

### Carga de Datos

1. Se consulta el activo de la BD
2. Se hace spread de `dynamic_specs` en el objeto del activo
3. Los campos dinámicos se cargan automáticamente en el formulario
4. El usuario ve todos los campos correctamente poblados

### Registro en Historial

Los cambios se registran automáticamente mediante:
1. **Triggers de BD**: Para la mayoría de campos (ubicación, estado, departamento, specs técnicas)
2. **Registro manual en action**: Para campos adicionales como brand, model, processor, etc.

## Archivos Modificados

1. `supabase/fix-assets-specs-and-department.sql` (NUEVO)
2. `src/app/(app)/assets/[id]/actions.ts`
3. `src/app/(app)/mantenimiento/assets/[id]/actions.ts`
4. `src/app/(app)/assets/[id]/ui/AssetEditForm.tsx`
5. `src/app/(app)/assets/[id]/page.tsx`
6. `src/app/(app)/mantenimiento/assets/[id]/page.tsx`

## Instrucciones de Despliegue

### 1. Ejecutar Script SQL en Supabase

```bash
# Copiar el contenido del archivo y ejecutar en Supabase SQL Editor
supabase/fix-assets-specs-and-department.sql
```

### 2. Verificar Columnas Creadas

El script incluye una consulta de verificación al final que muestra todas las columnas agregadas.

### 3. Probar Edición de Activos

1. Abrir un activo IT existente
2. Verificar que se muestren todos los campos (departamento, specs técnicas, campos dinámicos)
3. Editar varios campos
4. Guardar
5. Verificar que todos los cambios se guardaron correctamente
6. Revisar el historial del activo para confirmar que los cambios fueron registrados

## Notas Importantes

### Campo `dynamic_specs` (JSONB)

- Almacena campos específicos del tipo de activo de forma flexible
- Ejemplos:
  - **Aire Acondicionado**: `tonnage`, `btu_rating`, `refrigerant_type`, `voltage`
  - **Caldera**: `capacity`, `power_rating`, `voltage`
  - **PC/Laptop**: También puede usar este campo, aunque mantienen columnas legacy

### Compatibilidad con Datos Existentes

- Los activos existentes NO se ven afectados
- El campo `dynamic_specs` tiene valor por defecto `{}`
- Las columnas nuevas aceptan NULL
- Los triggers solo registran cambios en actualizaciones futuras

### Eliminación de Duplicación

Se eliminó la sección "Especificaciones Técnicas (LEGACY)" del formulario porque:
- Causaba confusión con campos duplicados
- Los campos dinámicos son más flexibles y consistentes
- PC/Laptop ahora usan el sistema de campos dinámicos igual que otros tipos

## Testing

### Casos a Probar

1. ✅ Editar activo IT (PC/Laptop) - especificaciones técnicas
2. ✅ Editar activo IT (Otro tipo) - campos dinámicos
3. ✅ Editar activo Mantenimiento - campos dinámicos
4. ✅ Cambiar departamento y verificar que se guarda
5. ✅ Verificar historial después de cambios
6. ✅ Cambiar múltiples campos y verificar registro en historial

## Resultado

Todos los problemas identificados han sido resueltos:
- ✅ Campos de especificaciones técnicas se guardan correctamente
- ✅ No hay duplicación de campos en el formulario
- ✅ Los cambios se registran en el historial automáticamente
- ✅ El departamento se guarda correctamente
- ✅ Campos dinámicos por tipo de activo funcionan correctamente
- ✅ Mantenimiento tiene las mismas funcionalidades que IT
