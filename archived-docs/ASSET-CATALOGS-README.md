# Catálogos Dinámicos para Activos

## Problema Resuelto

Antes, los supervisores y administradores no podían agregar nuevos procesadores, sistemas operativos o tipos de activos. Los catálogos estaban hardcodeados en el código frontend, requiriendo cambios de código para agregar nuevas opciones.

## Solución Implementada

Se crearon tablas de catálogos dinámicos que permiten a supervisores y administradores agregar elementos directamente desde la interfaz de usuario sin necesidad de modificar código.

### Nuevas Tablas

1. **`asset_processors`**: Catálogo de procesadores
   - Campos: `name`, `manufacturer` (Intel, AMD, Apple), `is_active`
   - Permisos: Lectura todos, escritura admin/supervisor

2. **`asset_operating_systems`**: Catálogo de sistemas operativos
   - Campos: `name`, `os_family` (Windows, Linux, macOS), `is_active`
   - Permisos: Lectura todos, escritura admin/supervisor

3. **`asset_custom_types`**: Tipos de activos personalizados
   - Campos: `name`, `description`, `is_active`
   - Permisos: Lectura todos, escritura admin/supervisor
   - Nota: Complementa los tipos base (DESKTOP, LAPTOP, etc.)

### Componente `ComboboxWithAdd`

Nuevo componente que reemplaza a `ComboboxInput` para campos dinámicos:

**Características:**
- Búsqueda y selección de opciones existentes
- Botón "Agregar al catálogo" que aparece al escribir un valor nuevo
- Auto-detección de fabricante/familia (Intel, AMD, Windows, Linux, etc.)
- Indicador de carga mientras agrega
- Actualización automática de la lista después de agregar
- Feedback visual con alertas de éxito/error

**Uso:**
```tsx
<ComboboxWithAdd
  id="processor"
  label="Procesador"
  value={formData.processor}
  onChange={(value) => setFormData({ ...formData, processor: value })}
  suggestions={processorSuggestions}
  placeholder="Buscar o escribir procesador..."
  allowAdd={userRole === 'admin' || userRole === 'supervisor'}
  tableName="asset_processors"
  onSuggestionsUpdate={setProcessorSuggestions}
/>
```

## Instalación

### 1. Ejecutar migración SQL

```bash
cd /media/jmosorioe/DEV/deV/ZIII-helpdesk
# Ejecutar en Supabase SQL Editor o con psql
psql [connection-string] -f supabase/migration-add-asset-catalogs.sql
```

O desde Supabase Dashboard:
1. Ir a SQL Editor
2. Copiar todo el contenido de `supabase/migration-add-asset-catalogs.sql`
3. Ejecutar

### 2. Verificar tablas creadas

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('asset_processors', 'asset_operating_systems', 'asset_custom_types');
```

### 3. Verificar datos iniciales

```sql
-- Procesadores
SELECT COUNT(*) as total_processors FROM asset_processors WHERE is_active = true;

-- Sistemas Operativos
SELECT COUNT(*) as total_os FROM asset_operating_systems WHERE is_active = true;
```

Debería mostrar:
- `total_processors`: 35 (Intel, AMD, Apple M-series)
- `total_os`: 19 (Windows, Linux, macOS, Chrome OS)

## Uso en la UI

### Agregar Nuevo Procesador

1. Ir a **Admin → Activos → Nuevo Activo**
2. Seleccionar tipo: **Desktop** o **Laptop**
3. En el campo **Procesador**, escribir el nombre del nuevo procesador
   - Ejemplo: `Intel Core i5-14600K`
4. Aparece el botón **"Agregar 'Intel Core i5-14600K' al catálogo"**
5. Hacer clic en el botón
6. El sistema detecta automáticamente el fabricante (Intel) y lo agrega
7. El nuevo procesador queda disponible para todos los usuarios

### Agregar Nuevo Sistema Operativo

1. Mismo flujo que procesador
2. En el campo **Sistema Operativo**, escribir el nombre
   - Ejemplo: `Ubuntu 25.04 LTS`
3. El sistema detecta la familia (Linux) automáticamente
4. Queda agregado al catálogo

### Tipos de Activos Personalizados

Los tipos base están fijos en el código (Desktop, Laptop, Impresora, etc.).  
La tabla `asset_custom_types` está lista para uso futuro si se requiere expandir con tipos completamente personalizados.

## Permisos

### Lectura (Todos los usuarios autenticados)
- Ver listas de procesadores activos
- Ver listas de sistemas operativos activos
- Ver listas de tipos personalizados activos

### Escritura (Admins y Supervisores)
- Agregar nuevos procesadores
- Agregar nuevos sistemas operativos
- Agregar nuevos tipos personalizados
- Actualizar elementos existentes
- Desactivar elementos (soft delete via `is_active = false`)

### Eliminación (Solo Admins)
- Eliminar permanentemente elementos del catálogo

## Auditoría

Cada elemento de catálogo registra:
- `created_by`: Usuario que agregó el elemento
- `created_at`: Fecha de creación
- `updated_at`: Última modificación
- `is_active`: Estado activo/inactivo

Las inserciones, actualizaciones y eliminaciones pueden rastrearse desde la tabla de auditoría general del sistema.

## Mantenimiento

### Desactivar un elemento

```sql
-- Desactivar un procesador obsoleto
UPDATE asset_processors
SET is_active = false
WHERE name = 'Intel Pentium 4';

