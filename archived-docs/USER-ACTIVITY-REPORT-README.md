# Reporte de Actividad por Usuario 👥

## Resumen

Nuevo reporte completo de análisis de actividad de usuarios en el sistema de helpdesk, mostrando métricas detalladas de tickets creados, asignados, resueltos y comentarios por cada usuario.

## 📊 Métricas Incluidas

### Métricas Globales
- **Total de tickets creados** por todos los usuarios
- **Total de tickets asignados** a agentes
- **Total de tickets resueltos** por el equipo
- **Total de comentarios** agregados

### Métricas por Usuario
1. **Tickets Creados**: Tickets abiertos por el usuario (requesters)
2. **Tickets Asignados**: Tickets asignados al usuario (agentes)
3. **Tickets Resueltos**: Tickets cerrados/resueltos por el usuario
4. **Tickets Cerrados**: Total de tickets finalizados
5. **Comentarios**: Número de comentarios agregados
6. **Acciones**: Eventos de auditoría (cambios de estado, actualizaciones)
7. **Tiempo Promedio**: Tiempo medio de resolución (solo agentes)

## 🏆 Rankings

### Top 5 Categorías

1. **Top Creadores**
   - Usuarios que han creado más tickets
   - Útil para identificar usuarios con más problemas o requerimientos
   - Incluye nombre, departamento y count de tickets

2. **Top Resolvedores**
   - Agentes que han resuelto más tickets
   - Filtrado automático (excluye requesters)
   - Muestra rol y total de resoluciones

3. **Más Activos**
   - Usuarios con más acciones en el sistema
   - Incluye comentarios y cambios realizados
   - Indicador de participación activa

## 📋 Análisis por Rol

Estadísticas agregadas por tipo de usuario:
- **Administrador**: Gestión completa del sistema
- **Supervisor**: Supervisión y escalamiento
- **Agente N1**: Primera línea de soporte
- **Agente N2**: Segundo nivel de soporte
- **Solicitante**: Usuarios finales

Para cada rol se muestra:
- Número de usuarios
- Tickets creados
- Tickets resueltos
- Comentarios agregados

## 🔍 Tabla Detallada

Tabla completa con todos los usuarios ordenada por actividad total, mostrando:

| Campo | Descripción |
|-------|-------------|
| **Usuario** | Nombre completo y email |
| **Rol** | Badge con rol del usuario |
| **Departamento** | Departamento asignado |
| **Creados** | Tickets creados (azul) |
| **Asignados** | Tickets asignados (índigo) |
| **Resueltos** | Tickets resueltos (verde) |
| **Cerrados** | Tickets cerrados (gris) |
| **Comentarios** | Comentarios agregados (morado) |
| **Acciones** | Eventos de auditoría (naranja) |
| **Tiempo Prom.** | Tiempo medio de resolución en horas |

### Características de la Tabla
- ✅ **Auto-ordenada** por actividad total
- ✅ **Filtrado automático** de usuarios sin actividad
- ✅ **Color-coded** para fácil identificación
- ✅ **Hover effects** para mejor UX
- ✅ **Responsive** en todos los dispositivos

## 🎯 Casos de Uso

### Para Administradores
- Identificar agentes más productivos
- Detectar usuarios con alto volumen de tickets
- Evaluar distribución de carga de trabajo
- Análisis de desempeño por departamento

### Para Supervisores
- Monitorear performance de su equipo
- Identificar necesidades de capacitación
- Evaluar tiempos de respuesta
- Detectar cuellos de botella

### Para Análisis de Negocio
- Métricas de productividad
- Análisis de tendencias por rol
- Identificación de power users
- ROI del sistema de soporte

## 🚀 Acceso al Reporte

### Ruta
```
/reports/user-activity
```

### Permisos
- ⚠️ **Solo Admin y Supervisor**
- Requiere autenticación
- Redirect automático si no tiene permisos

### Navegación
1. Ir a **Reportes** en el menú principal
2. Click en tarjeta **"👥 Actividad por Usuario"**
3. Badge **"Nuevo"** indica funcionalidad reciente

## 💡 Insights Automáticos

El reporte calcula automáticamente:

### Actividad Total por Usuario
```typescript
totalActivity = tickets_created + tickets_resolved + actions_count
```

### Tiempo Promedio de Resolución
```typescript
avg_resolution_time = sum(resolution_times) / count(resolved_tickets)
```

Mostrado en **horas** para mejor legibilidad.

## 📈 Datos Técnicos

### Fuentes de Datos

1. **tickets**: Tickets creados y su estado
2. **ticket_comments**: Comentarios agregados
3. **audit_log**: Eventos de cambio y acciones
4. **profiles**: Info de usuarios

### Performance

- ✅ **Consultas optimizadas** con índices
- ✅ **Cálculos en memoria** para velocidad
- ✅ **Limit de 500 registros** (configurable)
- ✅ **Carga asíncrona** de datos

### Fallback

Si el RPC `get_user_activity_metrics` no existe (futuro), el reporte construye las métricas manualmente desde las tablas base.

## 🔄 Mejoras Futuras

### Próximas Funcionalidades
1. **Filtros por fecha**: Rango temporal personalizado
2. **Exportación a Excel**: Descarga de datos
3. **Gráficas visuales**: Charts con Chart.js/Recharts
4. **Comparativa temporal**: vs mes anterior
5. **Drill-down**: Ver tickets específicos por usuario
6. **Alertas**: Notificar baja productividad

### RPC Propuesto (SQL)

```sql
create or replace function get_user_activity_metrics()
returns table(
  user_id uuid,
  full_name text,
  email text,
  role text,
  department text,
  tickets_created bigint,
  tickets_assigned bigint,
  tickets_resolved bigint,
  tickets_closed bigint,
  comments_count bigint,
  actions_count bigint,
  avg_resolution_time_minutes numeric
) as $$
begin
  -- Implementación optimizada
  -- TODO: Crear función en Supabase
end;
$$ language plpgsql security definer;
```

## 🎨 Diseño UI

### Paleta de Colores
- **Creados**: Azul (`blue-600`)
- **Asignados**: Índigo (`indigo-600`)
- **Resueltos**: Verde (`green-600`)
- **Comentarios**: Morado (`purple-600`)
- **Acciones**: Naranja (`orange-600`)

### Badges y Tags
- **Nuevo**: Verde con shadow
- **Rol badges**: Índigo redondeado
- **Métricas**: Gradientes de color

## 📚 Referencias

- Diseño basado en reportes existentes
- Estilo consistente con [reports/all-tickets](../all-tickets/page.tsx)
- Paleta de colores alineada con sistema de diseño
- Tipografía: Inter (system default)

---

**Fecha de implementación:** 4 de enero de 2026  
**Versión:** 1.0.0  
**Estado:** ✅ Productivo  
**Requerimientos:** Admin o Supervisor
