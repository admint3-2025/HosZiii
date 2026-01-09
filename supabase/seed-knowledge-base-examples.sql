-- Artículos de ejemplo para la Base de Conocimientos
-- Ejecutar después de migration-add-knowledge-base.sql

-- Obtener el primer usuario admin para asignar como creador
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id FROM profiles WHERE role = 'admin' LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'No se encontró usuario admin. Los artículos se crearán sin created_by válido.';
    RETURN;
  END IF;

  -- ========================================
  -- INCIDENCIAS DE SOFTWARE
  -- ========================================

  -- 1. Windows no inicia - Error de arranque
  INSERT INTO knowledge_base_articles (
    title,
    summary,
    solution,
    category_level1,
    category_level2,
    category_level3,
    status,
    created_by,
    approved_by,
    approved_at,
    tags,
    keywords,
    helpful_count,
    views_count,
    times_used,
    relevance_score
  ) VALUES (
    'Windows no inicia - Pantalla azul al arrancar',
    'El equipo muestra pantalla azul BSOD al iniciar Windows, no permite acceder al escritorio y se reinicia continuamente.',
    E'**PROBLEMA:**
El sistema operativo Windows no puede iniciar correctamente, mostrando error de pantalla azul (BSOD) con códigos como INACCESSIBLE_BOOT_DEVICE o CRITICAL_PROCESS_DIED.

**CAUSA RAÍZ:**
Generalmente causado por:
- Actualizaciones de Windows interrumpidas o mal instaladas
- Archivos del sistema corruptos
- Drivers incompatibles recién instalados
- Problemas en el disco duro (sectores dañados)

**SOLUCIÓN PASO A PASO:**

1. **Acceder al Modo de Recuperación:**
   - Reiniciar el equipo 3 veces seguidas (apagado forzado con el botón)
   - Entrar automáticamente al menú de recuperación
   - Seleccionar "Solucionar problemas" → "Opciones avanzadas"

2. **Ejecutar Reparación de Inicio:**
   - En opciones avanzadas, seleccionar "Reparación de inicio"
   - Esperar que el proceso complete (5-15 minutos)
   - Reiniciar y verificar si el problema se resolvió

3. **Si el problema persiste - Restaurar sistema:**
   - Volver a opciones avanzadas
   - Seleccionar "Restaurar sistema"
   - Elegir un punto de restauración anterior a la fecha del problema
   - Aplicar y esperar que finalice

4. **Última opción - Reparar archivos del sistema:**
   - En opciones avanzadas, seleccionar "Símbolo del sistema"
   - Ejecutar comandos:
     ```
     chkdsk C: /f /r
     sfc /scannow
     dism /online /cleanup-image /restorehealth
     ```
   - Reiniciar el equipo

**TIEMPO ESTIMADO:** 30-45 minutos

**PREVENCIÓN:**
- Mantener Windows actualizado completamente
- Crear puntos de restauración antes de cambios importantes
- No interrumpir actualizaciones en proceso
- Realizar mantenimiento preventivo mensual',
    'Software',
    'Sistema Operativo',
    'Windows',
    'approved',
    admin_user_id,
    admin_user_id,
    NOW(),
    ARRAY['Windows', 'BSOD', 'arranque', 'pantalla azul', 'sistema operativo', 'recuperación'],
    'Windows no inicia pantalla azul BSOD error arranque boot recuperación reparación sistema',
    15,
    89,
    12,
    42.50
  );

  -- 2. Outlook no sincroniza correos
  INSERT INTO knowledge_base_articles (
    title,
    summary,
    solution,
    category_level1,
    category_level2,
    category_level3,
    status,
    created_by,
    approved_by,
    approved_at,
    tags,
    keywords,
    helpful_count,
    views_count,
    times_used,
    relevance_score
  ) VALUES (
    'Outlook no sincroniza - Correos no llegan o no se envían',
    'Microsoft Outlook no sincroniza correctamente, los correos nuevos no aparecen en la bandeja de entrada y/o no se pueden enviar mensajes.',
    E'**PROBLEMA:**
Outlook no sincroniza correctamente con el servidor de correo Exchange/Office 365. Los correos se quedan en la bandeja de salida o no se descargan correos nuevos.

**CAUSA RAÍZ:**
- Modo sin conexión activado accidentalmente
- Archivos OST/PST corruptos
- Problemas de conectividad con el servidor
- Caché de Outlook lleno o corrupto
- Credenciales expiradas

**SOLUCIÓN PASO A PASO:**

1. **Verificar modo de trabajo:**
   - Ir a pestaña "Enviar/Recibir" en Outlook
   - Verificar que NO esté seleccionado "Trabajar sin conexión"
   - Si está activado, hacer clic para desactivarlo

2. **Forzar sincronización manual:**
   - Presionar F9 o hacer clic en "Enviar y recibir todo"
   - Observar la barra de progreso en la parte inferior
   - Esperar 2-3 minutos para que complete

3. **Reparar perfil de Outlook (si persiste):**
   - Cerrar completamente Outlook
   - Abrir Panel de Control → Correo (Microsoft Outlook)
   - Clic en "Perfiles" → "Propiedades"
   - Seleccionar "Reparar" y seguir el asistente
   - Reiniciar Outlook

4. **Limpiar caché de Outlook:**
   - Cerrar Outlook completamente
   - Presionar Windows + R
   - Escribir: %localappdata%\\Microsoft\\Outlook
   - Buscar y eliminar archivos .ost antiguos (hacer backup primero)
   - Abrir Outlook (recreará el archivo automáticamente)

5. **Reconstruir búsqueda de Outlook:**
   - Archivo → Opciones → Búsqueda
   - Clic en "Opciones de indización"
   - Seleccionar Outlook → Avanzadas → Reconstruir

**VERIFICACIÓN:**
- Enviar un correo de prueba a sí mismo
- Esperar 1-2 minutos
- Verificar que llegue correctamente
- Revisar que bandeja de salida esté vacía

**TIEMPO ESTIMADO:** 15-25 minutos

**PREVENCIÓN:**
- No acumular más de 10,000 correos en bandeja de entrada
- Archivar correos antiguos periódicamente
- Vaciar elementos eliminados semanalmente
- Mantener Outlook actualizado',
    'Software',
    'Aplicaciones',
    'Office 365',
    'approved',
    admin_user_id,
    admin_user_id,
    NOW(),
    ARRAY['Outlook', 'correo', 'sincronización', 'email', 'Office 365', 'Exchange'],
    'Outlook no sincroniza correos email no llegan enviar Exchange Office 365 bandeja entrada salida',
    23,
    156,
    18,
    48.75
  );

  -- ========================================
  -- INCIDENCIAS DE HARDWARE
  -- ========================================

  -- 3. Laptop no enciende - Problemas de energía
  INSERT INTO knowledge_base_articles (
    title,
    summary,
    solution,
    category_level1,
    category_level2,
    category_level3,
    status,
    created_by,
    approved_by,
    approved_at,
    tags,
    keywords,
    helpful_count,
    views_count,
    times_used,
    relevance_score
  ) VALUES (
    'Laptop no enciende - LED parpadea o no responde',
    'La laptop no enciende al presionar el botón de encendido, puede tener LEDs parpadeando o estar completamente sin respuesta.',
    E'**PROBLEMA:**
La laptop no muestra señales de vida al presionar el botón de encendido, o los LEDs parpadean pero no arranca el sistema.

**CAUSA RAÍZ:**
- Carga estática acumulada en la placa madre
- Batería completamente descargada o dañada
- Adaptador de corriente defectuoso
- Conexión floja de batería/RAM/disco
- Falla en la placa madre (menos común)

**SOLUCIÓN PASO A PASO:**

1. **Descarga de energía estática (PRIMERA ACCIÓN):**
   - Desconectar el adaptador de corriente
   - Retirar la batería (si es extraíble)
   - Mantener presionado el botón de encendido por 30-45 segundos
   - Conectar solo el adaptador (sin batería)
   - Intentar encender

2. **Verificar adaptador de corriente:**
   - Revisar que el LED del adaptador esté encendido
   - Verificar que el cable no tenga daños visibles
   - Probar con otro adaptador compatible (mismo voltaje/amperaje)
   - Comprobar conexión en el puerto DC de la laptop

3. **Revisar conexiones internas (técnicos):**
   - Apagar y desconectar todo
   - Abrir panel inferior de la laptop (si es accesible)
   - Retirar y reinstalar módulos de RAM
   - Verificar conexión del disco duro/SSD
   - Limpiar contactos con aire comprimido

4. **Probar sin batería:**
   - Dejar batería desconectada
   - Conectar solo adaptador de corriente
   - Intentar encender
   - Si funciona → Batería defectuosa, solicitar reemplazo

5. **Prueba de POST (Power-On Self Test):**
   - Observar secuencia de LEDs al encender
   - Escuchar pitidos del BIOS (si los hay)
   - Consultar manual del fabricante para códigos de error

**DIAGNÓSTICO POR LEDs:**
- LED naranja parpadeante: Problema de batería/carga
- Sin LEDs: Problema de alimentación o placa madre
- LED blanco fijo: Posible problema de pantalla (laptop encendida)

**ESCALAMIENTO:**
Si después de estos pasos NO enciende:
- Documentar modelo exacto y síntomas
- Escalar a soporte técnico nivel 2
- Posible necesidad de reemplazo de placa madre

**TIEMPO ESTIMADO:** 20-35 minutos

**PREVENCIÓN:**
- Evitar golpes y caídas
- No bloquear ventilaciones
- Usar adaptador original del fabricante
- Calibrar batería cada 3 meses',
    'Hardware',
    'Laptop',
    'Energía',
    'approved',
    admin_user_id,
    admin_user_id,
    NOW(),
    ARRAY['laptop', 'no enciende', 'batería', 'energía', 'adaptador', 'hardware'],
    'laptop no enciende prende arranca bateria adaptador corriente LED parpadea energia',
    28,
    203,
    22,
    51.25
  );

  -- 4. PC lenta - Alto uso de disco o CPU
  INSERT INTO knowledge_base_articles (
    title,
    summary,
    solution,
    category_level1,
    category_level2,
    category_level3,
    status,
    created_by,
    approved_by,
    approved_at,
    tags,
    keywords,
    helpful_count,
    views_count,
    times_used,
    relevance_score
  ) VALUES (
    'PC muy lenta - Uso de disco al 100% o CPU alto',
    'El equipo funciona extremadamente lento, las aplicaciones tardan en abrir y el Administrador de tareas muestra uso de disco al 100% o CPU constantemente alto.',
    E'**PROBLEMA:**
El equipo tiene rendimiento muy bajo, aplicaciones lentas, sistema que no responde. El Administrador de tareas muestra uso de disco al 100% o CPU sobre 80% constantemente.

**CAUSA RAÍZ:**
- Windows Search o Windows Update consumiendo recursos
- Antivirus ejecutando escaneo completo
- Disco duro mecánico fragmentado o fallando
- Malware o programas no deseados
- Poca memoria RAM disponible
- Inicio de Windows con muchos programas

**SOLUCIÓN PASO A PASO:**

1. **Identificar proceso problemático:**
   - Abrir Administrador de tareas (Ctrl + Shift + Esc)
   - Ir a pestaña "Procesos"
   - Ordenar por "Disco" o "CPU" (clic en la columna)
   - Identificar proceso con mayor consumo
   - Anotar nombre del proceso

2. **Deshabilitar Windows Search temporalmente:**
   - Presionar Windows + R
   - Escribir: services.msc
   - Buscar "Windows Search"
   - Clic derecho → Detener
   - Verificar si mejora el rendimiento

3. **Optimizar programas de inicio:**
   - Abrir Administrador de tareas → pestaña "Inicio"
   - Deshabilitar programas innecesarios (Skype, OneDrive, etc.)
   - Dejar solo antivirus y programas críticos
   - Reiniciar el equipo

4. **Ejecutar limpieza de disco:**
   - Abrir "Este equipo"
   - Clic derecho en disco C: → Propiedades
   - Clic en "Liberar espacio"
   - Seleccionar "Archivos temporales" y "Papelera de reciclaje"
   - Clic en "Limpiar archivos del sistema"
   - Esperar que complete

5. **Verificar salud del disco (si es HDD):**
   - Abrir CMD como administrador
   - Ejecutar: chkdsk C: /f /r
   - Aceptar programar para próximo reinicio
   - Reiniciar (proceso toma 1-2 horas)

6. **Análisis de malware:**
   - Ejecutar Windows Defender (Seguridad de Windows)
   - Realizar análisis completo
   - Eliminar amenazas detectadas
   - Considerar Malwarebytes para segunda opinión

7. **Solución definitiva si persiste:**
   - Recomendar actualización a SSD (dramática mejora)
   - Considerar aumento de RAM si tiene menos de 8GB
   - Evaluar reinstalación limpia de Windows

**MEJORA INMEDIATA (mientras se resuelve):**
- Cerrar programas no usados
- Evitar abrir muchas pestañas del navegador
- No ejecutar múltiples aplicaciones pesadas

**TIEMPO ESTIMADO:** 45-90 minutos (dependiendo de limpieza)

**PREVENCIÓN:**
- Mantener menos de 20% de espacio libre en disco
- Ejecutar limpieza mensual
- Actualizar Windows regularmente
- Evitar instalar software de fuentes desconocidas
- Reiniciar el equipo al menos semanalmente',
    'Hardware',
    'PC',
    'Rendimiento',
    'approved',
    admin_user_id,
    admin_user_id,
    NOW(),
    ARRAY['lentitud', 'rendimiento', 'disco 100%', 'CPU', 'optimización', 'Windows'],
    'PC lenta lento rendimiento disco 100 CPU alto memoria RAM optimizar velocidad',
    35,
    278,
    29,
    55.00
  );

  -- 5. Teclado laptop - Teclas no funcionan
  INSERT INTO knowledge_base_articles (
    title,
    summary,
    solution,
    category_level1,
    category_level2,
    category_level3,
    status,
    created_by,
    approved_by,
    approved_at,
    tags,
    keywords,
    helpful_count,
    views_count,
    times_used,
    relevance_score
  ) VALUES (
    'Teclado de laptop - Algunas teclas no funcionan',
    'El teclado integrado de la laptop tiene teclas que no responden o escriben caracteres incorrectos. Problema puede ser de una tecla o varias.',
    E'**PROBLEMA:**
Teclas específicas del teclado integrado no funcionan, escriben el carácter incorrecto, o responden de forma intermitente. Puede afectar una tecla o grupos de teclas.

**CAUSA RAÍZ:**
- Suciedad o líquidos derramados bajo las teclas
- Drivers del teclado corruptos o desactualizados
- Configuración de filtro de teclas activada
- Cable de conexión del teclado flojo (interno)
- Daño físico por golpe o presión
- Falla en membrana del teclado

**SOLUCIÓN PASO A PASO:**

1. **Verificación rápida - Software:**
   - Abrir Bloc de notas o Word
   - Probar TODAS las teclas sistemáticamente
   - Anotar qué teclas específicas no funcionan
   - Probar con Bloq Mayús activado/desactivado
   - Probar teclas numéricas con Bloq Num activado

2. **Desactivar filtro de teclas:**
   - Ir a Configuración → Accesibilidad
   - Seleccionar "Teclado"
   - Desactivar "Filtro de teclas"
   - Desactivar "Teclas de alternancia"
   - Probar nuevamente el teclado

3. **Actualizar/reinstalar driver del teclado:**
   - Clic derecho en Inicio → Administrador de dispositivos
   - Expandir "Teclados"
   - Clic derecho en teclado → Desinstalar dispositivo
   - Marcar "Eliminar software de controlador"
   - Reiniciar equipo (Windows reinstalará automáticamente)

4. **Limpieza física (si hay suciedad visible):**
   - Apagar completamente la laptop
   - Usar aire comprimido en ángulo
   - Soplar bajo las teclas problemáticas
   - Usar palillo de dientes envuelto en alcohol isopropílico
   - Limpiar alrededor de las teclas con cuidado

5. **Probar con teclado externo USB:**
   - Conectar teclado USB externo
   - Verificar si funciona correctamente
   - Si funciona → Confirma problema en teclado integrado
   - Solución temporal mientras se repara

6. **Mapeo temporal de teclas (workaround):**
   - Usar Teclado en pantalla de Windows
   - Configurar atajos de teclado alternativos
   - Considerar software de remapeo (SharpKeys)

**ESCALAMIENTO A HARDWARE:**
Si después de limpieza y reinstalación persiste:
- Requiere apertura de laptop para:
  - Verificar conexión del cable flex del teclado
  - Reemplazar teclado completo (si está dañado)
- Documentar: Modelo exacto + teclas afectadas
- Cotizar teclado de reemplazo
- Escalar a técnico de hardware nivel 2

**DERRAME DE LÍQUIDOS (si es el caso):**
Si se derramó líquido recientemente:
1. Apagar INMEDIATAMENTE la laptop
2. Desconectar batería y adaptador
3. Voltear boca abajo en forma de tienda de campaña
4. Dejar secar 48-72 horas
5. NO intentar encender antes de tiempo
6. Llevar a revisión técnica interna

**TIEMPO ESTIMADO:** 30-45 minutos (software) / 2-3 horas (hardware)

**PREVENCIÓN:**
- No comer/beber sobre la laptop
- Mantener limpio el entorno de trabajo
- Usar protector de teclado de silicona
- Limpieza con aire comprimido mensual
- Evitar presionar teclas con fuerza excesiva',
    'Hardware',
    'Laptop',
    'Periféricos',
    'approved',
    admin_user_id,
    admin_user_id,
    NOW(),
    ARRAY['teclado', 'teclas', 'laptop', 'no funciona', 'periféricos', 'hardware'],
    'teclado laptop teclas no funcionan escriben responden hardware derrame liquido',
    19,
    167,
    15,
    44.80
  );

  RAISE NOTICE 'Se insertaron 5 artículos de ejemplo en la base de conocimientos';
END $$;
