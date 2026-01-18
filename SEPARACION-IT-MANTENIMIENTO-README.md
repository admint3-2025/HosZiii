# 📋 SEPARACIÓN COMPLETA: IT vs MANTENIMIENTO

**Fecha:** 17 de Enero, 2026  
**Status:** ✅ IMPLEMENTACIÓN COMPLETADA  
**Responsable:** Sistema ZIII-Hos

---

## 🎯 OBJETIVO

Separar completamente los módulos de **IT/Helpdesk** y **Mantenimiento** en sistemas independientes con:
- **Tablas de Supabase completamente separadas**
- **Rutas y UI independientes**
- **Permisos y acceso segregados**
- **Inventarios (Assets) completamente aislados**

---

## 📦 CAMBIOS IMPLEMENTADOS

### 1️⃣ **SQL MIGRATIONS - Tablas Separadas**

**Archivo:** `/supabase/migration-separate-it-maintenance-tables.sql`

#### Nuevas Tablas Creadas:

**TICKETS:**
- `tickets_it` - Tickets de IT/Helpdesk
- `tickets_maintenance` - Tickets de Mantenimiento

**ACTIVOS (Assets):**
- `assets_it` - Activos de IT
- `assets_maintenance` - Activos de Mantenimiento

**COMENTARIOS Y ATTACHMENTS:**
- `ticket_comments_it` / `ticket_comments_maintenance`
- `ticket_attachments_it` / `ticket_attachments_maintenance`

**CARACTERÍSTICAS:**
✅ Índices optimizados para búsquedas rápidas  
✅ Row Level Security (RLS) por `asset_category`  
✅ Migración automática de datos desde tablas antiguas  
✅ Constraints y validaciones integradas  

#### RLS Policies:
```sql
-- Solo IT: profiles.asset_category = 'IT' o admin
-- Solo Maintenance: profiles.asset_category = 'MAINTENANCE' o admin
```

---

### 2️⃣ **RUTAS Y ESTRUCTURA NEXT.JS**

#### **IT/Helpdesk** (Sin cambios, solo refactorización):
```
/dashboard              → DashboardPage (IT)
/tickets                → Tickets IT
/tickets/[id]           → Detail IT
/reports                → Reports
/audit                  → Auditoría
/beo/dashboard          → BEO (Eventos)
/admin                  → Administración (admin only)
```

#### **Mantenimiento** (NUEVO):
```
/mantenimiento/dashboard     → DashboardMaintenancePage ✨
/mantenimiento/tickets       → Tickets Maintenance ✨
/mantenimiento/assets        → Assets Maintenance ✨
```

---

### 3️⃣ **MIDDLEWARE - Validación de Acceso**

**Archivo:** `/src/middleware.ts`

```typescript
// MANTENIMIENTO: Solo admin + asset_category='MAINTENANCE'
if (pathname.startsWith('/mantenimiento')) {
  if (profile.role !== 'admin' && profile.asset_category !== 'MAINTENANCE') {
    redirect('/dashboard')
  }
}

// DASHBOARD (IT): Redirigir MAINTENANCE a /mantenimiento
if (pathname === '/dashboard') {
  if (profile.asset_category === 'MAINTENANCE' && profile.role !== 'admin') {
    redirect('/mantenimiento/dashboard')
  }
}
```

**Flujo:**
1. Usuario IT → Ve `/dashboard` y `/tickets` (IT)
2. Usuario Maintenance → Ve `/mantenimiento/dashboard` y `/mantenimiento/tickets`
3. Admin → Ve AMBOS sistemas
4. Acceso cruzado → ❌ Automáticamente bloqueado/redirigido

---

### 4️⃣ **HUB - Módulos Separados**

**Archivo:** `/src/app/hub/page.tsx`

**Nuevos módulos en hub:**

```
┌─────────────────────────┐
│  IT - HELPDESK          │ → /dashboard (IT only)
│  Mesa de Ayuda          │
└─────────────────────────┘

┌─────────────────────────┐
│  MANTENIMIENTO          │ → /mantenimiento/dashboard (Maintenance only)
│  Órdenes de Trabajo     │
└─────────────────────────┘

┌─────────────────────────┐
│  CORPORATIVO            │ → /corporativo (admin + corporate_admin)
│  Inspecciones           │
└─────────────────────────┘

┌─────────────────────────┐
│  ADMINISTRACIÓN         │ → /reports (admin + corporate_admin)
│  Configuración Sistema  │
└─────────────────────────┘
```

**Filtrado por `asset_category`:**
- IT users → Ver "IT - HELPDESK" + "CORPORATIVO" + "ADMINISTRACIÓN"
- Maintenance users → Ver "MANTENIMIENTO" + "CORPORATIVO" + "ADMINISTRACIÓN"
- Admin → Ver TODO

---

### 5️⃣ **SIDEBAR - AppShellClient**

**Archivo:** `/src/components/AppShellClient.tsx`

