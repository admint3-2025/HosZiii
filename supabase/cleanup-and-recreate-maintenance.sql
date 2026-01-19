-- ============================================================================
-- CLEANUP Y RECREACIÓN COMPLETA DE CATEGORÍAS DE MANTENIMIENTO
-- ============================================================================
-- Este script limpia TODAS las categorías corruptas y duplicadas
-- Y crea una estructura LIMPIA y CORRECTA

-- PASO 1: ELIMINAR TODAS LAS CATEGORÍAS CORRUPTAS (sort_order >= 100 O que sean hijas de ellas)
DELETE FROM categories 
WHERE parent_id IN (
  SELECT id FROM categories WHERE sort_order >= 100 AND parent_id IS NULL
);

DELETE FROM categories 
WHERE sort_order >= 100 AND parent_id IS NULL;

-- Verificar que se eliminaron
SELECT 'PASO 1: Categorías corruptas eliminadas. Total restante:' as paso;
SELECT COUNT(*) as "Categorías restantes" FROM categories;

-- PASO 2: CREAR CATEGORÍAS RAÍZ NUEVAS (NIVEL 1) - SIN DUPLICADOS
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
('Climatización / HVAC', 'climatizacion-hvac', NULL, 100),
('Fontanería / Plomería', 'fontaneria-plomeria', NULL, 110),
('Electricidad / Iluminación', 'electricidad-iluminacion', NULL, 120),
('Carpintería / Estructuras', 'carpinteria-estructuras', NULL, 130),
('Pintura / Acabados', 'pintura-acabados', NULL, 140),
('Mobiliario / Decoración', 'mobiliario-decoracion', NULL, 150),
('Equipos de Cocina', 'equipos-cocina', NULL, 160),
('Equipos de Lavandería', 'equipos-lavanderia', NULL, 170),
('Sistemas de Seguridad', 'sistemas-seguridad', NULL, 180),
('Pisos / Revestimientos', 'pisos-revestimientos', NULL, 190),
('Ascensores / Escaleras', 'ascensores-escaleras', NULL, 200),
('Sistemas de Agua', 'sistemas-agua', NULL, 210),
('Detección de Incendios / Seguridad', 'deteccion-incendios', NULL, 220),
('Mantenimiento General', 'mantenimiento-general', NULL, 230),
('Exteriores / Áreas Comunes', 'exteriores-areas-comunes', NULL, 240);

SELECT 'PASO 2: Categorías raíz creadas (15 categorías)' as paso;

-- PASO 3: CREAR SUBCATEGORÍAS (NIVEL 2) - CADA UNA VINCULADA A SU PADRE CORRECTO

-- Subcategorías de CLIMATIZACIÓN / HVAC
INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, (SELECT id FROM categories WHERE name = 'Climatización / HVAC' AND parent_id IS NULL LIMIT 1), v.sort_order
FROM (
  SELECT 'Aire Acondicionado Central' as name, 'aire-central' as slug, 10 as sort_order
  UNION ALL SELECT 'Aire Acondicionado Central - Reparación' as name, 'aire-central-reparacion' as slug, 11 as sort_order
  UNION ALL SELECT 'Aire Acondicionado Central - Mantenimiento' as name, 'aire-central-mto' as slug, 12 as sort_order
  UNION ALL SELECT 'Aire Acondicionado Central - Limpieza' as name, 'aire-central-limpieza' as slug, 13 as sort_order
  UNION ALL SELECT 'Unidades Split / Individuales' as name, 'split-individuales' as slug, 20 as sort_order
  UNION ALL SELECT 'Unidades Split - Instalación' as name, 'split-instalacion' as slug, 21 as sort_order
  UNION ALL SELECT 'Unidades Split - Reparación' as name, 'split-reparacion' as slug, 22 as sort_order
  UNION ALL SELECT 'Unidades Split - Limpieza de Filtros' as name, 'split-filtros' as slug, 23 as sort_order
  UNION ALL SELECT 'Calefacción / Radiadores' as name, 'calefaccion-radiadores' as slug, 30 as sort_order
  UNION ALL SELECT 'Calefacción - Reparación' as name, 'calefaccion-reparacion' as slug, 31 as sort_order
  UNION ALL SELECT 'Calefacción - Purgado de Radiadores' as name, 'calefaccion-purgado' as slug, 32 as sort_order
  UNION ALL SELECT 'Ventilación / Extractores' as name, 'ventilacion-extractores' as slug, 40 as sort_order
  UNION ALL SELECT 'Ventilación - Limpieza de Conductos' as name, 'ventilacion-conductos' as slug, 41 as sort_order
  UNION ALL SELECT 'Ventilación - Reparación de Extractores' as name, 'ventilacion-reparacion' as slug, 42 as sort_order
  UNION ALL SELECT 'Filtros y Limpieza' as name, 'filtros-limpieza' as slug, 50 as sort_order
  UNION ALL SELECT 'Recarga de Refrigerante' as name, 'recarga-refrigerante' as slug, 60 as sort_order
  UNION ALL SELECT 'Mantenimiento Preventivo HVAC' as name, 'mto-preventivo-hvac' as slug, 70 as sort_order
) v;

