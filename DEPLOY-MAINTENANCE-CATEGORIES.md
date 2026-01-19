## ⚠️ ACCIÓN REQUERIDA: Ejecutar SQL para Crear Categorías de Mantenimiento

### 🔧 Problema Resuelto
- ✅ Los usuarios estándar **NO verán** categorías de IT en tickets de mantenimiento
- ✅ Las categorías ahora están separadas por área (IT vs Mantenimiento)
- ✅ El filtrado se aplica automáticamente en el servidor
- ✅ **15 categorías de mantenimiento** con subcategorías detalladas para hoteles

### 📋 Cambios Realizados

#### 1. **Nuevas Categorías en BD** (archivo: `supabase/add-maintenance-categories.sql`)

Se agregaron 15 categorías raíz con estructura jerárquica completa para hoteles:

| # | Categoría | Sort Order | Subcategorías |
|---|-----------|-----------|---|
| 1 | **Climatización / HVAC** | 100 | Aire Central, Split, Calefacción, Ventilación, Filtros, Refrigerante, Preventivo |
| 2 | **Fontanería / Plomería** | 110 | Tuberías, Grifos, Sanitarios, Duchas, Desagües, Calentadores, Cisternas, Bombas, Válvulas |
| 3 | **Electricidad / Iluminación** | 120 | Iluminación, Focos LED, Enchufes, Interruptores, Circuitos, Paneles, Cableado, Generador, UPS |
| 4 | **Carpintería / Estructuras** | 130 | Puertas, Cerraduras, Marcos, Paredes, Estructuras Metálicas, Techos, Ventanas, Vidrios |
| 5 | **Pintura / Acabados** | 140 | Paredes, Cielos, Estructura Metálica, Selladores, Empapelado, Acabados, Restauración |
| 6 | **Mobiliario / Decoración** | 150 | Camas, Sofás, Mesas, Armarios, Cortinas, Espejos, Tapicería, Restauración |
| 7 | **Equipos de Cocina** | 160 | Refrigerador, Estufas, Microondas, Lavavajillas, Campana, Freidora, Cafetera |
| 8 | **Equipos de Lavandería** | 170 | Lavadoras, Secadoras, Planchas, Perchas, Vapor, Drenaje |
| 9 | **Sistemas de Seguridad** | 180 | Cámaras, Cerraduras Electrónicas, Control Acceso, Alarmas, Monitoreo, Backup |
| 10 | **Pisos / Revestimientos** | 190 | Cerámica, Mármol, Madera, Vinilo, Hormigón, Alfombras, Reparación, Limpieza |
| 11 | **Ascensores / Escaleras** | 200 | Ascensores, Escaleras, Barandillas, Puertas, Sistemas Hidráulicos, Mantenimiento, Inspección |
| 12 | **Sistemas de Agua** | 210 | Cisternas, Bombas, Presión, Purificadores, Tuberías, Sistemas Presión, Calidad |
| 13 | **Detección de Incendios / Seguridad** | 220 | Detectores Humo, Alarmas, Extintores, Aspersores, Evacuación, Señalización, Capacitación |
| 14 | **Mantenimiento General** | 230 | Control Plagas, Canaletas, Ventilación, Paisajismo, Alfombras, Inspecciones, Desinfección |
| 15 | **Exteriores / Áreas Comunes** | 240 | Fachada, Techos/Azoteas, Drenaje, Estacionamiento, Accesos, Zonas Verdes, Iluminación, Señalización |

#### 2. **Cambios en Frontend**
- `src/app/(app)/mantenimiento/tickets/new/page.tsx`: Filtra categorías con `sort_order >= 100`
- `src/app/(app)/tickets/new/page.tsx`: Filtra categorías según área (IT: `< 100`, Mantenimiento: `>= 100`)

### 🚀 Pasos para Completar

#### 1. Ir a Supabase Dashboard
1. Navega a: https://app.supabase.com/
2. Selecciona tu proyecto
3. Ve a **SQL Editor** → **New Query**

#### 2. Copiar y Ejecutar SQL
Copia el contenido COMPLETO de este archivo:
```
/home/jmosorioe/Documentos/ZIII-Hos/supabase/add-maintenance-categories.sql
```

Y pégalo en el **SQL Editor** de Supabase, luego:
1. Haz clic en **▶ Run** (o Ctrl+Enter)
2. Verifica que aparezca: "Categorías de Mantenimiento creadas:"
3. Deberías ver una tabla con las 15 nuevas categorías y sus subcategorías

### ✅ Validación Post-Deploy

#### En la BD:
```sql
-- Verificar que las categorías se crearon
SELECT name, parent_id, sort_order 
FROM categories 
WHERE sort_order >= 100 
ORDER BY sort_order, name;
```

**Resultado esperado:** 15 categorías raíz + ~110 subcategorías (aprox. 125 registros totales)

#### En la Aplicación:
1. **Crear Ticket de Mantenimiento**: `/mantenimiento/tickets/new`
   - ✅ Debe mostrar: Las 15 categorías anteriores
   - ❌ NO debe mostrar: Hardware, Software, Redes, Accesos

2. **Crear Ticket IT**: `/tickets/new?area=it`
   - ✅ Debe mostrar solo: Hardware, Software, Redes, Accesos
   - ❌ NO debe mostrar: Ninguna categoría de mantenimiento

### 🔄 Rollback (si es necesario)
Si necesitas revertir los cambios:
```sql
-- Eliminar categorías de mantenimiento
DELETE FROM categories 
WHERE sort_order >= 100;
```

---

**Nota**: Ejecuta el SQL **solo una vez**. Las migraciones usan `ON CONFLICT` para evitar duplicados.
