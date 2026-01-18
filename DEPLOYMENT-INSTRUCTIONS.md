# 🚀 INSTRUCCIONES PARA EJECUTAR MIGRATION EN SUPABASE

## **PASO 1: PREPARACIÓN**

1. **Backup de base de datos** (CRÍTICO):
   - Ve a Supabase Dashboard
   - Project → Backups
   - Crea un backup manual antes de ejecutar

2. **Acceso a SQL Editor**:
   - Supabase Dashboard → SQL Editor
   - O usa: `psql` con connection string

---

## **PASO 2: EJECUTAR MIGRATION**

### **Opción A: Desde Supabase Dashboard**

1. Abre: https://app.supabase.com/project/[PROJECT-ID]/sql/new
2. Abre el archivo: `/supabase/migration-separate-it-maintenance-tables.sql`
3. **Copia TODO el contenido** del archivo
4. Pega en el editor SQL
5. Haz clic en **"Run"** (▶️)
6. Espera hasta que veas ✅ "Success"

### **Opción B: Desde Terminal (psql)**

```bash
# Reemplaza con tus credenciales
PGPASSWORD="tu_password" psql \
  -h tu-project.supabase.co \
  -U postgres \
  -d postgres \
  -f supabase/migration-separate-it-maintenance-tables.sql
```

### **Opción C: Desde Docker (si usas)

```bash
docker-compose exec -T db psql -U postgres \
  -f /dev/stdin < supabase/migration-separate-it-maintenance-tables.sql
```

---

## **PASO 3: VERIFICACIÓN**

Después de ejecutar, verifica que TODO se creó correctamente:

```sql
-- 1. Verificar TABLAS creadas
SELECT tablename FROM pg_tables 
WHERE tablename IN (
  'tickets_it', 'tickets_maintenance',
  'assets_it', 'assets_maintenance',
  'ticket_comments_it', 'ticket_comments_maintenance',
  'ticket_attachments_it', 'ticket_attachments_maintenance'
)
ORDER BY tablename;

-- Resultado esperado: 8 filas ✅
```

```sql
-- 2. Verificar RLS POLICIES
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename LIKE 'tickets_%'
   OR tablename LIKE 'assets_%'
ORDER BY tablename, policyname;

-- Resultado esperado: 16 policies (2 por tabla)
```

```sql
-- 3. Verificar ÍNDICES
SELECT tablename, indexname
FROM pg_indexes
WHERE tablename LIKE 'tickets_%'
   OR tablename LIKE 'assets_%'
ORDER BY tablename;

-- Resultado esperado: Múltiples índices por tabla
```

```sql
-- 4. Verificar DATOS MIGRADOS
SELECT 
  'tickets_it' as tabla,
  COUNT(*) as total
FROM tickets_it
UNION ALL
SELECT 'tickets_maintenance', COUNT(*) FROM tickets_maintenance
UNION ALL
SELECT 'assets_it', COUNT(*) FROM assets_it
UNION ALL
SELECT 'assets_maintenance', COUNT(*) FROM assets_maintenance
ORDER BY tabla;

-- Resultado esperado: Números > 0 si hay datos previos
```

---

## **PASO 4: VALIDACIÓN DE RLS**

Prueba que RLS está funcionando correctamente:

```sql
-- 1. Login como usuario IT
-- (necesitas conocer su UUID en profiles.id)

SELECT * FROM tickets_it 
WHERE requester_id = 'uuid-del-usuario-it';
-- Debe retornar: tickets donde requester_id coincide

-- 2. Intenta acceder desde usuario Maintenance
SELECT * FROM tickets_it;
-- Debe retornar: Error de permiso o cero filas (según policy)
```

---

## **PASO 5: CONFIGURAR USUARIOS**

Asegúrate que todos los usuarios tienen `asset_category` asignado:

```sql
-- Ver usuarios sin asset_category
SELECT id, full_name, role, asset_category
FROM profiles
WHERE asset_category IS NULL;

-- Asignar a IT (default para agents sin especificar)
UPDATE profiles
SET asset_category = 'IT'
WHERE role IN ('agent_l1', 'agent_l2', 'supervisor')
  AND asset_category IS NULL
  AND full_name NOT LIKE '%Mantenimiento%'
  AND full_name NOT LIKE '%Ingeniería%';

-- Asignar a MAINTENANCE (si reconoces por nombre)
UPDATE profiles
SET asset_category = 'MAINTENANCE'
WHERE id IN (
  'uuid-user-1',
  'uuid-user-2'
  -- Reemplaza con UUIDs reales
);

-- Verificar resultado
SELECT id, full_name, role, asset_category
FROM profiles
WHERE role IN ('agent_l1', 'agent_l2', 'supervisor')
ORDER BY asset_category;
```