-- Subcategorías de FONTANERÍA / PLOMERÍA
INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, (SELECT id FROM categories WHERE name = 'Fontanería / Plomería' AND parent_id IS NULL LIMIT 1), v.sort_order
FROM (
  SELECT 'Detección de Fugas' as name, 'deteccion-fugas' as slug, 10 as sort_order
  UNION ALL SELECT 'Reparación de Tuberías' as name, 'reparacion-tuberias' as slug, 11 as sort_order
  UNION ALL SELECT 'Cambio de Tuberías' as name, 'cambio-tuberias' as slug, 12 as sort_order
  UNION ALL SELECT 'Aislamiento de Tuberías' as name, 'aislamiento-tuberias' as slug, 13 as sort_order
  UNION ALL SELECT 'Grifos / Llaves' as name, 'grifos-llaves' as slug, 20 as sort_order
  UNION ALL SELECT 'Reparación de Grifos' as name, 'reparacion-grifos' as slug, 21 as sort_order
  UNION ALL SELECT 'Cambio de Grifos' as name, 'cambio-grifos' as slug, 22 as sort_order
  UNION ALL SELECT 'Sanitarios / Inodoros' as name, 'sanitarios-inodoros' as slug, 30 as sort_order
  UNION ALL SELECT 'Reparación de Inodoros' as name, 'reparacion-inodoros' as slug, 31 as sort_order
  UNION ALL SELECT 'Cambio de Asiento Inodoro' as name, 'cambio-asiento-inodoro' as slug, 32 as sort_order
  UNION ALL SELECT 'Reparación de Cisterna' as name, 'reparacion-cisterna' as slug, 33 as sort_order
  UNION ALL SELECT 'Duchas / Regaderas' as name, 'duchas-regaderas' as slug, 40 as sort_order
  UNION ALL SELECT 'Reparación de Duchas' as name, 'reparacion-duchas' as slug, 41 as sort_order
  UNION ALL SELECT 'Cambio de Regadera' as name, 'cambio-regadera' as slug, 42 as sort_order
  UNION ALL SELECT 'Desagües / Drenajes' as name, 'desagues-drenajes' as slug, 50 as sort_order
  UNION ALL SELECT 'Limpieza de Desagüe' as name, 'limpieza-desague' as slug, 51 as sort_order
  UNION ALL SELECT 'Destaponamiento' as name, 'destaponamiento' as slug, 52 as sort_order
  UNION ALL SELECT 'Reparación de Trampa de Grasa' as name, 'reparacion-trampa-grasa' as slug, 53 as sort_order
  UNION ALL SELECT 'Sistemas de Drenaje (Sumideros)' as name, 'sistemas-drenaje-sumideros' as slug, 60 as sort_order
  UNION ALL SELECT 'Calentadores de Agua' as name, 'calentadores-agua' as slug, 70 as sort_order
  UNION ALL SELECT 'Reparación de Calentador' as name, 'reparacion-calentador' as slug, 71 as sort_order
  UNION ALL SELECT 'Cambio de Calentador' as name, 'cambio-calentador' as slug, 72 as sort_order
  UNION ALL SELECT 'Cisternas / Tanques de Agua' as name, 'cisternas-tanques' as slug, 80 as sort_order
  UNION ALL SELECT 'Bombas de Agua' as name, 'bombas-agua' as slug, 90 as sort_order
  UNION ALL SELECT 'Válvulas de Control' as name, 'valvulas-control' as slug, 100 as sort_order
) v;

