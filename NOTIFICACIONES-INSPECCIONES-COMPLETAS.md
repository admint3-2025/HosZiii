# Notificaciones de Inspecciones Críticas - Implementación Completa

## Resumen

Sistema funcional que envía notificaciones automáticas por **correo electrónico** y **push in-app** a todos los administradores cuando se completa una inspección RRHH con ítems críticos (calificación < 8/10).

## ✅ Estado

**COMPLETADO Y LISTO PARA USAR**

## Características Implementadas

### 1. **Detección Automática de Ítems Críticos**
- Umbral configurable: calificación < 8.0/10
- Se evalúan todos los ítems de todas las áreas al completar inspección
- Sin ítems críticos = sin notificaciones (comportamiento silencioso)

### 2. **Notificaciones por Correo Electrónico**
- **Destinatarios:** Todos los administradores activos (roles `admin` y `corporate_admin`)
- **Template HTML profesional** con diseño responsive
- **Contenido:**
  - Datos de la inspección (sede, fecha, inspector, departamento)
  - Calificación promedio
  - Lista detallada de ítems críticos con:
    - Área
    - Descripción
    - Calificación
    - Comentarios
  - Botón directo a la inspección
  - Pasos recomendados de seguimiento

### 3. **Notificaciones Push In-App**
- Aparecen en tiempo real en la campana de notificaciones
- Icono distintivo: 🚨
- Mensaje claro con número de ítems críticos
- Link directo a la inspección
- Se marcan como no leídas por defecto

### 4. **Obtención Segura de Emails**
- Función RPC `get_admin_emails()` con privilegios `SECURITY DEFINER`
- Hace JOIN entre `profiles` y `auth.users` para obtener emails reales
- Solo administradores activos

## Archivos Modificados/Creados

### Backend

1. **`supabase/migration-inspections-notifications.sql`** (NUEVO)
   - Agrega tipo `inspection_critical` al enum `notification_type`
   - Crea función RPC `get_admin_emails()`

2. **`src/app/api/inspections/complete-and-notify/route.ts`** (MODIFICADO)
   - Usa RPC para obtener emails reales de administradores
   - Envía correos a cada admin
   - Crea notificaciones push con campo `link`

3. **`src/lib/email/templates.ts`** (YA EXISTÍA)
   - Template `criticalInspectionAlertTemplate()` ya implementado

### Frontend

4. **`src/components/NotificationBell.tsx`** (MODIFICADO)
   - Agrega caso para `inspection_critical` con icono 🚨

5. **`scripts/apply-inspections-notifications-migration.ps1`** (NUEVO)
   - Script PowerShell para facilitar aplicación de migración

### Documentación

6. **`NOTIFICACIONES-INSPECCIONES-COMPLETAS.md`** (ESTE ARCHIVO)

## Despliegue

### Paso 1: Aplicar Migración en Supabase

#### Opción A: Usando el script (PowerShell)

```powershell
cd scripts
.\apply-inspections-notifications-migration.ps1
```

El script te pedirá:
- Project Reference de Supabase
- Contraseña de la base de datos

#### Opción B: Manualmente en SQL Editor

1. Ve a: `https://supabase.com/dashboard/project/[TU_PROJECT_ID]/sql/new`
2. Copia el contenido de `supabase/migration-inspections-notifications.sql`
3. Pégalo y ejecuta

### Paso 2: Verificar Variables de Entorno

Asegúrate de tener configuradas las variables SMTP en `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-app
SMTP_FROM="ZIII Helpdesk <tu-email@gmail.com>"
SMTP_SECURE=false
```

### Paso 3: Reiniciar el Servidor

```bash
npm run dev
```

### Paso 4: Probar

1. Inicia sesión como inspector
2. Crea una nueva inspección RRHH
3. Completa al menos 1 ítem con calificación < 8
4. Guarda y **"Guardar y Completar"**
5. Verifica:
   - ✓ Los admins reciben correos
   - ✓ Los admins tienen notificaciones push en la campana 🔔
   - ✓ El link en la notificación funciona

## Flujo de Operación

```
1. Inspector completa inspección con ítems < 8/10
          ↓
2. Clic en "Guardar y Completar"
          ↓
3. Frontend llama a /api/inspections/complete-and-notify
          ↓
4. Endpoint actualiza status a 'completed'
          ↓
5. Obtiene todas las áreas e ítems
          ↓
6. Filtra ítems con calificación < 8
          ↓
7. Si hay críticos → llama RPC get_admin_emails()
          ↓
8. Genera template de email
          ↓
9. Envía correos a cada admin
          ↓
10. Crea notificaciones push en tabla notifications
          ↓
11. Retorna éxito al frontend
          ↓
12. Frontend muestra alerta con resumen
```

