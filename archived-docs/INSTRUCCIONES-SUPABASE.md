# 📋 INSTRUCCIONES PARA EJECUTAR EN SUPABASE

## ⚠️ IMPORTANTE: Ejecutar en orden

### 1️⃣ Migración de Ubicaciones (CRÍTICO)

**Este paso es obligatorio antes de que funcione multisede**

Accede a tu servidor Supabase y ejecuta la migración:

```bash
# Opción A: Desde el servidor (RECOMENDADO)
ssh root@192.168.31.240
cd /opt/helpdesk
docker exec -i supabase-db psql -U postgres -d postgres < supabase/migration-add-locations.sql
```

```sql
-- Opción B: Desde Supabase Studio (http://127.0.0.1:54323)
-- 1. Ve a SQL Editor
-- 2. Copia y pega el contenido completo de: supabase/migration-add-locations.sql
-- 3. Click en "Run"
```

**Qué hace esta migración:**
- ✅ Crea tabla `locations` con todos los campos (nombre, código, ciudad, estado, etc.)
- ✅ Agrega `location_id` a `profiles` y `tickets`
- ✅ Crea trigger `set_ticket_location()` para auto-asignar ubicación al crear tickets
- ✅ Crea funciones auxiliares `is_admin_user()` y `get_user_location()`
- ✅ Agrega índices para optimizar queries
- ✅ Actualiza trigger de auditoría

---

### 2️⃣ Crear Ubicaciones Iniciales

```sql
-- Ejecutar en SQL Editor de Supabase Studio

INSERT INTO locations (name, code, city, state, country) VALUES
  ('Sede Central Monterrey', 'MTY', 'Monterrey', 'Nuevo León', 'México'),
  ('Sucursal Ciudad de México', 'CDMX', 'Ciudad de México', 'CDMX', 'México'),
  ('Sucursal Guadalajara', 'GDL', 'Guadalajara', 'Jalisco', 'México')
ON CONFLICT (code) DO NOTHING;

-- Verificar que se crearon correctamente
SELECT id, name, code, city FROM locations ORDER BY name;
```

---

### 3️⃣ Asignar Ubicaciones a Usuarios Existentes

**IMPORTANTE:** Cada usuario debe tener una ubicación asignada para ver tickets.

```sql
-- Ver usuarios sin ubicación asignada
SELECT id, email, full_name, role, location_id 
FROM profiles 
WHERE location_id IS NULL;

-- Ejemplo: Asignar usuarios específicos a Monterrey
UPDATE profiles 
SET location_id = (SELECT id FROM locations WHERE code = 'MTY')
WHERE email IN (
  'supervisor@test.com',
  'agent1@empresa.com',
  'user1@empresa.com'
);

-- Ejemplo: Asignar usuarios a CDMX
UPDATE profiles 
SET location_id = (SELECT id FROM locations WHERE code = 'CDMX')
WHERE email IN (
  'agent2@empresa.com',
  'user2@empresa.com'
);

-- Ejemplo: Asignar usuarios a Guadalajara
UPDATE profiles 
SET location_id = (SELECT id FROM locations WHERE code = 'GDL')
WHERE email IN (
  'agent3@empresa.com'
);

-- Verificar asignaciones
SELECT 
  p.email, 
  p.full_name, 
  p.role, 
  l.name as ubicacion,
  l.code as codigo
FROM profiles p
LEFT JOIN locations l ON p.location_id = l.id
ORDER BY l.name, p.email;
```

---

### 4️⃣ Migrar Tickets Existentes (Opcional)

Si ya tienes tickets creados antes de implementar multisede:

```sql
-- Asignar ubicación del solicitante a tickets sin ubicación
UPDATE tickets t
SET location_id = p.location_id
FROM profiles p
WHERE t.requester_id = p.id
  AND t.location_id IS NULL
  AND p.location_id IS NOT NULL;

-- Verificar cuántos tickets tienen ubicación asignada
SELECT 
  CASE WHEN location_id IS NULL THEN 'Sin ubicación' ELSE 'Con ubicación' END as estado,
  COUNT(*) as cantidad
FROM tickets
WHERE deleted_at IS NULL
GROUP BY estado;

-- Ver tickets sin ubicación con su solicitante
SELECT 
  t.ticket_number,
  t.title,
  p.email as solicitante,
  p.location_id as usuario_tiene_ubicacion
FROM tickets t
JOIN profiles p ON t.requester_id = p.id
WHERE t.location_id IS NULL
  AND t.deleted_at IS NULL
LIMIT 20;
```

---

### 5️⃣ Verificación Post-Migración

```sql
-- 1. Verificar estructura de locations
\d locations

-- 2. Contar ubicaciones activas
SELECT COUNT(*) as total_ubicaciones FROM locations WHERE is_active = true;

-- 3. Estadísticas de usuarios por ubicación
SELECT 
  l.name as ubicacion,
  l.code,
  COUNT(p.id) as usuarios
FROM locations l
LEFT JOIN profiles p ON l.id = p.location_id
GROUP BY l.id, l.name, l.code
ORDER BY l.name;

-- 4. Estadísticas de tickets por ubicación
SELECT 
  l.name as ubicacion,
  l.code,
  COUNT(t.id) as tickets_activos,
  COUNT(t.id) FILTER (WHERE t.status IN ('NEW', 'ASSIGNED', 'IN_PROGRESS')) as abiertos,
  COUNT(t.id) FILTER (WHERE t.status = 'CLOSED') as cerrados
FROM locations l
LEFT JOIN tickets t ON l.id = t.location_id AND t.deleted_at IS NULL
GROUP BY l.id, l.name, l.code
ORDER BY l.name;

-- 5. Verificar triggers
SELECT 
  trigger_name, 
  event_manipulation, 
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'tickets'
  AND trigger_name = 'trg_tickets_set_location';

-- 6. Verificar funciones
SELECT routine_name, routine_type 
FROM information_schema.routines
WHERE routine_name IN ('set_ticket_location', 'is_admin_user', 'get_user_location');
```

---

## ✅ ESTADO ACTUAL

- ✅ **Políticas de Assets actualizadas** - Supervisores pueden crear activos
- ⚠️ **Migración de ubicaciones PENDIENTE** - Debe ejecutarse manualmente
- ⚠️ **Ubicaciones iniciales PENDIENTES** - Crear MTY, CDMX, GDL
- ⚠️ **Asignación a usuarios PENDIENTE** - Asignar a cada usuario su sede

---

## 🚨 NOTAS IMPORTANTES

1. **Sin la migración, la aplicación NO funcionará** - Generará errores de columnas faltantes
2. **Usuarios sin ubicación NO verán tickets** (excepto admin)
3. **Admin SIEMPRE ve todas las ubicaciones** independientemente de su `location_id`
4. **Los triggers asignan automáticamente** la ubicación a nuevos tickets
5. **Ubicaciones inactivas** (`is_active=false`) no aparecen en dropdowns pero mantienen datos

---

## 📞 SOPORTE

Si hay errores durante la migración:

```sql
-- Revertir cambios si es necesario (CUIDADO!)
DROP TABLE IF EXISTS locations CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS location_id;
ALTER TABLE tickets DROP COLUMN IF EXISTS location_id;
DROP FUNCTION IF EXISTS set_ticket_location() CASCADE;
DROP FUNCTION IF EXISTS is_admin_user(uuid);
DROP FUNCTION IF EXISTS get_user_location();
```

---

## 📚 DOCUMENTACIÓN ADICIONAL

Ver archivo [MULTISEDE-README.md](./MULTISEDE-README.md) para:
- Ejemplos de uso en código
- Arquitectura completa
- Políticas RLS opcionales
- FAQ y troubleshooting