-- Subcategorías de ELECTRICIDAD / ILUMINACIÓN
INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, (SELECT id FROM categories WHERE name = 'Electricidad / Iluminación' AND parent_id IS NULL LIMIT 1), v.sort_order
FROM (
  SELECT 'Iluminación General' as name, 'iluminacion-general' as slug, 10 as sort_order
  UNION ALL SELECT 'Reparación de Luminarias' as name, 'reparacion-luminarias' as slug, 11 as sort_order
  UNION ALL SELECT 'Cambio de Bombillas' as name, 'cambio-bombillas' as slug, 12 as sort_order
  UNION ALL SELECT 'Focos / Lámparas LED' as name, 'focos-lamparas-led' as slug, 20 as sort_order
  UNION ALL SELECT 'Instalación de LED' as name, 'instalacion-led' as slug, 21 as sort_order
  UNION ALL SELECT 'Cambio de Focos' as name, 'cambio-focos' as slug, 22 as sort_order
  UNION ALL SELECT 'Enchufes / Tomacorrientes' as name, 'enchufes-tomacorrientes' as slug, 30 as sort_order
  UNION ALL SELECT 'Reparación de Enchufes' as name, 'reparacion-enchufes' as slug, 31 as sort_order
  UNION ALL SELECT 'Cambio de Enchufes' as name, 'cambio-enchufes' as slug, 32 as sort_order
  UNION ALL SELECT 'Interruptores / Apagadores' as name, 'interruptores-apagadores' as slug, 40 as sort_order
  UNION ALL SELECT 'Reparación de Interruptores' as name, 'reparacion-interruptores' as slug, 41 as sort_order
  UNION ALL SELECT 'Cambio de Interruptores' as name, 'cambio-interruptores' as slug, 42 as sort_order
  UNION ALL SELECT 'Circuitos Eléctricos' as name, 'circuitos-electricos' as slug, 50 as sort_order
  UNION ALL SELECT 'Identificación de Circuitos' as name, 'identificacion-circuitos' as slug, 51 as sort_order
  UNION ALL SELECT 'Reparación de Circuitos' as name, 'reparacion-circuitos' as slug, 52 as sort_order
  UNION ALL SELECT 'Paneles / Breakers' as name, 'paneles-breakers' as slug, 60 as sort_order
  UNION ALL SELECT 'Reparación de Panel' as name, 'reparacion-panel' as slug, 61 as sort_order
  UNION ALL SELECT 'Cambio de Breaker' as name, 'cambio-breaker' as slug, 62 as sort_order
  UNION ALL SELECT 'Cableado / Instalaciones' as name, 'cableado-instalaciones' as slug, 70 as sort_order
  UNION ALL SELECT 'Reparación de Cableado' as name, 'reparacion-cableado' as slug, 71 as sort_order
  UNION ALL SELECT 'Cambio de Cableado' as name, 'cambio-cableado' as slug, 72 as sort_order
  UNION ALL SELECT 'Generador Eléctrico' as name, 'generador-electrico' as slug, 80 as sort_order
  UNION ALL SELECT 'Mantenimiento Generador' as name, 'mto-generador' as slug, 81 as sort_order
  UNION ALL SELECT 'Reparación Generador' as name, 'reparacion-generador' as slug, 82 as sort_order
  UNION ALL SELECT 'UPS / No-Break' as name, 'ups-no-break' as slug, 90 as sort_order
  UNION ALL SELECT 'Sistemas de Respaldo' as name, 'sistemas-respaldo' as slug, 100 as sort_order
) v;

-- Subcategorías de CARPINTERÍA / ESTRUCTURAS
INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, (SELECT id FROM categories WHERE name = 'Carpintería / Estructuras' AND parent_id IS NULL LIMIT 1), v.sort_order
FROM (
  SELECT 'Puertas de Habitaciones' as name, 'puertas-habitaciones' as slug, 10 as sort_order
  UNION ALL SELECT 'Reparación de Puerta' as name, 'reparacion-puerta' as slug, 11 as sort_order
  UNION ALL SELECT 'Cambio de Puerta' as name, 'cambio-puerta' as slug, 12 as sort_order
  UNION ALL SELECT 'Ajuste de Marco' as name, 'ajuste-marco' as slug, 13 as sort_order
  UNION ALL SELECT 'Puertas de Emergencia / Acceso' as name, 'puertas-emergencia-acceso' as slug, 20 as sort_order
  UNION ALL SELECT 'Reparación Puerta Emergencia' as name, 'reparacion-puerta-emergencia' as slug, 21 as sort_order
  UNION ALL SELECT 'Cerraduras / Cerrojos' as name, 'cerraduras-cerrojos' as slug, 30 as sort_order
  UNION ALL SELECT 'Reparación de Cerradura' as name, 'reparacion-cerradura' as slug, 31 as sort_order
  UNION ALL SELECT 'Cambio de Cerradura' as name, 'cambio-cerradura' as slug, 32 as sort_order
  UNION ALL SELECT 'Reparación de Cerrojillo' as name, 'reparacion-cerrojillo' as slug, 33 as sort_order
  UNION ALL SELECT 'Marcos / Bisagras' as name, 'marcos-bisagras' as slug, 40 as sort_order
  UNION ALL SELECT 'Reparación de Bisagra' as name, 'reparacion-bisagra' as slug, 41 as sort_order
  UNION ALL SELECT 'Cambio de Bisagra' as name, 'cambio-bisagra' as slug, 42 as sort_order
  UNION ALL SELECT 'Paredes / Tabiques' as name, 'paredes-tabiques' as slug, 50 as sort_order
  UNION ALL SELECT 'Reparación de Pared' as name, 'reparacion-pared' as slug, 51 as sort_order
  UNION ALL SELECT 'Reparación de Grietas' as name, 'reparacion-grietas' as slug, 52 as sort_order
  UNION ALL SELECT 'Estructuras Metálicas' as name, 'estructuras-metalicas' as slug, 60 as sort_order
  UNION ALL SELECT 'Techos' as name, 'techos' as slug, 70 as sort_order
  UNION ALL SELECT 'Reparación de Techo' as name, 'reparacion-techo' as slug, 71 as sort_order
  UNION ALL SELECT 'Ventanas / Marcos' as name, 'ventanas-marcos' as slug, 80 as sort_order
  UNION ALL SELECT 'Reparación de Ventana' as name, 'reparacion-ventana' as slug, 81 as sort_order
  UNION ALL SELECT 'Cambio de Ventana' as name, 'cambio-ventana' as slug, 82 as sort_order
  UNION ALL SELECT 'Vidrios / Cristales' as name, 'vidrios-cristales' as slug, 90 as sort_order
  UNION ALL SELECT 'Cambio de Vidrio' as name, 'cambio-vidrio' as slug, 91 as sort_order
  UNION ALL SELECT 'Reparación de Madera' as name, 'reparacion-madera' as slug, 100 as sort_order
) v;

