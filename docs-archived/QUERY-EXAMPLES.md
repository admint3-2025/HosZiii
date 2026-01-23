# 🔧 QUERY EXAMPLES - IT vs MANTENIMIENTO

## **TICKETS QUERIES**

### **Obtener tickets abiertos**

```typescript
// IT - Helpdesk
const { data: itTickets } = await supabase
  .from('tickets_it')
  .select('*, profiles:requester_id(full_name)')
  .in('status', ['NEW', 'ASSIGNED', 'IN_PROGRESS'])
  .order('created_at', { ascending: false })

// Mantenimiento
const { data: maintTickets } = await supabase
  .from('tickets_maintenance')
  .select('*, profiles:requester_id(full_name)')
  .in('status', ['NEW', 'ASSIGNED', 'IN_PROGRESS'])
  .order('created_at', { ascending: false })
```

### **Tickets por ubicación (con filtro)**

```typescript
// IT - Helpdesk
const { data } = await supabase
  .from('tickets_it')
  .select('id, ticket_number, title, status')
  .in('location_id', locationIds) // locationIds array
  .eq('status', 'OPEN')

// Mantenimiento
const { data } = await supabase
  .from('tickets_maintenance')
  .select('id, ticket_number, title, status')
  .in('location_id', locationIds)
  .eq('status', 'OPEN')
```

### **Tickets asignados a un agente**

```typescript
// IT
const { data } = await supabase
  .from('tickets_it')
  .select('*')
  .eq('assigned_agent_id', agentId)
  .neq('status', 'CLOSED')

// Mantenimiento
const { data } = await supabase
  .from('tickets_maintenance')
  .select('*')
  .eq('assigned_agent_id', agentId)
  .neq('status', 'CLOSED')
```

### **Dashboard KPIs - Contar por estado**

```typescript
// IT - Count abiertos
const { count: itOpen } = await supabase
  .from('tickets_it')
  .select('id', { count: 'exact', head: true })
  .in('status', ['NEW', 'ASSIGNED', 'IN_PROGRESS'])

// Mantenimiento - Count abiertos
const { count: maintOpen } = await supabase
  .from('tickets_maintenance')
  .select('id', { count: 'exact', head: true })
  .in('status', ['NEW', 'ASSIGNED', 'IN_PROGRESS'])

// Admin - Ambos
const [itCounts, maintCounts] = await Promise.all([
  supabase.from('tickets_it').select('id', { count: 'exact', head: true }),
  supabase.from('tickets_maintenance').select('id', { count: 'exact', head: true })
])
```

### **Buscar tickets por número o título**

```typescript
// IT
const { data } = await supabase
  .from('tickets_it')
  .select('*')
  .or(`ticket_number.ilike.%${searchTerm}%, title.ilike.%${searchTerm}%`)

// Mantenimiento
const { data } = await supabase
  .from('tickets_maintenance')
  .select('*')
  .or(`ticket_number.ilike.%${searchTerm}%, title.ilike.%${searchTerm}%`)
```

### **Tendencia últimos 7 días**

```typescript
const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

// IT
const { data: itTrend } = await supabase
  .from('tickets_it')
  .select('created_at')
  .gte('created_at', last7Days.toISOString())

// Mantenimiento
const { data: maintTrend } = await supabase
  .from('tickets_maintenance')
  .select('created_at')
  .gte('created_at', last7Days.toISOString())

// Agrupar por día
const grouped = (data || []).reduce((acc, t) => {
  const day = new Date(t.created_at).toLocaleDateString()
  acc[day] = (acc[day] || 0) + 1
  return acc
}, {})
```

---

## **ASSETS QUERIES**

### **Obtener todos los activos**

```typescript
// IT
const { data: itAssets } = await supabase
  .from('assets_it')
  .select('*, locations(name), profiles:assigned_to_user_id(full_name)')
  .eq('status', 'ACTIVE')
  .order('name')

// Mantenimiento
const { data: maintAssets } = await supabase
  .from('assets_maintenance')
  .select('*, locations(name), profiles:assigned_to_user_id(full_name)')
  .eq('status', 'ACTIVE')
  .order('name')
```

### **Assets por categoría**

```typescript
// IT
const { data } = await supabase
  .from('assets_it')
  .select('*')
  .eq('category', 'LAPTOP')
  .order('name')

// Mantenimiento
const { data } = await supabase
  .from('assets_maintenance')
  .select('*')
  .eq('category', 'HVAC')
  .order('name')
```

### **Assets en una ubicación**