## Configuración

### Cambiar Umbral Crítico

Edita en `src/app/api/inspections/complete-and-notify/route.ts`:

```typescript
const CRITICAL_THRESHOLD = 8 // Cambiar a otro valor
```

## Consultas SQL Útiles

### Ver administradores con emails
```sql
select * from get_admin_emails();
```

### Ver notificaciones de inspección
```sql
select 
  n.created_at,
  p.full_name as admin_name,
  n.title,
  n.message,
  n.is_read,
  n.link
from notifications n
join profiles p on p.id = n.user_id
where n.type = 'inspection_critical'
order by n.created_at desc
limit 10;
```

### Verificar tipo de notificación existe
```sql
select enumlabel 
from pg_enum e
join pg_type t on e.enumtypid = t.oid
where t.typname = 'notification_type'
order by enumlabel;
```

## Troubleshooting

### ❌ Error: type "inspection_critical" does not exist

**Causa:** No se ejecutó la migración

**Solución:** Ejecuta `supabase/migration-inspections-notifications.sql`

### ❌ Correos no llegan

**Causa:** Variables SMTP mal configuradas

**Solución:** 
1. Verifica las variables en `.env.local`
2. Si usas Gmail, genera una "Contraseña de aplicación"
3. Verifica logs del servidor con `npm run dev`

### ❌ Notificaciones push no aparecen

**Causa:** Realtime no está habilitado para la tabla

**Solución:**
```sql
alter publication supabase_realtime add table notifications;
```

### ❌ RPC get_admin_emails() retorna vacío

**Causa:** No hay administradores activos o emails nulos

**Solución:**
```sql
-- Verificar admins activos
select id, full_name, role, is_active
from profiles
where role in ('admin', 'corporate_admin')
and is_active = true;

-- Verificar que tengan email en auth.users
select u.id, u.email, p.full_name
from auth.users u
join profiles p on p.id = u.id
where p.role in ('admin', 'corporate_admin')
and p.is_active = true;
```

## Monitoreo

### Logs del Servidor

Al completar una inspección con ítems críticos, deberías ver:

```
[complete-and-notify] 🟢 Procesando inspección: ...
[complete-and-notify] 📝 Actualizando status a completed...
[complete-and-notify] ✅ Status actualizado a completed
[complete-and-notify] 📊 Inspección obtenida, status: completed
[complete-and-notify] 📋 Áreas obtenidas: 10
[complete-and-notify] 📝 Items obtenidos: 40
[complete-and-notify] 🚨 Ítems críticos encontrados: 3
[complete-and-notify] 👥 Buscando administradores con emails...
[complete-and-notify] 👥 Administradores encontrados: 2
[complete-and-notify] 📧 Emails: admin1@empresa.com, admin2@empresa.com
[complete-and-notify] 📧 Enviando correos...
[complete-and-notify] ✅ Correos enviados
[complete-and-notify] 📬 Creando notificaciones push...
[complete-and-notify] ✅ 2 notificaciones push creadas
```

## Próximos Pasos Sugeridos

1. **Dashboard de Inspecciones Críticas**
   - Panel para visualizar todas las inspecciones críticas
   - Filtros por sede, fecha, nivel de criticidad
   - Marcado de seguimiento

2. **Recordatorios Automáticos**
   - Si no hay respuesta en X días, reenviar notificación
   - Escalamiento a niveles superiores

3. **Planes de Acción**
   - Sistema para documentar acciones correctivas
   - Seguimiento de implementación
   - Cierre de ítems críticos

4. **Reinspecciones Programadas**
   - Agendar automáticamente reinspección después de X días
   - Validar que se corrigieron los ítems críticos

5. **Reportes Analíticos**
   - Tendencia de ítems críticos por sede
   - Áreas con más problemas
   - Tiempo promedio de resolución

## Contacto y Soporte

- Documentación completa: `INSPECCIONES-ALERTAS-CRITICAS-README.md`
- Logs: Revisar consola del servidor Next.js
- Issues: Revisar logs de Supabase en Dashboard

---

**✅ Sistema implementado y listo para producción**

Fecha de implementación: Enero 2025