-- Subcategorías de PINTURA / ACABADOS
INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, (SELECT id FROM categories WHERE name = 'Pintura / Acabados' AND parent_id IS NULL LIMIT 1), v.sort_order
FROM (
  SELECT 'Pintura de Paredes' as name, 'pintura-paredes' as slug, 10 as sort_order
  UNION ALL SELECT 'Reparación Pintura Paredes' as name, 'reparacion-pintura-paredes' as slug, 11 as sort_order
  UNION ALL SELECT 'Pintura Completa Cuarto' as name, 'pintura-completa-cuarto' as slug, 12 as sort_order
  UNION ALL SELECT 'Pintura de Cielos / Techos' as name, 'pintura-cielos-techos' as slug, 20 as sort_order
  UNION ALL SELECT 'Pintura de Estructuras Metálicas' as name, 'pintura-estructuras-metalicas' as slug, 30 as sort_order
  UNION ALL SELECT 'Selladores / Impermeabilizantes' as name, 'selladores-impermeabilizantes' as slug, 40 as sort_order
  UNION ALL SELECT 'Empapelado / Revestimientos' as name, 'empapelado-revestimientos' as slug, 50 as sort_order
  UNION ALL SELECT 'Cambio de Papel Mural' as name, 'cambio-papel-mural' as slug, 51 as sort_order
  UNION ALL SELECT 'Acabados de Superficie' as name, 'acabados-superficie' as slug, 60 as sort_order
  UNION ALL SELECT 'Restauración de Acabados' as name, 'restauracion-acabados' as slug, 70 as sort_order
) v;

-- Subcategorías de MOBILIARIO / DECORACIÓN
INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, (SELECT id FROM categories WHERE name = 'Mobiliario / Decoración' AND parent_id IS NULL LIMIT 1), v.sort_order
FROM (
  SELECT 'Camas / Colchones' as name, 'camas-colchones' as slug, 10 as sort_order
  UNION ALL SELECT 'Reparación de Cama' as name, 'reparacion-cama' as slug, 11 as sort_order
  UNION ALL SELECT 'Cambio de Colchón' as name, 'cambio-colchon' as slug, 12 as sort_order
  UNION ALL SELECT 'Cambio de Sábanas' as name, 'cambio-sabanas' as slug, 13 as sort_order
  UNION ALL SELECT 'Sofás / Sillas' as name, 'sofas-sillas' as slug, 20 as sort_order
  UNION ALL SELECT 'Reparación de Sofá' as name, 'reparacion-sofa' as slug, 21 as sort_order
  UNION ALL SELECT 'Cambio de Cojín' as name, 'cambio-cojin' as slug, 22 as sort_order
  UNION ALL SELECT 'Mesas / Escritorios' as name, 'mesas-escritorios' as slug, 30 as sort_order
  UNION ALL SELECT 'Reparación de Mesa' as name, 'reparacion-mesa' as slug, 31 as sort_order
  UNION ALL SELECT 'Armarios / Roperos' as name, 'armarios-roperos' as slug, 40 as sort_order
  UNION ALL SELECT 'Reparación de Armario' as name, 'reparacion-armario' as slug, 41 as sort_order
  UNION ALL SELECT 'Cortinas / Persianas' as name, 'cortinas-persianas' as slug, 50 as sort_order
  UNION ALL SELECT 'Cambio de Cortina' as name, 'cambio-cortina' as slug, 51 as sort_order
  UNION ALL SELECT 'Reparación Persiana' as name, 'reparacion-persiana' as slug, 52 as sort_order
  UNION ALL SELECT 'Espejos / Adornos' as name, 'espejos-adornos' as slug, 60 as sort_order
  UNION ALL SELECT 'Reparación Tapicería' as name, 'reparacion-tapiceria' as slug, 70 as sort_order
  UNION ALL SELECT 'Restauración de Muebles' as name, 'restauracion-muebles' as slug, 80 as sort_order
) v;