-- Desactivar un sistema operativo descontinuado
UPDATE asset_operating_systems
SET is_active = false
WHERE name = 'Windows XP';
```

Los elementos desactivados ya no aparecen en los dropdowns pero se mantienen en la base de datos para preservar integridad referencial con activos existentes.

### Agregar elementos masivamente

```sql
-- Agregar múltiples procesadores
INSERT INTO asset_processors (name, manufacturer) VALUES
  ('Intel Core i5-14600K', 'Intel'),
  ('AMD Ryzen 5 8600G', 'AMD'),
  ('Apple M4', 'Apple')
ON CONFLICT (name) DO NOTHING;

-- Agregar múltiples sistemas operativos
INSERT INTO asset_operating_systems (name, os_family) VALUES
  ('Windows 12', 'Windows'),
  ('Ubuntu 25.04 LTS', 'Linux'),
  ('macOS 15', 'macOS')
ON CONFLICT (name) DO NOTHING;
```

## Archivos Modificados

### Nuevos
- `/supabase/migration-add-asset-catalogs.sql` - Migración de tablas
- `/src/components/ComboboxWithAdd.tsx` - Componente con agregar dinámico

### Modificados
- `/src/app/(app)/admin/assets/new/ui/AssetCreateForm.tsx` - Usa nuevo componente y carga datos de BD

### Sin cambios (compatibilidad)
- `/src/components/ComboboxInput.tsx` - Mantiene exportaciones de RAM/Storage
- Otros formularios de activos siguen funcionando normalmente

## Notas Técnicas

1. **Auto-detección de fabricante/familia**: El componente usa patrones para detectar fabricantes de procesadores (Intel, AMD, Apple) y familias de SO (Windows, Linux, macOS) basándose en el texto ingresado.

2. **Constraint UNIQUE**: Los nombres de procesadores y sistemas operativos son únicos. No se pueden duplicar.

3. **RLS Policies**: Las políticas de seguridad a nivel de fila (RLS) garantizan que solo usuarios autorizados puedan modificar catálogos.

4. **Soft Delete**: Los elementos se desactivan con `is_active = false` en lugar de eliminarse para preservar historial.

5. **Compatibilidad**: RAM y almacenamiento mantienen las sugerencias hardcodeadas ya que son valores estándar numéricos.

## Solución de Problemas

### No aparece el botón "Agregar al catálogo"

**Causa**: El valor ya existe en el catálogo o el usuario no tiene permisos.

**Solución**:
- Verificar que el texto no coincida exactamente con una opción existente
- Confirmar que el usuario es admin o supervisor

### Error "No tienes permisos para agregar elementos"

**Causa**: Las políticas RLS bloquean la inserción.

**Solución**:
```sql
-- Verificar rol del usuario
SELECT role FROM profiles WHERE id = '[user-id]';

-- Debe ser 'admin' o 'supervisor'
```

### El catálogo no se actualiza después de agregar

**Causa**: El callback `onSuggestionsUpdate` no se está llamando correctamente.

**Solución**: Verificar que el componente padre tiene la prop `onSuggestionsUpdate` conectada correctamente al estado.

## Roadmap Futuro

- [ ] Panel de administración de catálogos en `/admin/catalogs`
- [ ] Búsqueda y filtrado avanzado en catálogos
- [ ] Exportar/importar catálogos en CSV
- [ ] Sugerencias inteligentes basadas en tendencias
- [ ] Soporte para imágenes/iconos en elementos de catálogo
