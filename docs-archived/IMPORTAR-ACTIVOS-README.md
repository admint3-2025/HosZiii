# 📦 MIGRACIÓN DE ACTIVOS EXISTENTES

## Problema
Las tablas `assets_it` y `assets_maintenance` fueron creadas pero están vacías. Los activos existentes están en la tabla antigua `assets` y necesitan ser migrados.

## Solución

### Opción 1: Ejecutar SQL en Supabase (RECOMENDADO)

1. **Abre Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT_ID/editor
   ```

2. **Ve a SQL Editor**
   - Click en "SQL Editor" en el menú lateral
   - Click en "New query"

3. **Copia y pega el archivo**
   - Abre el archivo: `supabase/migration-import-existing-assets.sql`
   - Copia TODO el contenido
   - Pégalo en el editor SQL de Supabase

4. **Ejecuta la migración**
   - Click en "Run" o presiona `Ctrl+Enter`
   - Espera a que termine (puede tardar unos segundos)

5. **Verifica los resultados**
   ```sql
   -- Ver cuántos activos se migraron
   SELECT 
     'IT' as tipo,
     COUNT(*) as total
   FROM assets_it
   WHERE deleted_at IS NULL
   
   UNION ALL
   
   SELECT 
     'MAINTENANCE' as tipo,
     COUNT(*) as total
   FROM assets_maintenance
   WHERE deleted_at IS NULL;
   ```

### Opción 2: Ejecutar desde terminal con psql

```bash
# Si tienes psql instalado y la conexión configurada
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  -f supabase/migration-import-existing-assets.sql
```

## ¿Qué hace esta migración?

1. **Verifica** que las tablas `assets_it` y `assets_maintenance` existan
2. **Migra activos IT**: Todos los activos con tipos de IT:
   - DESKTOP, LAPTOP, TABLET, PHONE, MONITOR
   - PRINTER, SCANNER, SERVER, NETWORK_DEVICE
   - PERIPHERAL, UPS, PROJECTOR, NETWORK
   
3. **Migra activos de Mantenimiento**: Todos los activos con tipos de mantenimiento:
   - AIR_CONDITIONING, HVAC_SYSTEM, BOILER
   - REFRIGERATOR, KITCHEN_EQUIPMENT
   - WASHING_MACHINE, DRYER
   - WATER_HEATER, PUMP, GENERATOR, ELEVATOR
   - FURNITURE, FIXTURE, CLEANING_EQUIPMENT
   - SECURITY_SYSTEM, FIRE_SYSTEM
   - PLUMBING, ELECTRICAL, LIGHTING, VEHICLE, OTHER

4. **Mapea estados**: 
   - `OPERATIONAL` → `ACTIVE`
   - `MAINTENANCE` → `MAINTENANCE`
   - `OUT_OF_SERVICE` → `INACTIVE`
   - `RETIRED` → `DISPOSED`

5. **Muestra resultados**: Al final verás un resumen con:
   - Activos originales encontrados
   - Activos IT migrados
   - Activos Mantenimiento migrados
   - Total migrado

## Después de la migración

### Verificar en la aplicación

1. **Abre el módulo de mantenimiento**
   ```
   http://localhost:3000/mantenimiento/assets
   ```

2. **Deberías ver los activos de mantenimiento listados**

3. **Crea un nuevo ticket de mantenimiento**
   ```
   http://localhost:3000/mantenimiento/tickets/new
   ```

4. **Verifica que aparezcan activos en el selector de "Activo relacionado"**

### Si NO ves activos

Ejecuta esta query para verificar:

```sql
-- Ver si hay activos de mantenimiento
SELECT 
  asset_code,
  name,
  category,
  status,
  l.name as location
FROM assets_maintenance a
LEFT JOIN locations l ON a.location_id = l.id
WHERE a.deleted_at IS NULL
ORDER BY a.created_at DESC
LIMIT 20;
```

Si la query devuelve filas pero no ves activos en la app:

1. **Verifica tu perfil de usuario**:
   ```sql
   SELECT id, full_name, role, asset_category
   FROM profiles
   WHERE id = auth.uid();
   ```
   
   Tu `asset_category` debe ser `'MAINTENANCE'` o tu `role` debe ser `'admin'`

2. **Verifica RLS (Row Level Security)**:
   ```sql
   -- Ver políticas activas
   SELECT * FROM pg_policies 
   WHERE tablename = 'assets_maintenance';
   ```

## Troubleshooting

### Error: "La tabla assets_it no existe"
- Primero ejecuta: `supabase/migration-separate-it-maintenance-tables.sql`

### Error: "La tabla assets no existe"
- Significa que no tienes activos antiguos. Puedes crear activos directamente en `assets_maintenance`

### No se migraron activos (total = 0)
- Verifica que la tabla `assets` tenga datos:
  ```sql
  SELECT asset_type, COUNT(*) 
  FROM assets 
  WHERE deleted_at IS NULL 
  GROUP BY asset_type;
  ```
- Si no hay datos, necesitas crear activos manualmente

### Crear activos de prueba manualmente

```sql
-- Crear un activo de mantenimiento de prueba
INSERT INTO assets_maintenance (
  asset_code,
  name,
  category,
  brand,
  model,
  status,
  location_id
) VALUES (
  'MNT-AC-001',
  'Aire Acondicionado Principal',
  'AIR_CONDITIONING',
  'Carrier',
  '24000 BTU',
  'ACTIVE',
  (SELECT id FROM locations LIMIT 1)
);

-- Crear varios activos de ejemplo
INSERT INTO assets_maintenance (asset_code, name, category, status) VALUES
('MNT-HVAC-001', 'Sistema HVAC Edificio A', 'HVAC_SYSTEM', 'ACTIVE'),
('MNT-PUMP-001', 'Bomba de Agua Principal', 'PUMP', 'ACTIVE'),
('MNT-GEN-001', 'Generador de Emergencia', 'GENERATOR', 'MAINTENANCE'),
('MNT-ELEV-001', 'Elevador Piso 1-5', 'ELEVATOR', 'ACTIVE'),
('MNT-WASH-001', 'Lavadora Industrial', 'WASHING_MACHINE', 'ACTIVE');
```

## Verificar que la página funciona

Después de importar o crear activos, ve a:

**Página de activos de mantenimiento:**
```
http://localhost:3000/mantenimiento/assets
```

**Crear nuevo ticket (con selector de activos):**
```
http://localhost:3000/mantenimiento/tickets/new
```

Deberías ver:
- ✅ Lista de activos en la página de activos
- ✅ Selector de activos en el formulario de nuevo ticket
- ✅ Filtros funcionando (por sede, estado)

---

## Resumen ejecutivo

```bash
# 1. Ejecuta la migración en Supabase SQL Editor
supabase/migration-import-existing-assets.sql

# 2. Verifica que se migraron
SELECT COUNT(*) FROM assets_maintenance WHERE deleted_at IS NULL;

# 3. Si es 0, crea activos de prueba con el SQL de arriba

# 4. Abre la app y verifica
# http://localhost:3000/mantenimiento/assets
```

🎉 ¡Listo! Ahora la página de activos de mantenimiento debería mostrar datos.