-- Subcategorías de EQUIPOS DE COCINA
INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, (SELECT id FROM categories WHERE name = 'Equipos de Cocina' AND parent_id IS NULL LIMIT 1), v.sort_order
FROM (
  SELECT 'Refrigerador / Congelador' as name, 'refrigerador-congelador' as slug, 10 as sort_order
  UNION ALL SELECT 'Reparación Refrigerador' as name, 'reparacion-refrigerador' as slug, 11 as sort_order
  UNION ALL SELECT 'Limpieza Profunda Refrigerador' as name, 'limpieza-refrigerador' as slug, 12 as sort_order
  UNION ALL SELECT 'Estufas / Hornos' as name, 'estufas-hornos' as slug, 20 as sort_order
  UNION ALL SELECT 'Reparación Estufa' as name, 'reparacion-estufa' as slug, 21 as sort_order
  UNION ALL SELECT 'Limpieza Horno' as name, 'limpieza-horno' as slug, 22 as sort_order
  UNION ALL SELECT 'Microondas' as name, 'microondas' as slug, 30 as sort_order
  UNION ALL SELECT 'Reparación Microondas' as name, 'reparacion-microondas' as slug, 31 as sort_order
  UNION ALL SELECT 'Lavavajillas' as name, 'lavavajillas' as slug, 40 as sort_order
  UNION ALL SELECT 'Reparación Lavavajillas' as name, 'reparacion-lavavajillas' as slug, 41 as sort_order
  UNION ALL SELECT 'Cambio de Filtro Lavavajillas' as name, 'cambio-filtro-lavavajillas' as slug, 42 as sort_order
  UNION ALL SELECT 'Campana Extractora' as name, 'campana-extractora' as slug, 50 as sort_order
  UNION ALL SELECT 'Limpieza Campana' as name, 'limpieza-campana' as slug, 51 as sort_order
  UNION ALL SELECT 'Cambio de Filtro Campana' as name, 'cambio-filtro-campana' as slug, 52 as sort_order
  UNION ALL SELECT 'Freidora' as name, 'freidora' as slug, 60 as sort_order
  UNION ALL SELECT 'Reparación Freidora' as name, 'reparacion-freidora' as slug, 61 as sort_order
  UNION ALL SELECT 'Cafetera / Dispensadores' as name, 'cafetera-dispensadores' as slug, 70 as sort_order
  UNION ALL SELECT 'Reparación Cafetera' as name, 'reparacion-cafetera' as slug, 71 as sort_order
  UNION ALL SELECT 'Equipos Auxiliares' as name, 'equipos-auxiliares' as slug, 80 as sort_order
) v;

-- Subcategorías de EQUIPOS DE LAVANDERÍA
INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, (SELECT id FROM categories WHERE name = 'Equipos de Lavandería' AND parent_id IS NULL LIMIT 1), v.sort_order
FROM (
  SELECT 'Lavadoras' as name, 'lavadoras' as slug, 10 as sort_order
  UNION ALL SELECT 'Reparación Lavadora' as name, 'reparacion-lavadora' as slug, 11 as sort_order
  UNION ALL SELECT 'Cambio de Manguera Lavadora' as name, 'cambio-manguera-lavadora' as slug, 12 as sort_order
  UNION ALL SELECT 'Limpieza Tambor Lavadora' as name, 'limpieza-tambor-lavadora' as slug, 13 as sort_order
  UNION ALL SELECT 'Secadoras' as name, 'secadoras' as slug, 20 as sort_order
  UNION ALL SELECT 'Reparación Secadora' as name, 'reparacion-secadora' as slug, 21 as sort_order
  UNION ALL SELECT 'Limpieza Filtro Secadora' as name, 'limpieza-filtro-secadora' as slug, 22 as sort_order
  UNION ALL SELECT 'Planchas / Prensas' as name, 'planchas-prensas' as slug, 30 as sort_order
  UNION ALL SELECT 'Reparación Plancha' as name, 'reparacion-plancha' as slug, 31 as sort_order
  UNION ALL SELECT 'Perchas / Transportes de Ropa' as name, 'perchas-transportes-ropa' as slug, 40 as sort_order
  UNION ALL SELECT 'Sistemas de Vapor' as name, 'sistemas-vapor' as slug, 50 as sort_order
  UNION ALL SELECT 'Tubería de Drenaje / Desagüe' as name, 'tuberia-drenaje-desague' as slug, 60 as sort_order
) v;

