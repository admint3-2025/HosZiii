# Filtrado por Ubicación en Gestión de Tickets

## Descripción

Este módulo implementa el control de acceso por ubicación en la creación y asignación de tickets, garantizando que los usuarios solo interactúen con personas de su misma sede.

## 🎯 Objetivo

Garantizar la **segregación completa de datos por sede** en todas las operaciones de tickets:
- Al crear un ticket para otro usuario
- Al asignar un ticket a un agente
- Al escalar un ticket a nivel 2

## 🔐 Reglas de Acceso

### Por Rol

| Rol | Usuarios Visibles | Agentes Visibles |
|-----|------------------|------------------|
| **Admin** | 🌍 Todos de todas las sedes | 🌍 Todos los agentes |
| **Supervisor** | 📍 Solo de su sede | 📍 Solo agentes de su sede |
| **Técnico L1** | 📍 Solo de su sede | 📍 Solo agentes de su sede |
| **Técnico L2** | 📍 Solo de su sede | 📍 Solo agentes de su sede |
| **Usuario** | ❌ No puede crear para otros | N/A |

## 📡 Endpoints Creados

### 1. `/api/tickets/requesters`

**Propósito:** Obtener lista de usuarios para crear tickets en su nombre.

**Método:** GET

**Autenticación:** Requerida

**Permisos:** Solo agentes, supervisores y admin

**Respuesta:**
```json
{
  "users": [
    {
      "id": "uuid",
      "full_name": "Juan Pérez",
      "email": "juan@empresa.com",
      "role": "requester",
      "location_id": "uuid",
      "location_name": "Monterrey",
      "location_code": "MTY"
    }
  ]
}
```

**Filtrado:**
- ✅ Admin ve todos los usuarios de todas las sedes
- ✅ No-admin ve solo usuarios de su propia sede
- ✅ Ordenados alfabéticamente por nombre

---

### 2. `/api/tickets/agents`

**Propósito:** Obtener lista de agentes para asignar/escalar tickets.

**Método:** GET

**Parámetros:**
- `level` (opcional): 
  - `all` (default) - Agentes L1, L2, supervisores y admin
  - `l2` - Solo agentes L2, supervisores y admin (para escalamiento)

**Autenticación:** Requerida

**Respuesta:**
```json
{
  "agents": [
    {
      "id": "uuid",
      "full_name": "María González",
      "email": "maria@empresa.com",
      "role": "agent_l2"
    }
  ]
}
```

**Filtrado:**
- ✅ Admin ve todos los agentes de todas las sedes
- ✅ No-admin ve solo agentes de su propia sede
- ✅ Roles filtrados según parámetro `level`

**Ejemplos de Uso:**
```javascript
// Obtener todos los agentes (para asignación normal)
fetch('/api/tickets/agents?level=all')

// Obtener solo agentes L2 (para escalamiento)
fetch('/api/tickets/agents?level=l2')
```

## 🔧 Implementación

### Flujo de Creación de Ticket

1. **Usuario accede a `/tickets/new`**
2. **Sistema verifica rol del usuario**
   - Si es agente/supervisor/admin → Muestra dropdown de usuarios
   - Si es requester → Solo puede crear para sí mismo
3. **Carga de usuarios:**
   ```typescript
   const response = await fetch('/api/tickets/requesters')
   const data = await response.json()
   // data.users contiene solo usuarios de la misma sede
   ```
4. **Usuario selecciona requester del dropdown**
5. **Trigger automático asigna ubicación:**
   - Toma `location_id` del requester seleccionado
   - Lo asigna automáticamente al ticket

### Flujo de Asignación de Ticket

1. **Agente accede a página de ticket `/tickets/[id]`**
2. **Sistema carga agentes disponibles:**
   ```typescript
   // Para asignación normal
   const response = await fetch('/api/tickets/agents?level=all')
   
   // Para escalamiento L2
   const responseL2 = await fetch('/api/tickets/agents?level=l2')
   ```
3. **Solo se muestran agentes de la misma sede del ticket**
4. **Agente selecciona y asigna**

## 🛡️ Seguridad

### A Nivel de API

```typescript
// Verificar permisos
const { data: profile } = await supabase
  .from('profiles')
  .select('role, location_id')
  .eq('id', user.id)
  .single()

// Obtener filtro de ubicación
const locationFilter = await getLocationFilter()
// Returns null si es admin, location_id si no lo es

// Aplicar filtro a query
if (locationFilter) {
  query = query.eq('location_id', locationFilter)
}
```

### A Nivel de Base de Datos

El trigger `set_ticket_location()` garantiza que el `location_id` se asigne automáticamente:

```sql
CREATE OR REPLACE FUNCTION set_ticket_location()
RETURNS TRIGGER AS $$
DECLARE
  v_location_id uuid;
BEGIN
  SELECT location_id INTO v_location_id
  FROM profiles
  WHERE id = NEW.requester_id;
  
  IF v_location_id IS NOT NULL THEN
    NEW.location_id = v_location_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 📊 Casos de Uso

### Caso 1: Supervisor en Monterrey crea ticket

**Escenario:**
- Supervisor con `location_id` = MTY
- Quiere crear ticket para un usuario

**Comportamiento:**
1. Accede a `/tickets/new`
2. Dropdown "Solicitante" muestra SOLO usuarios de Monterrey
3. No ve usuarios de CDMX ni GDL
4. Selecciona usuario de MTY
5. Ticket se crea con `location_id` = MTY automáticamente

---

### Caso 2: Técnico L1 asigna ticket

**Escenario:**
- Técnico L1 en CDMX
- Tiene ticket sin asignar de CDMX

**Comportamiento:**
1. Accede a `/tickets/[id]`
2. Dropdown "Asignar a" muestra SOLO agentes de CDMX
3. No ve agentes de MTY ni GDL
4. Selecciona agente L1/L2 de CDMX
5. Ticket se asigna

---

### Caso 3: Admin crea ticket inter-sedes (no recomendado)

**Escenario:**
- Admin sin ubicación asignada
- Quiere crear ticket para usuario de GDL

**Comportamiento:**
1. Accede a `/tickets/new`
2. Dropdown muestra TODOS los usuarios de TODAS las sedes
3. Selecciona usuario de GDL
4. Ticket se crea con `location_id` = GDL (del usuario)
5. Admin puede ver y gestionar el ticket
6. Agentes de GDL pueden verlo y gestionarlo
7. Agentes de MTY/CDMX NO pueden verlo

## ⚠️ Consideraciones

### Tickets huérfanos

Si un ticket tiene `location_id = NULL`:
- ❌ Supervisores y técnicos NO lo verán en sus listas
- ✅ Admin SÍ lo verá
- 🔧 Solución: Asignar ubicación manualmente o ejecutar script de migración

### Usuarios sin ubicación

Si un usuario no tiene `location_id`:
- ❌ No aparecerá en dropdowns de creación de tickets (excepto para admin)
- ❌ Sus tickets no tendrán ubicación asignada
- 🔧 Solución: Asignar ubicación en panel de usuarios

### Escalamiento entre sedes

**NO es posible** escalar un ticket de MTY a un agente de CDMX:
- El dropdown de escalamiento solo muestra agentes de la misma sede
- Esto es intencional para mantener segregación
- Si se requiere inter-sede, admin debe reasignar manualmente

## 🔄 Migración de Datos Existentes

Si ya tienes tickets sin ubicación:

```sql
-- Asignar ubicación del solicitante a tickets existentes
UPDATE tickets t
SET location_id = p.location_id
FROM profiles p
WHERE t.requester_id = p.id
  AND t.location_id IS NULL
  AND p.location_id IS NOT NULL;

-- Verificar tickets sin ubicación
SELECT 
  t.ticket_number,
  t.title,
  p.email as solicitante,
  p.location_id
FROM tickets t
JOIN profiles p ON t.requester_id = p.id
WHERE t.location_id IS NULL
  AND t.deleted_at IS NULL;
```

## 📋 Testing

### Checklist de Pruebas

**Como Supervisor de MTY:**
- [ ] Al crear ticket, solo veo usuarios de MTY
- [ ] Al asignar ticket de MTY, solo veo agentes de MTY
- [ ] NO veo tickets de CDMX/GDL en mi lista
- [ ] Dashboard muestra solo KPIs de MTY

**Como Admin:**
- [ ] Al crear ticket, veo usuarios de TODAS las sedes
- [ ] Al asignar ticket, veo agentes de TODAS las sedes
- [ ] Veo tickets de TODAS las sedes en mi lista
- [ ] Dashboard muestra KPIs consolidados de todas las sedes

**Como Usuario de GDL:**
- [ ] Solo puedo crear tickets para mí mismo
- [ ] NO veo dropdown de usuarios
- [ ] Mis tickets se crean automáticamente con location_id de GDL

## 🚀 Próximos Pasos

1. ✅ Ejecutar migración de ubicaciones en Supabase
2. ✅ Crear ubicaciones iniciales (MTY, CDMX, GDL)
3. ✅ Asignar ubicación a todos los usuarios existentes
4. ✅ Ejecutar script de migración de tickets
5. 🔄 Probar creación de tickets como supervisor
6. 🔄 Probar asignación de tickets
7. 🔄 Verificar que segregación funciona correctamente

## 📞 Soporte

Ver documentación completa en:
- [MULTISEDE-README.md](../MULTISEDE-README.md)
- [INSTRUCCIONES-SUPABASE.md](../INSTRUCCIONES-SUPABASE.md)