---

## **PASO 6: REINICIAR APLICACIÓN**

```bash
# En la carpeta del proyecto
npm run dev

# O si usas Docker
docker-compose restart web
```

**Pruebas en navegador:**
1. Login como usuario IT → Debería ver `/dashboard` y `/tickets` (IT)
2. Login como usuario Maintenance → Debería ver `/mantenimiento/dashboard`
3. Try acceso directo `/dashboard` como Maintenance user → Debe redirigir a `/mantenimiento/dashboard`
4. Login como admin → Ver AMBOS sistemas

---

## **TROUBLESHOOTING**

### **Problema: "Relation 'tickets_it' does not exist"**

**Solución:**
```bash
# Migration no se ejecutó completamente
# Reintentar PASO 2
# Verificar que NO hay errores en consola SQL
```

### **Problema: "permission denied" en queries**

**Solución:**
```sql
-- RLS policy está bloqueando
-- Verificar:
SELECT * FROM profiles 
WHERE id = current_user_id()
AND asset_category = 'IT';

-- Si retorna 0 filas, el user no tiene asset_category asignado
-- Ver PASO 5 para asignar
```

### **Problema: Datos no se migraron**

**Solución:**
```sql
-- Verificar datos en tablas antiguas
SELECT COUNT(*) FROM tickets WHERE service_area = 'it';
SELECT COUNT(*) FROM tickets WHERE service_area = 'maintenance';

-- Si hay datos, reejecutar INSERT manually:
INSERT INTO tickets_it (...)
SELECT ... FROM tickets
WHERE service_area = 'it' 
  AND deleted_at IS NULL
  AND id NOT IN (SELECT id FROM tickets_it);
```

### **Problema: Loop infinito de redirects**

**Solución:**
```bash
# 1. Limpiar cookies del navegador
# 2. Verificar middleware en src/middleware.ts
# 3. Verificar profiles.asset_category está seteado
# 4. Reiniciar servidor: npm run dev
```

---

## **ROLLBACK (Si algo falla)**

Si necesitas volver atrás:

```sql
-- OPCIÓN 1: Usa Supabase Backups
-- Supabase Dashboard → Backups → Restore

-- OPCIÓN 2: Drop tablas manualmente (último recurso)
DROP TABLE IF EXISTS ticket_attachments_maintenance CASCADE;
DROP TABLE IF EXISTS ticket_comments_maintenance CASCADE;
DROP TABLE IF EXISTS ticket_attachments_it CASCADE;
DROP TABLE IF EXISTS ticket_comments_it CASCADE;
DROP TABLE IF EXISTS tickets_maintenance CASCADE;
DROP TABLE IF EXISTS tickets_it CASCADE;
DROP TABLE IF EXISTS assets_maintenance CASCADE;
DROP TABLE IF EXISTS assets_it CASCADE;
```

---

## **CHECKLIST POST-DEPLOYMENT**

- [ ] Backup creado
- [ ] SQL Migration ejecutada sin errores
- [ ] 8 tablas creadas ✅
- [ ] RLS policies creadas ✅
- [ ] Datos migrados correctamente
- [ ] Usuarios tienen `asset_category` asignado
- [ ] Aplicación reiniciada
- [ ] Usuario IT ve dashboard correcto
- [ ] Usuario Maintenance ve /mantenimiento/dashboard
- [ ] Admin ve ambos
- [ ] No hay redirect loops
- [ ] Queries funcionan normalmente

---

## **CONTACTO / SOPORTE**

Si hay problemas:
1. Verifica que `asset_category` está seteado en profiles
2. Confirma RLS policies existen
3. Revisa logs: `npm run dev`
4. Restaura backup si es necesario

**Tiempo estimado:** 10-15 minutos  
**Downtime esperado:** ~2 minutos  
**Risk Level:** 🟡 MEDIUM (por eso el backup)