-- Subcategorías de SISTEMAS DE SEGURIDAD
INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, (SELECT id FROM categories WHERE name = 'Sistemas de Seguridad' AND parent_id IS NULL LIMIT 1), v.sort_order
FROM (
  SELECT 'Cámaras de Vigilancia' as name, 'camaras-vigilancia' as slug, 10 as sort_order
  UNION ALL SELECT 'Instalación de Cámara' as name, 'instalacion-camara' as slug, 11 as sort_order
  UNION ALL SELECT 'Reparación Cámara' as name, 'reparacion-camara' as slug, 12 as sort_order
  UNION ALL SELECT 'Cambio de Lente Cámara' as name, 'cambio-lente-camara' as slug, 13 as sort_order
  UNION ALL SELECT 'Sistema de Cerraduras Electrónicas' as name, 'cerraduras-electronicas' as slug, 20 as sort_order
  UNION ALL SELECT 'Reparación Cerradura Electrónica' as name, 'reparacion-cerradura-electronica' as slug, 21 as sort_order
  UNION ALL SELECT 'Cambio de Batería Cerradura' as name, 'cambio-bateria-cerradura' as slug, 22 as sort_order
  UNION ALL SELECT 'Control de Acceso' as name, 'control-acceso' as slug, 30 as sort_order
  UNION ALL SELECT 'Alarmas de Seguridad' as name, 'alarmas-seguridad' as slug, 40 as sort_order
  UNION ALL SELECT 'Reparación Alarma' as name, 'reparacion-alarma' as slug, 41 as sort_order
  UNION ALL SELECT 'Cambio de Sensores' as name, 'cambio-sensores' as slug, 42 as sort_order
  UNION ALL SELECT 'Monitoreo 24/7' as name, 'monitoreo-24-7' as slug, 50 as sort_order
  UNION ALL SELECT 'Sistemas de Backup' as name, 'sistemas-backup' as slug, 60 as sort_order
) v;

-- Subcategorías de PISOS / REVESTIMIENTOS
INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, (SELECT id FROM categories WHERE name = 'Pisos / Revestimientos' AND parent_id IS NULL LIMIT 1), v.sort_order
FROM (
  SELECT 'Pisos de Cerámica / Porcelana' as name, 'pisos-ceramica-porcelana' as slug, 10 as sort_order
  UNION ALL SELECT 'Reparación Piso Cerámica' as name, 'reparacion-piso-ceramica' as slug, 11 as sort_order
  UNION ALL SELECT 'Cambio de Azulejo' as name, 'cambio-azulejo' as slug, 12 as sort_order
  UNION ALL SELECT 'Lechada de Piso' as name, 'lechada-piso' as slug, 13 as sort_order
  UNION ALL SELECT 'Pisos de Mármol / Granito' as name, 'pisos-marmol-granito' as slug, 20 as sort_order
  UNION ALL SELECT 'Pulido de Mármol' as name, 'pulido-marmol' as slug, 21 as sort_order
  UNION ALL SELECT 'Reparación Mármol' as name, 'reparacion-marmol' as slug, 22 as sort_order
  UNION ALL SELECT 'Pisos de Madera' as name, 'pisos-madera' as slug, 30 as sort_order
  UNION ALL SELECT 'Reparación Piso Madera' as name, 'reparacion-piso-madera' as slug, 31 as sort_order
  UNION ALL SELECT 'Barniz de Piso' as name, 'barniz-piso' as slug, 32 as sort_order
  UNION ALL SELECT 'Pisos de Vinilo / Linóleo' as name, 'pisos-vinilo-linoleo' as slug, 40 as sort_order
  UNION ALL SELECT 'Pisos de Hormigón' as name, 'pisos-hormigon' as slug, 50 as sort_order
  UNION ALL SELECT 'Alfombras / Tapetes' as name, 'alfombras-tapetes' as slug, 60 as sort_order
  UNION ALL SELECT 'Limpieza Alfombra' as name, 'limpieza-alfombra' as slug, 61 as sort_order
  UNION ALL SELECT 'Reparación / Reemplazo' as name, 'reparacion-reemplazo' as slug, 70 as sort_order
  UNION ALL SELECT 'Limpieza Profunda' as name, 'limpieza-profunda' as slug, 80 as sort_order
) v;

-- Subcategorías de ASCENSORES / ESCALERAS
INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, (SELECT id FROM categories WHERE name = 'Ascensores / Escaleras' AND parent_id IS NULL LIMIT 1), v.sort_order
FROM (
  SELECT 'Ascensores / Elevadores' as name, 'ascensores-elevadores' as slug, 10 as sort_order
  UNION ALL SELECT 'Mantenimiento Ascensor' as name, 'mto-ascensor' as slug, 11 as sort_order
  UNION ALL SELECT 'Reparación Ascensor' as name, 'reparacion-ascensor' as slug, 12 as sort_order
  UNION ALL SELECT 'Escaleras / Escalones' as name, 'escaleras-escalones' as slug, 20 as sort_order
  UNION ALL SELECT 'Reparación Escalera' as name, 'reparacion-escalera' as slug, 21 as sort_order
  UNION ALL SELECT 'Barandillas / Pasamanos' as name, 'barandillas-pasamanos' as slug, 30 as sort_order
  UNION ALL SELECT 'Reparación Pasamano' as name, 'reparacion-pasamano' as slug, 31 as sort_order
  UNION ALL SELECT 'Puertas de Ascensor' as name, 'puertas-ascensor' as slug, 40 as sort_order
  UNION ALL SELECT 'Reparación Puerta Ascensor' as name, 'reparacion-puerta-ascensor' as slug, 41 as sort_order
  UNION ALL SELECT 'Sistemas Hidráulicos' as name, 'sistemas-hidraulicos' as slug, 50 as sort_order
  UNION ALL SELECT 'Mantenimiento Preventivo' as name, 'mto-preventivo-escaleras' as slug, 60 as sort_order
  UNION ALL SELECT 'Inspección de Seguridad' as name, 'inspeccion-seguridad' as slug, 70 as sort_order
) v;

