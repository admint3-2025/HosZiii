-- =====================================================
-- Seed: Marcas para Activos de Mantenimiento
-- Descripción: Marcas adicionales para HVAC, Cocina, Lavandería, etc.
-- Fecha: 2026-01-14
-- =====================================================

-- Insertar marcas para mantenimiento (si no existen)
INSERT INTO brands (name, category, description, is_active) VALUES
  -- HVAC / Climatización
  ('Carrier', 'Aire Acondicionado', 'Sistemas de aire acondicionado y climatización', true),
  ('Trane', 'Aire Acondicionado', 'Sistemas HVAC comerciales e industriales', true),
  ('York', 'Aire Acondicionado', 'Aires acondicionados y sistemas HVAC', true),
  ('Daikin', 'Aire Acondicionado', 'Aires acondicionados residenciales y comerciales', true),
  ('Mitsubishi Electric', 'Aire Acondicionado', 'Sistemas de climatización inverter', true),
  ('Fujitsu General', 'Aire Acondicionado', 'Aires acondicionados tipo split', true),
  ('Rheem', 'Aire Acondicionado', 'Calentadores de agua y HVAC', true),
  ('Goodman', 'Aire Acondicionado', 'Sistemas de climatización residenciales', true),
  ('Lennox', 'Aire Acondicionado', 'Sistemas HVAC de alta eficiencia', true),
  ('Friedrich', 'Aire Acondicionado', 'Aires acondicionados de ventana y portátiles', true),
  ('Gree', 'Aire Acondicionado', 'Aires acondicionados inverter', true),
  ('Haier', 'Aire Acondicionado', 'Aires acondicionados y electrodomésticos', true),
  ('Midea', 'Aire Acondicionado', 'Aires acondicionados y climatización', true),
  ('Hisense', 'Aire Acondicionado', 'Aires acondicionados inverter', true),
  
  -- Refrigeración y Ventilación
  ('True', 'Refrigeración', 'Refrigeradores comerciales', true),
  ('Turbo Air', 'Refrigeración', 'Equipos de refrigeración comercial', true),
  ('Hussmann', 'Refrigeración', 'Sistemas de refrigeración para supermercados', true),
  ('Copeland', 'Refrigeración', 'Compresores para refrigeración', true),
  ('Bohn', 'Refrigeración', 'Evaporadores y condensadores', true),
  
  -- Calderas y Calefacción
  ('Cleaver-Brooks', 'Calefacción', 'Calderas industriales y comerciales', true),
  ('Bosch Thermotechnology', 'Calefacción', 'Calderas y sistemas de calefacción', true),
  ('Weil-McLain', 'Calefacción', 'Calderas de agua caliente y vapor', true),
  ('Burnham', 'Calefacción', 'Calderas residenciales y comerciales', true),
  ('Lochinvar', 'Calefacción', 'Calderas de alta eficiencia', true),
  
  -- Electrodomésticos de Cocina
  ('Whirlpool', 'Electrodomésticos Cocina', 'Electrodomésticos y equipos de cocina', true),
  ('GE Appliances', 'Electrodomésticos Cocina', 'Electrodomésticos de cocina y lavandería', true),
  ('Frigidaire', 'Electrodomésticos Cocina', 'Refrigeradores, estufas y hornos', true),
  ('KitchenAid', 'Electrodomésticos Cocina', 'Electrodomésticos premium de cocina', true),
  ('Electrolux', 'Electrodomésticos Cocina', 'Electrodomésticos profesionales', true),
  ('Mabe', 'Electrodomésticos Cocina', 'Electrodomésticos mexicanos', true),
  ('Acros', 'Electrodomésticos Cocina', 'Estufas y hornos industriales', true),
  ('Viking', 'Electrodomésticos Cocina', 'Equipos de cocina profesionales', true),
  ('Wolf', 'Electrodomésticos Cocina', 'Equipos de cocina de alta gama', true),
  ('Vulcan', 'Electrodomésticos Cocina', 'Equipos de cocina comerciales', true),
  ('Hobart', 'Electrodomésticos Cocina', 'Equipos de cocina comercial e industrial', true),
  ('Rational', 'Electrodomésticos Cocina', 'Hornos combinados profesionales', true),
  ('Alto-Shaam', 'Electrodomésticos Cocina', 'Equipos de cocción y calentamiento', true),
  
  -- Refrigeradores
  ('Sub-Zero', 'Refrigeradores', 'Refrigeradores premium empotrados', true),
  ('Marvel', 'Refrigeradores', 'Refrigeradores compactos premium', true),
  ('U-Line', 'Refrigeradores', 'Refrigeradores bajo cubierta', true),
  
  -- Lavandería
  ('Speed Queen', 'Equipos de Lavandería', 'Lavadoras y secadoras comerciales', true),
  ('Maytag', 'Equipos de Lavandería', 'Lavadoras y secadoras robustas', true),
  ('Dexter', 'Equipos de Lavandería', 'Equipos de lavandería comercial', true),
  ('Unimac', 'Equipos de Lavandería', 'Lavadoras y secadoras industriales', true),
  ('Huebsch', 'Equipos de Lavandería', 'Equipos de lavandería comercial', true),
  ('Girbau', 'Equipos de Lavandería', 'Equipos de lavandería industrial', true),
  ('Primus', 'Equipos de Lavandería', 'Lavadoras y secadoras industriales', true),
  ('Continental Girbau', 'Equipos de Lavandería', 'Equipos de lavandería industrial', true),
  ('Alliance Laundry', 'Equipos de Lavandería', 'Equipos de lavandería comercial', true),
  
  -- Plomería
  ('Kohler', 'Plomería', 'Accesorios y equipos de baño', true),
  ('American Standard', 'Plomería', 'Sanitarios y accesorios de baño', true),
  ('Moen', 'Plomería', 'Grifería y accesorios de baño', true),
  ('Delta Faucet', 'Plomería', 'Grifos y accesorios de cocina/baño', true),
  ('Grohe', 'Plomería', 'Grifería premium', true),
  ('Hansgrohe', 'Plomería', 'Grifería y sistemas de ducha', true),
  ('Toto', 'Plomería', 'Sanitarios de alta tecnología', true),
  ('Roca', 'Plomería', 'Sanitarios y accesorios de baño', true),
  ('Sloan', 'Plomería', 'Válvulas y sistemas de descarga', true),
  ('Watts', 'Plomería', 'Válvulas y componentes de plomería', true),
  ('Nibco', 'Plomería', 'Válvulas y conexiones', true),
  
  -- Bombas
  ('Grundfos', 'Plomería', 'Bombas para agua y sistemas hidráulicos', true),
  ('Goulds', 'Plomería', 'Bombas industriales', true),
  ('Pentair', 'Plomería', 'Bombas y sistemas de filtración', true),
  ('Armstrong', 'Plomería', 'Bombas circuladoras', true),
  ('Bell & Gossett', 'Plomería', 'Bombas y equipos hidronic', true),
  
  -- Calentadores de Agua
  ('A.O. Smith', 'Plomería', 'Calentadores de agua residenciales y comerciales', true),
  ('Bradford White', 'Plomería', 'Calentadores de agua', true),
  ('State Water Heaters', 'Plomería', 'Calentadores de agua', true),
  ('Rinnai', 'Plomería', 'Calentadores de agua sin tanque', true),
  ('Noritz', 'Plomería', 'Calentadores de agua instantáneos', true),
  
  -- Generadores y Energía
  ('Caterpillar', 'Generadores', 'Generadores industriales de respaldo', true),
  ('Cummins', 'Generadores', 'Generadores diesel y de gas', true),
  ('Kohler Power', 'Generadores', 'Generadores residenciales y comerciales', true),
  ('Generac', 'Generadores', 'Generadores de respaldo', true),
  ('Onan', 'Generadores', 'Generadores portátiles e industriales', true),
  ('MTU', 'Generadores', 'Generadores de alta potencia', true),
  ('Perkins', 'Generadores', 'Motores y generadores', true),
  ('Detroit Diesel', 'Generadores', 'Motores diesel para generación', true),
  
  -- Eléctrico
  ('Schneider Electric', 'Eléctrico', 'Tableros y componentes eléctricos', true),
  ('Siemens', 'Eléctrico', 'Equipos eléctricos industriales', true),
  ('ABB', 'Eléctrico', 'Automatización y equipos eléctricos', true),
  ('Eaton', 'Eléctrico', 'Equipos de distribución eléctrica', true),
  ('Square D', 'Eléctrico', 'Tableros y breakers', true),
  ('General Electric', 'Eléctrico', 'Equipos eléctricos industriales', true),
  ('Leviton', 'Eléctrico', 'Interruptores y tomacorrientes', true),
  ('Legrand', 'Eléctrico', 'Soluciones eléctricas y de red', true),
  
  -- Iluminación
  ('Philips', 'Eléctrico', 'Iluminación LED y sistemas de control', true),
  ('GE Lighting', 'Eléctrico', 'Lámparas y luminarias', true),
  ('Osram', 'Eléctrico', 'Iluminación profesional', true),
  ('Lithonia', 'Eléctrico', 'Luminarias comerciales', true),
  ('Cooper Lighting', 'Eléctrico', 'Iluminación comercial e industrial', true),
  ('Acuity Brands', 'Eléctrico', 'Soluciones de iluminación', true),
  
  -- Elevadores
  ('Otis', 'Elevadores', 'Elevadores y escaleras eléctricas', true),
  ('Schindler', 'Elevadores', 'Elevadores y escaleras mecánicas', true),
  ('KONE', 'Elevadores', 'Elevadores y puertas automáticas', true),
  ('ThyssenKrupp', 'Elevadores', 'Elevadores y sistemas de movilidad', true),
  ('Mitsubishi Electric Elevators', 'Elevadores', 'Elevadores de alta velocidad', true),
  ('Fujitec', 'Elevadores', 'Elevadores y escaleras', true),
  
  -- Seguridad
  ('Honeywell Security', 'Seguridad', 'Sistemas de seguridad y control de acceso', true),
  ('Bosch Security', 'Seguridad', 'Cámaras y sistemas de alarma', true),
  ('Axis Communications', 'Seguridad', 'Cámaras IP de vigilancia', true),
  ('Hikvision', 'Seguridad', 'Sistemas de videovigilancia', true),
  ('Dahua', 'Seguridad', 'Cámaras de seguridad', true),
  ('Avigilon', 'Seguridad', 'Sistemas de video analítico', true),
  ('Simplex', 'Seguridad', 'Sistemas contra incendios', true),
  ('Notifier', 'Seguridad', 'Paneles de alarma contra incendios', true),
  ('Edwards', 'Seguridad', 'Sistemas de detección de incendios', true),
  ('Kidde', 'Seguridad', 'Detectores de humo y CO', true),
  ('System Sensor', 'Seguridad', 'Detectores de incendios', true),
  
  -- Mobiliario
  ('Herman Miller', 'Mobiliario', 'Muebles de oficina ergonómicos', true),
  ('Steelcase', 'Mobiliario', 'Mobiliario de oficina', true),
  ('Knoll', 'Mobiliario', 'Muebles de diseño para oficinas', true),
  ('HON', 'Mobiliario', 'Mobiliario de oficina', true),
  ('Haworth', 'Mobiliario', 'Muebles de oficina y espacios de trabajo', true),
  
  -- Limpieza
  ('Tennant', 'Limpieza', 'Equipos de limpieza industrial', true),
  ('Karcher', 'Limpieza', 'Equipos de limpieza y lavado', true),
  ('Nilfisk', 'Limpieza', 'Aspiradoras y equipos de limpieza industrial', true),
  ('Clarke', 'Limpieza', 'Máquinas de limpieza de pisos', true),
  ('Advance', 'Limpieza', 'Equipos de limpieza comercial', true),
  ('Windsor', 'Limpieza', 'Equipos de limpieza profesional', true),
  ('Rubbermaid Commercial', 'Limpieza', 'Productos de limpieza comercial', true),
  
  -- Vehículos
  ('Toyota', 'Vehículos', 'Vehículos y montacargas', true),
  ('Honda', 'Vehículos', 'Automóviles y motocicletas', true),
  ('Ford', 'Vehículos', 'Vehículos comerciales y camionetas', true),
  ('Chevrolet', 'Vehículos', 'Automóviles y camionetas', true),
  ('Nissan', 'Vehículos', 'Automóviles y vehículos comerciales', true),
  ('Mazda', 'Vehículos', 'Automóviles', true),
  ('Volkswagen', 'Vehículos', 'Automóviles y vehículos comerciales', true),
  ('Mercedes-Benz', 'Vehículos', 'Vehículos premium', true),
  ('Hyundai', 'Vehículos', 'Automóviles', true),
  ('Kia', 'Vehículos', 'Automóviles', true),
  ('Club Car', 'Vehículos', 'Carritos de golf', true),
  ('E-Z-GO', 'Vehículos', 'Vehículos utilitarios eléctricos', true),
  ('Yamaha', 'Vehículos', 'Carritos de golf y vehículos utilitarios', true)
  
ON CONFLICT (name) DO NOTHING;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Marcas de mantenimiento insertadas exitosamente';
END $$;
