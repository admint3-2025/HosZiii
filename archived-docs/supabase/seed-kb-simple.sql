-- Script simple para insertar artículos de Base de Conocimientos
-- Usar los IDs de categorías directamente desde la tabla categories

-- Primero, verifica qué categorías tienes disponibles:
-- SELECT id, name, parent_id FROM categories ORDER BY parent_id NULLS FIRST, sort_order;

-- Luego ejecuta este INSERT reemplazando 'TU_CATEGORIA_ID' con un ID real de tu DB
-- y 'TU_ADMIN_ID' con el ID de un usuario admin

INSERT INTO knowledge_base_articles (
  title, summary, solution, category_level1, status, created_by, approved_by, approved_at,
  tags, keywords, helpful_count, views_count, times_used, relevance_score
) VALUES 
-- Artículo 1: Windows BSOD
(
  'Windows no inicia - Pantalla azul al arrancar',
  'El equipo muestra pantalla azul BSOD al iniciar Windows',
  E'**PROBLEMA:** Windows no inicia, muestra BSOD\n\n**SOLUCIÓN:**\n1. Acceder al Modo de Recuperación (reiniciar 3 veces)\n2. Reparación de inicio\n3. Restaurar sistema si persiste\n4. Comandos: chkdsk C: /f /r, sfc /scannow',
  (SELECT id FROM categories WHERE parent_id IS NULL LIMIT 1), -- Usa la primera categoría raíz
  'approved',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  NOW(),
  ARRAY['Windows', 'BSOD', 'arranque'],
  'Windows BSOD pantalla azul error arranque',
  15, 89, 12, 42.50
),
-- Artículo 2: Outlook
(
  'Outlook no sincroniza correos',
  'Microsoft Outlook no sincroniza correctamente',
  E'**PROBLEMA:** Correos no llegan o no se envían\n\n**SOLUCIÓN:**\n1. Verificar modo sin conexión (Enviar/Recibir)\n2. Presionar F9 para forzar sincronización\n3. Reparar perfil de Outlook\n4. Limpiar caché: %localappdata%\\Microsoft\\Outlook',
  (SELECT id FROM categories WHERE parent_id IS NULL LIMIT 1),
  'approved',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  NOW(),
  ARRAY['Outlook', 'correo', 'email'],
  'Outlook sincronizar correos email',
  23, 156, 18, 48.75
),
-- Artículo 3: Laptop no enciende
(
  'Laptop no enciende - LED parpadea',
  'La laptop no enciende al presionar botón de encendido',
  E'**PROBLEMA:** Laptop sin señales de vida\n\n**SOLUCIÓN:**\n1. Descarga estática: desconectar todo, presionar botón 45 seg\n2. Verificar adaptador de corriente\n3. Probar sin batería\n4. Revisar conexiones RAM/disco (técnicos)',
  (SELECT id FROM categories WHERE parent_id IS NULL LIMIT 1),
  'approved',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  NOW(),
  ARRAY['laptop', 'batería', 'energía'],
  'laptop no enciende bateria',
  28, 203, 22, 51.25
),
-- Artículo 4: PC lenta
(
  'PC muy lenta - Disco 100% o CPU alto',
  'Equipo extremadamente lento, Administrador de tareas muestra disco 100%',
  E'**PROBLEMA:** Rendimiento muy bajo\n\n**SOLUCIÓN:**\n1. Identificar proceso (Ctrl+Shift+Esc)\n2. Deshabilitar Windows Search temporalmente\n3. Optimizar programas de inicio\n4. Limpieza de disco\n5. chkdsk C: /f /r',
  (SELECT id FROM categories WHERE parent_id IS NULL LIMIT 1),
  'approved',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  NOW(),
  ARRAY['lentitud', 'rendimiento', 'CPU'],
  'PC lenta disco 100 CPU alto',
  35, 278, 29, 55.00
),
-- Artículo 5: Teclado
(
  'Teclado laptop - Teclas no funcionan',
  'Teclas del teclado no responden o escriben mal',
  E'**PROBLEMA:** Teclas no funcionan\n\n**SOLUCIÓN:**\n1. Desactivar filtro de teclas (Configuración → Accesibilidad)\n2. Actualizar driver del teclado\n3. Limpieza con aire comprimido\n4. Probar teclado USB externo\n5. Si persiste: reemplazo necesario',
  (SELECT id FROM categories WHERE parent_id IS NULL LIMIT 1),
  'approved',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  NOW(),
  ARRAY['teclado', 'laptop', 'hardware'],
  'teclado laptop teclas no funcionan',
  19, 167, 15, 44.80
);

-- Verificar inserción
SELECT COUNT(*) as total_articulos, 
       COUNT(CASE WHEN status = 'approved' THEN 1 END) as aprobados
FROM knowledge_base_articles;