-- Subcategorías de SISTEMAS DE AGUA
INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, (SELECT id FROM categories WHERE name = 'Sistemas de Agua' AND parent_id IS NULL LIMIT 1), v.sort_order
FROM (
  SELECT 'Cisternas / Tanques de Almacenamiento' as name, 'cisternas-tanques-almacenamiento' as slug, 10 as sort_order
  UNION ALL SELECT 'Limpieza Cisterna' as name, 'limpieza-cisterna' as slug, 11 as sort_order
  UNION ALL SELECT 'Reparación Cisterna' as name, 'reparacion-cisterna' as slug, 12 as sort_order
  UNION ALL SELECT 'Bombas de Agua' as name, 'bombas-agua' as slug, 20 as sort_order
  UNION ALL SELECT 'Mantenimiento Bomba' as name, 'mto-bomba' as slug, 21 as sort_order
  UNION ALL SELECT 'Reparación Bomba' as name, 'reparacion-bomba' as slug, 22 as sort_order
  UNION ALL SELECT 'Presión de Agua' as name, 'presion-agua' as slug, 30 as sort_order
  UNION ALL SELECT 'Purificadores / Filtros' as name, 'purificadores-filtros' as slug, 40 as sort_order
  UNION ALL SELECT 'Cambio de Filtro Agua' as name, 'cambio-filtro-agua' as slug, 41 as sort_order
  UNION ALL SELECT 'Tuberías Principales' as name, 'tuberias-principales' as slug, 50 as sort_order
  UNION ALL SELECT 'Sistemas de Presión' as name, 'sistemas-presion' as slug, 60 as sort_order
  UNION ALL SELECT 'Calidad del Agua' as name, 'calidad-agua' as slug, 70 as sort_order
) v;

-- Subcategorías de DETECCIÓN DE INCENDIOS / SEGURIDAD
INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, (SELECT id FROM categories WHERE name = 'Detección de Incendios / Seguridad' AND parent_id IS NULL LIMIT 1), v.sort_order
FROM (
  SELECT 'Detectores de Humo' as name, 'detectores-humo' as slug, 10 as sort_order
  UNION ALL SELECT 'Instalación Detector' as name, 'instalacion-detector' as slug, 11 as sort_order
  UNION ALL SELECT 'Cambio de Batería Detector' as name, 'cambio-bateria-detector' as slug, 12 as sort_order
  UNION ALL SELECT 'Alarmas de Incendio' as name, 'alarmas-incendio' as slug, 20 as sort_order
  UNION ALL SELECT 'Prueba Alarma Incendio' as name, 'prueba-alarma-incendio' as slug, 21 as sort_order
  UNION ALL SELECT 'Extintores' as name, 'extintores' as slug, 30 as sort_order
  UNION ALL SELECT 'Recarga de Extintor' as name, 'recarga-extintor' as slug, 31 as sort_order
  UNION ALL SELECT 'Inspección Extintor' as name, 'inspeccion-extintor' as slug, 32 as sort_order
  UNION ALL SELECT 'Sistemas de Aspersores' as name, 'sistemas-aspersores' as slug, 40 as sort_order
  UNION ALL SELECT 'Prueba Aspersor' as name, 'prueba-aspersor' as slug, 41 as sort_order
  UNION ALL SELECT 'Rutas de Evacuación' as name, 'rutas-evacuacion' as slug, 50 as sort_order
  UNION ALL SELECT 'Señalización de Emergencia' as name, 'senalizacion-emergencia' as slug, 60 as sort_order
  UNION ALL SELECT 'Capacitación / Simulacros' as name, 'capacitacion-simulacros' as slug, 70 as sort_order
) v;

