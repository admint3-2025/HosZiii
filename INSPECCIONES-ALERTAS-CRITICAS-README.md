# Sistema de Alertas para Inspecciones RRHH - Ítems Críticos

## Resumen

Se implementó un sistema automático de alertas que detecta cuando una inspección de RRHH tiene ítems con calificaciones debajo del umbral crítico (< 8/10) y notifica inmediatamente a todos los administradores del sistema.

## Funcionalidad

### Umbral Crítico
- **Valor:** Calificación menor a **8.0/10**
- **Alcance:** Aplica a todos los ítems de todas las áreas de inspección

### Flujo de Operación

1. **Durante la edición:** No hay restricciones, el inspector puede calificar libremente
2. **Al completar:** Cuando se marca la inspección como "Completada" (`status = 'completed'`):
   - El sistema escanea automáticamente todos los ítems
   - Identifica los que tienen calificación < 8
   - Si existen ítems críticos, dispara las alertas

### Notificaciones Enviadas

#### 1. Correo Electrónico
- **Destinatarios:** Todos los usuarios con rol `admin` activos
- **Contenido:**
  - Datos de la inspección (sede, fecha, inspector, departamento)
  - Calificación promedio
  - Lista detallada de ítems críticos con:
    - Área a la que pertenece
    - Descripción del ítem
    - Calificación obtenida
    - Comentarios (si existen)
  - Botón directo a la inspección completa
  - Pasos recomendados para seguimiento

#### 2. Push Notification (In-App)
- **Destinatarios:** Todos los administradores
- **Tipo:** `inspection_critical`
- **Mensaje:** Indica cuántos ítems críticos se detectaron y el departamento
- **Link directo:** Redirección a la inspección específica

## Archivos Modificados/Creados

### 1. Template de Email
**Archivo:** `src/lib/email/templates.ts`
- Función: `criticalInspectionAlertTemplate()`
- Template HTML profesional con diseño responsive
- Incluye logo, secciones organizadas, y llamados a la acción

### 2. Función de Notificación
**Archivo:** `src/lib/email/inspection-notifications.ts` (NUEVO)
- Función: `notifyCriticalInspectionItems()`
- Lógica:
  1. Obtiene áreas e ítems de la inspección
  2. Filtra ítems con `calif_valor < 8`
  3. Si no hay críticos, termina sin enviar
  4. Consulta todos los admins activos
  5. Envía correos a cada admin
  6. Crea notificaciones push en la tabla `notifications`

### 3. Integración en Servicio
**Archivo:** `src/lib/services/inspections-rrhh.service.ts`
- Función modificada: `updateInspectionStatus()`
- Al detectar `status = 'completed'`:
  - Consulta datos de la inspección
  - Dispara `notifyCriticalInspectionItems()` de forma asíncrona (no bloquea)
  - Si hay error en la notificación, se registra pero no afecta el guardado

## Estructura de Datos

### Tabla: `notifications`
Se insertan registros con:
```typescript
{
  user_id: string,          // ID del admin
  type: 'inspection_critical',
  title: '🚨 Inspección crítica en [CODE]',
  message: 'Se detectaron X ítems críticos...',
  link: '/inspections/rrhh/[ID]',
  is_read: false
}
```

## Configuración

### Umbral Ajustable
El umbral crítico está definido como constante en:
```typescript
// src/lib/email/inspection-notifications.ts
const CRITICAL_THRESHOLD = 8
```

Para cambiar el umbral, modificar este valor y recompilar.

## Comportamiento Esperado

### Escenario 1: Inspección sin ítems críticos
- Se completa la inspección
- Sistema verifica ítems
- **No se envía ninguna notificación** ✅
- Confirmación en logs

### Escenario 2: Inspección con ítems críticos
- Se completa la inspección
- Sistema detecta N ítems con calif < 8
- **Se envían:**
  - Correos a todos los admins
  - Push notifications in-app
- Logs detallados del proceso

### Escenario 3: Error en notificaciones
- El guardado de la inspección se completa normalmente
- Error se registra en logs del servidor
- No afecta la experiencia del usuario
- Administradores pueden revisar logs

## Logs y Debugging

Todos los eventos se registran con prefijo `[notifyCriticalInspectionItems]`:
```
✓ Se encontraron X ítems críticos
✓ Enviando notificaciones a Y administradores
✓ Correos enviados exitosamente
✓ Z notificaciones push creadas
✓ Proceso completado exitosamente
```

En caso de error:
```
✗ Error obteniendo áreas/ítems/admins
✗ Error enviando email a [email]
✗ Error creando notificaciones push
```

## Próximos Pasos Sugeridos

1. **Dashboard de Seguimiento:** Panel para visualizar inspecciones críticas pendientes de atención
2. **Recordatorios:** Envío de recordatorios si no hay respuesta en X días
3. **Planes de Acción:** Sistema para documentar y dar seguimiento a planes correctivos
4. **Reinspecciones:** Programación automática de reinspecciones para validar mejoras
5. **Reportes:** Exportación de inspecciones críticas por periodo/sede/departamento

## Pruebas Recomendadas

1. Crear inspección RRHH con todos los ítems >= 8 → No debe enviar alertas
2. Crear inspección con al menos 1 ítem < 8 → Debe enviar alertas
3. Verificar que el correo llegue con formato correcto
4. Verificar que las notificaciones aparezcan en la bandeja del admin
5. Confirmar que el link en el email/notificación redirija correctamente

## Notas Técnicas

- Las notificaciones se disparan de forma **asíncrona** para no bloquear la respuesta al usuario
- Se usa **dynamic import** para evitar problemas de contexto servidor/cliente
- El template HTML es **responsive** y se visualiza correctamente en todos los clientes de email
- Los errores en el envío de notificaciones **no afectan** el flujo principal de guardado