```typescript
// IT
const { data } = await supabase
  .from('assets_it')
  .select('*')
  .eq('location_id', locationId)
  .order('name')

// Mantenimiento
const { data } = await supabase
  .from('assets_maintenance')
  .select('*')
  .eq('location_id', locationId)
  .order('name')
```

### **Buscar por código de activo**

```typescript
// IT
const { data } = await supabase
  .from('assets_it')
  .select('*')
  .ilike('asset_code', `%${searchCode}%`)

// Mantenimiento
const { data } = await supabase
  .from('assets_maintenance')
  .select('*')
  .ilike('asset_code', `%${searchCode}%`)
```

### **Activos vencidos o por vencer**

```typescript
const today = new Date()
const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

// IT
const { data } = await supabase
  .from('assets_it')
  .select('*')
  .lte('warranty_expiry', nextMonth.toISOString())
  .gt('warranty_expiry', today.toISOString())
  .order('warranty_expiry')

// Mantenimiento
const { data } = await supabase
  .from('assets_maintenance')
  .select('*')
  .lte('warranty_expiry', nextMonth.toISOString())
  .gt('warranty_expiry', today.toISOString())
  .order('warranty_expiry')
```

### **Contar activos por categoría**

```typescript
// IT
const { data } = await supabase
  .from('assets_it')
  .select('category')

const countByCategory = (data || []).reduce((acc, a) => {
  acc[a.category] = (acc[a.category] || 0) + 1
  return acc
}, {})

// Mantenimiento - Igual
const { data: maintData } = await supabase
  .from('assets_maintenance')
  .select('category')

const maintCountByCategory = (maintData || []).reduce((acc, a) => {
  acc[a.category] = (acc[a.category] || 0) + 1
  return acc
}, {})
```

---

## **COMMENTS Y ATTACHMENTS**

### **Obtener comentarios de un ticket**

```typescript
// IT
const { data: comments } = await supabase
  .from('ticket_comments_it')
  .select('*, profiles:created_by(full_name)')
  .eq('ticket_id', ticketId)
  .is('deleted_at', null)
  .order('created_at')

// Mantenimiento
const { data: comments } = await supabase
  .from('ticket_comments_maintenance')
  .select('*, profiles:created_by(full_name)')
  .eq('ticket_id', ticketId)
  .is('deleted_at', null)
  .order('created_at')
```

### **Agregar comentario**

```typescript
// IT
const { data, error } = await supabase
  .from('ticket_comments_it')
  .insert({
    ticket_id: ticketId,
    comment_text: 'Mi comentario',
    created_by: userId
  })

// Mantenimiento
const { data, error } = await supabase
  .from('ticket_comments_maintenance')
  .insert({
    ticket_id: ticketId,
    comment_text: 'Mi comentario',
    created_by: userId
  })
```

### **Obtener attachments de un ticket**

```typescript
// IT
const { data: attachments } = await supabase
  .from('ticket_attachments_it')
  .select('*')
  .eq('ticket_id', ticketId)
  .order('created_at')

// Mantenimiento
const { data: attachments } = await supabase
  .from('ticket_attachments_maintenance')
  .select('*')
  .eq('ticket_id', ticketId)
  .order('created_at')
```

### **Agregar attachment**

```typescript
// IT
const { data, error } = await supabase
  .from('ticket_attachments_it')
  .insert({
    ticket_id: ticketId,
    file_path: 'storage/path/to/file.pdf',
    file_name: 'document.pdf',
    file_size: 102400,
    mime_type: 'application/pdf',
    uploaded_by: userId
  })

// Mantenimiento - Igual
const { data, error } = await supabase
  .from('ticket_attachments_maintenance')
  .insert({
    ticket_id: ticketId,
    file_path: 'storage/path/to/file.pdf',
    file_name: 'document.pdf',
    file_size: 102400,
    mime_type: 'application/pdf',
    uploaded_by: userId
  })
```

---

## **OPERACIONES CRUD**

### **Crear ticket**

```typescript
// IT
const { data, error } = await supabase
  .from('tickets_it')
  .insert({
    ticket_number: 'IT-001234',
    title: 'Laptop no enciende',
    description: 'Dell Latitude no enciende',
    status: 'NEW',
    priority: 'HIGH',
    requester_id: userId,
    location_id: locationId
  })

// Mantenimiento
const { data, error } = await supabase
  .from('tickets_maintenance')
  .insert({
    ticket_number: 'MNT-005678',
    title: 'Reparación HVAC piso 3',
    description: 'AC no funciona',
    status: 'NEW',
    priority: 'CRITICAL',
    requester_id: userId,
    location_id: locationId
  })
```

### **Actualizar ticket**