-- Subcategorías de MANTENIMIENTO GENERAL
INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, (SELECT id FROM categories WHERE name = 'Mantenimiento General' AND parent_id IS NULL LIMIT 1), v.sort_order
FROM (
  SELECT 'Control de Plagas / Desratización' as name, 'control-plagas-desratizacion' as slug, 10 as sort_order
  UNION ALL SELECT 'Fumigación Preventiva' as name, 'fumigacion-preventiva' as slug, 11 as sort_order
  UNION ALL SELECT 'Limpieza de Canaletas' as name, 'limpieza-canaletas' as slug, 20 as sort_order
  UNION ALL SELECT 'Limpieza de Ventilación' as name, 'limpieza-ventilacion' as slug, 30 as sort_order
  UNION ALL SELECT 'Limpieza de Ductos' as name, 'limpieza-ductos' as slug, 31 as sort_order
  UNION ALL SELECT 'Paisajismo / Jardines' as name, 'paisajismo-jardines' as slug, 40 as sort_order
  UNION ALL SELECT 'Poda de Árboles' as name, 'poda-arboles' as slug, 41 as sort_order
  UNION ALL SELECT 'Riego y Mantenimiento Jardín' as name, 'riego-mto-jardin' as slug, 42 as sort_order
  UNION ALL SELECT 'Limpieza de Alfombras' as name, 'limpieza-alfombras-general' as slug, 50 as sort_order
  UNION ALL SELECT 'Inspecciones Generales' as name, 'inspecciones-generales' as slug, 60 as sort_order
  UNION ALL SELECT 'Inspección Estructural' as name, 'inspeccion-estructural' as slug, 61 as sort_order
  UNION ALL SELECT 'Desinfección' as name, 'desinfeccion' as slug, 70 as sort_order
  UNION ALL SELECT 'Sanitización' as name, 'sanitizacion' as slug, 71 as sort_order
  UNION ALL SELECT 'Mantenimiento de Áreas Verdes' as name, 'mto-areas-verdes' as slug, 80 as sort_order
) v;

-- Subcategorías de EXTERIORES / ÁREAS COMUNES
INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, (SELECT id FROM categories WHERE name = 'Exteriores / Áreas Comunes' AND parent_id IS NULL LIMIT 1), v.sort_order
FROM (
  SELECT 'Fachada / Paredes Exteriores' as name, 'fachada-paredes-exteriores' as slug, 10 as sort_order
  UNION ALL SELECT 'Limpieza Fachada' as name, 'limpieza-fachada' as slug, 11 as sort_order
  UNION ALL SELECT 'Reparación Fachada' as name, 'reparacion-fachada' as slug, 12 as sort_order
  UNION ALL SELECT 'Techos / Azoteas' as name, 'techos-azoteas' as slug, 20 as sort_order
  UNION ALL SELECT 'Limpieza Azotea' as name, 'limpieza-azotea' as slug, 21 as sort_order
  UNION ALL SELECT 'Reparación Techo Azotea' as name, 'reparacion-techo-azotea' as slug, 22 as sort_order
  UNION ALL SELECT 'Impermeabilización' as name, 'impermeabilizacion' as slug, 23 as sort_order
  UNION ALL SELECT 'Canaletas / Drenaje Externo' as name, 'canaletas-drenaje-externo' as slug, 30 as sort_order
  UNION ALL SELECT 'Estacionamiento' as name, 'estacionamiento' as slug, 40 as sort_order
  UNION ALL SELECT 'Reparación Estacionamiento' as name, 'reparacion-estacionamiento' as slug, 41 as sort_order
  UNION ALL SELECT 'Pintura Estacionamiento' as name, 'pintura-estacionamiento' as slug, 42 as sort_order
  UNION ALL SELECT 'Accesos Externos' as name, 'accesos-externos' as slug, 50 as sort_order
  UNION ALL SELECT 'Zonas Verdes / Piscina' as name, 'zonas-verdes-piscina' as slug, 60 as sort_order
  UNION ALL SELECT 'Mantenimiento Piscina' as name, 'mto-piscina' as slug, 61 as sort_order
  UNION ALL SELECT 'Limpieza Piscina' as name, 'limpieza-piscina' as slug, 62 as sort_order
  UNION ALL SELECT 'Iluminación Externa' as name, 'iluminacion-externa' as slug, 70 as sort_order
  UNION ALL SELECT 'Señalización Exterior' as name, 'senalizacion-exterior' as slug, 80 as sort_order
) v;

-- PASO 4: VERIFICACIÓN FINAL
SELECT 'PASO 4: VERIFICACIÓN FINAL' as paso;

-- Mostrar estadísticas
SELECT 
  'Categorías Nivel 1 (Raíces):' as descripcion,
  COUNT(*) as cantidad
FROM categories 
WHERE sort_order >= 100 AND parent_id IS NULL
UNION ALL
SELECT 
  'Categorías Nivel 2 (Subcategorías):' as descripcion,
  COUNT(*) as cantidad
FROM categories 
WHERE sort_order >= 100 AND parent_id IS NOT NULL
UNION ALL
SELECT 
  'TOTAL CATEGORÍAS:' as descripcion,
  COUNT(*) as cantidad
FROM categories 
WHERE sort_order >= 100;

-- Verificar jerarquía
SELECT 
  c1.name as "Categoría Principal",
  COUNT(c2.id) as "# Subcategorías"
FROM categories c1
LEFT JOIN categories c2 ON c2.parent_id = c1.id
WHERE c1.sort_order >= 100 AND c1.parent_id IS NULL
GROUP BY c1.id, c1.name
ORDER BY c1.sort_order;

SELECT '✅ OPERACIÓN COMPLETADA EXITOSAMENTE' as resultado;