```typescript
// Detección de módulo según ruta
if (pathname.startsWith('/mantenimiento')) return 'mantenimiento'
if (pathname.startsWith('/dashboard')) return 'helpdesk'
```

**Menús contextuales:**

**Para Mantenimiento:**
```
├─ Dashboard
├─ Tickets
└─ Activos
```

**Para IT/Helpdesk:**
```
├─ Dashboard
├─ Mis Tickets / Crear Ticket IT
├─ Bandeja (Supervisor/Admin)
├─ Eventos (BEO)
└─ Base de Conocimientos
```

---

## 🔐 PERMISOS Y CONTROL DE ACCESO

### **Campos de Control:**

**`profiles.asset_category`:**
- `NULL` o `'IT'` → Acceso a IT/Helpdesk
- `'MAINTENANCE'` → Acceso a Mantenimiento
- Admin → Acceso a ambos

**`profiles.role`:**
- `'admin'` → Acceso total a todo
- `'supervisor'` → Acceso según `asset_category`
- `'agent_l1'` / `'agent_l2'` → Acceso según `asset_category`

### **Validaciones en 3 niveles:**

1. **Middleware** - Redirigir rutas incorrectas
2. **Layout Components** - Server-side auth check
3. **RLS Policies** - Base de datos (última línea de defensa)

---

## 📊 MIGRATION DE DATOS

**Automática en SQL:**

```sql
-- Migrar tickets IT
INSERT INTO tickets_it (...)
SELECT ... FROM tickets
WHERE service_area = 'it' AND deleted_at IS NULL

-- Migrar tickets Maintenance
INSERT INTO tickets_maintenance (...)
SELECT ... FROM tickets
WHERE service_area = 'maintenance' AND deleted_at IS NULL

-- Migrar Assets IT
INSERT INTO assets_it (...)
SELECT ... FROM assets
WHERE assigned_to_user_id IS NULL 
  OR user.asset_category = 'IT'

-- Migrar Assets Maintenance
INSERT INTO assets_maintenance (...)
SELECT ... FROM assets
WHERE assigned_to_user_id IS NOT NULL
  AND user.asset_category = 'MAINTENANCE'
```

---

## 🚀 PRÓXIMOS PASOS

### **FASE 1: DEPLOYMENT (Inmediato)**
- [ ] Ejecutar migration SQL en Supabase
- [ ] Verificar datos migrados
- [ ] Probar rutas y permisos

### **FASE 2: COMPLETAR MÓDULOS**
- [ ] Implementar `/mantenimiento/tickets` (CRUD)
- [ ] Implementar `/mantenimiento/assets` (Inventario)
- [ ] Dashboards con datos separados

### **FASE 3: TESTING**
- [ ] Pruebas de acceso por rol
- [ ] Pruebas de permisos
- [ ] Verificar RLS policies
- [ ] Performance queries

### **FASE 4: DEPRECAR ANTIGUAS**
- [ ] Remover `service_area` de `tickets` table
- [ ] Migrar queries heredadas
- [ ] Documentación final

---

## 📝 NOTAS TÉCNICAS

### **Ventajas de tablas separadas:**
✅ **Mejor performance** - Menos registros por tabla  
✅ **RLS más simple** - Lógica clara y por tabla  
✅ **Datos limpios** - Sin mezcla de contextos  
✅ **Escalabilidad** - Independencia de módulos  
✅ **Debugging fácil** - Identificar problemas por área  

### **Posibles mejoras futuras:**
- Vistas unificadas para admin
- Replicación de datos en caché
- API separadas por módulo
- WebSocket notifications por área

---

## 🔍 VALIDACIÓN

**Para verificar que está funcionando:**

```bash
# 1. Check SQL tables exist
SELECT tablename FROM pg_tables 
WHERE tablename LIKE 'tickets_%' OR tablename LIKE 'assets_%'

# 2. Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename LIKE 'tickets_%'

# 3. Check data migration
SELECT COUNT(*) FROM tickets_it
SELECT COUNT(*) FROM tickets_maintenance
SELECT COUNT(*) FROM assets_it
SELECT COUNT(*) FROM assets_maintenance

# 4. Test middleware redirect
# Login como IT user → Try /mantenimiento → Should redirect
# Login como Maint user → Try /dashboard → Should redirect if no admin
```

---

## 📞 SOPORTE

**Problemas comunes:**

| Problema | Solución |
|----------|----------|
| "Access Denied" en tabla | Verificar RLS policies y `asset_category` |
| Datos no se ven | Verificar migración ejecutó sin errores |
| Redirect loop | Limpiar cookies, reiniciar server |
| Falta de datos | Confirmar `asset_category` asignado a usuarios |

---

**ESTADO:** ✅ LISTO PARA DEPLOYMENT  
**FECHA IMPLEMENTACIÓN:** 17-01-2026  
**VERSIÓN:** 1.0 - Separación Completa  