```typescript
// IT
const { data, error } = await supabase
  .from('tickets_it')
  .update({
    status: 'IN_PROGRESS',
    assigned_agent_id: agentId,
    updated_at: new Date().toISOString(),
    updated_by: userId
  })
  .eq('id', ticketId)

// Mantenimiento - Igual
const { data, error } = await supabase
  .from('tickets_maintenance')
  .update({
    status: 'RESOLVED',
    resolution_notes: 'Problema solucionado',
    resolution_date: new Date().toISOString()
  })
  .eq('id', ticketId)
```

### **Marcar como eliminado (soft delete)**

```typescript
// IT
const { error } = await supabase
  .from('tickets_it')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', ticketId)

// Mantenimiento - Igual
const { error } = await supabase
  .from('tickets_maintenance')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', ticketId)
```

### **Crear activo**

```typescript
// IT
const { data, error } = await supabase
  .from('assets_it')
  .insert({
    asset_code: 'IT-LAPTOP-00123',
    name: 'Dell Latitude 5440',
    category: 'LAPTOP',
    brand: 'Dell',
    model: 'Latitude 5440',
    serial_number: 'ABC123XYZ',
    status: 'ACTIVE',
    location_id: locationId,
    assigned_to_user_id: userId,
    purchase_date: '2024-01-15',
    cost: 1200.00
  })

// Mantenimiento
const { data, error } = await supabase
  .from('assets_maintenance')
  .insert({
    asset_code: 'MNT-HVAC-00456',
    name: 'Unidad HVAC Piso 3',
    category: 'HVAC',
    status: 'ACTIVE',
    location_id: locationId,
    purchase_date: '2022-06-01',
    warranty_expiry: '2027-06-01',
    cost: 25000.00
  })
```

---

## **AGREGACIONES Y ANALYTICS**

### **Tickets cerrados vs abiertos (últimos 30 días)**

```typescript
const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

// IT
const { data: itData } = await supabase
  .from('tickets_it')
  .select('status, created_at')
  .gte('created_at', last30Days.toISOString())

const itStats = {
  total: itData?.length || 0,
  closed: itData?.filter(t => t.status === 'CLOSED').length || 0,
  open: itData?.filter(t => ['NEW', 'ASSIGNED', 'IN_PROGRESS'].includes(t.status)).length || 0
}

// Mantenimiento - Igual
const { data: maintData } = await supabase
  .from('tickets_maintenance')
  .select('status, created_at')
  .gte('created_at', last30Days.toISOString())

const maintStats = {
  total: maintData?.length || 0,
  closed: maintData?.filter(t => t.status === 'CLOSED').length || 0,
  open: maintData?.filter(t => ['NEW', 'ASSIGNED', 'IN_PROGRESS'].includes(t.status)).length || 0
}
```

### **Tickets por prioridad**

```typescript
// IT
const { data } = await supabase
  .from('tickets_it')
  .select('priority')
  .neq('status', 'CLOSED')

const byPriority = (data || []).reduce((acc, t) => {
  acc[t.priority] = (acc[t.priority] || 0) + 1
  return acc
}, {})

// Resultado: { HIGH: 5, CRITICAL: 2, MEDIUM: 8, LOW: 1 }
```

### **Tiempo promedio de resolución**

```typescript
// IT
const { data } = await supabase
  .from('tickets_it')
  .select('created_at, resolution_date')
  .eq('status', 'CLOSED')
  .not('resolution_date', 'is', null)

const avgResolutionTime = data?.reduce((acc, t) => {
  const created = new Date(t.created_at)
  const resolved = new Date(t.resolution_date)
  const hours = (resolved - created) / (1000 * 60 * 60)
  return acc + hours
}, 0) / data.length

// Resultado en horas
```

---

## **PERFORMANCE TIPS**

```typescript
// ✅ BUENO - Con índices, rápido
const { data } = await supabase
  .from('tickets_it')
  .select('id, ticket_number')
  .eq('status', 'NEW')
  .order('created_at', { ascending: false })
  .limit(100)

// ❌ LENTO - Sin índices, lento
const { data } = await supabase
  .from('tickets_it')
  .select('*') // Trae TODO
  .not('notes', 'is', null) // Sin índice

// ✅ MEJOR - Con paginación
const page = 1
const pageSize = 20
const start = (page - 1) * pageSize
const { data } = await supabase
  .from('tickets_it')
  .select('*')
  .range(start, start + pageSize - 1)
```

---

**TIPS:**
- Siempre usa `is('deleted_at', null)` para soft deletes
- Trae solo columnas que necesitas (no `select('*')` si evitable)
- Usa `limit()` en queries grandes
- Filtra antes de hacer joins
- Índices: Aprovechar status, created_at, location_id
