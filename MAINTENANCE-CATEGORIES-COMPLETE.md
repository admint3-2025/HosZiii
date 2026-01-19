## ✅ SOLUCIÓN COMPLETA: Categorías de Mantenimiento para Hoteles

### 🎯 Problema Original
- ❌ Usuarios estándar veían categorías de IT en lugar de mantenimiento
- ❌ Las categorías no estaban adecuadamente filtradas

### ✅ Solución Implementada

#### 1. **Backend - Separación de Categorías**
- Las categorías ahora usan `sort_order` para diferenciarse:
  - **IT**: `sort_order < 100` (Hardware, Software, Redes, Accesos)
  - **Mantenimiento**: `sort_order >= 100` (15 categorías principales)

#### 2. **Frontend - Filtrado Automático**
| Archivo | Cambio |
|---------|--------|
| [src/app/(app)/mantenimiento/tickets/new/page.tsx](src/app/(app)/mantenimiento/tickets/new/page.tsx) | Filtra solo categorías con `sort_order >= 100` |
| [src/app/(app)/tickets/new/page.tsx](src/app/(app)/tickets/new/page.tsx) | Filtra por área: IT (`< 100`) o Mantenimiento (`>= 100`) |

#### 3. **Base de Datos - 15 Categorías Principales con Subcategorías**

| # | Categoría | Sort Order | Subcategorías |
|---|-----------|-----------|---|
| 1 | **Climatización / HVAC** | 100 | 16 (Aire Central, Split, Calefacción, Ventilación, Filtros, etc.) |
| 2 | **Fontanería / Plomería** | 110 | 23 (Tuberías, Grifos, Sanitarios, Duchas, Desagües, Calentadores, etc.) |
| 3 | **Electricidad / Iluminación** | 120 | 22 (Iluminación, LED, Enchufes, Interruptores, Circuitos, Generador, etc.) |
| 4 | **Carpintería / Estructuras** | 130 | 20 (Puertas, Cerraduras, Marcos, Paredes, Techos, Ventanas, etc.) |
| 5 | **Pintura / Acabados** | 140 | 10 (Paredes, Cielos, Selladores, Empapelado, etc.) |
| 6 | **Mobiliario / Decoración** | 150 | 16 (Camas, Sofás, Mesas, Armarios, Cortinas, etc.) |
| 7 | **Equipos de Cocina** | 160 | 18 (Refrigerador, Estufas, Microondas, Lavavajillas, Campana, etc.) |
| 8 | **Equipos de Lavandería** | 170 | 11 (Lavadoras, Secadoras, Planchas, etc.) |
| 9 | **Sistemas de Seguridad** | 180 | 13 (Cámaras, Cerraduras Electrónicas, Alarmas, etc.) |
| 10 | **Pisos / Revestimientos** | 190 | 16 (Cerámica, Mármol, Madera, Vinilo, Alfombras, etc.) |
| 11 | **Ascensores / Escaleras** | 200 | 11 (Ascensores, Escaleras, Barandillas, Puertas, etc.) |
| 12 | **Sistemas de Agua** | 210 | 11 (Cisternas, Bombas, Presión, Purificadores, etc.) |
| 13 | **Detección de Incendios / Seguridad** | 220 | 13 (Detectores, Alarmas, Extintores, Aspersores, etc.) |
| 14 | **Mantenimiento General** | 230 | 14 (Plagas, Canaletas, Jardines, Desinfección, etc.) |
| 15 | **Exteriores / Áreas Comunes** | 240 | 17 (Fachada, Techos, Estacionamiento, Piscina, etc.) |

**TOTAL: 15 categorías nivel 1 + ~200 subcategorías nivel 2**

---

## 🚀 PASOS PARA COMPLETAR LA INSTALACIÓN

### Paso 1: Ejecutar SQL en Supabase
1. Navega a: **https://app.supabase.com/**
2. Selecciona tu proyecto
3. Ve a **SQL Editor** → **New Query**
4. Copia TODO el contenido de:
   ```
   /home/jmosorioe/Documentos/ZIII-Hos/supabase/add-maintenance-categories.sql
   ```
5. Pega en Supabase SQL Editor
6. Haz clic en **▶ Run** (o Ctrl+Enter)

### Paso 2: Verificar Resultado
Deberías ver el mensaje:
```
✅ CATEGORÍAS DE MANTENIMIENTO CREADAS EXITOSAMENTE
```

Y una tabla mostrando:
```
Nivel 1 (Raíz) | Nivel 2 (Subcategorías) | Total
15             | ~200                    | ~215
```

### Paso 3: Probar en la Aplicación

#### Test 1: Crear Ticket Mantenimiento
**URL:** `/mantenimiento/tickets/new`
- ✅ **Debe mostrar:** Las 15 categorías principales de mantenimiento
- ✅ **Ejemplo:** Climatización, Fontanería, Electricidad, Carpintería, etc.
- ❌ **NO debe mostrar:** Hardware, Software, Redes, Accesos

#### Test 2: Crear Ticket IT
**URL:** `/tickets/new?area=it`
- ✅ **Debe mostrar:** Solo Hardware, Software, Redes, Accesos
- ❌ **NO debe mostrar:** Ninguna categoría de mantenimiento

---

## 🔧 Solución Técnica

### ¿Cómo funciona?

**Estructura de Categorías (3 niveles):**
```
sort_order < 100 (IT)
├── Hardware (1, parent_id=NULL)
│   ├── PC / Laptop (parent_id=Hardware.id)
│   ├── Periféricos
│   └── ...
├── Software
└── ...

sort_order >= 100 (Mantenimiento)
├── Climatización (100, parent_id=NULL)
│   ├── Aire Central (parent_id=Climatización.id)
│   ├── Split
│   └── ...
├── Fontanería (110)
│   ├── Tuberías (parent_id=Fontanería.id)
│   └── ...
└── ... (13 categorías más)
```

### Filtrado en Frontend
```typescript
// Mantenimiento
const maintenanceCategories = categories.filter(
  (c) => (c.sort_order ?? 0) >= 100
)

// IT
const itCategories = categories.filter(
  (c) => (c.sort_order ?? 0) < 100
)
```

---

## ✅ Validación Post-Deploy

```sql
-- Verificar estructura
SELECT 
  COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as "Categorías Raíz",
  COUNT(*) as "Total Categorías"
FROM categories 
WHERE sort_order >= 100;

-- Deberías ver: Categorías Raíz: 15, Total: ~215
```

---

## 🔄 Rollback (si es necesario)
```sql
DELETE FROM categories WHERE sort_order >= 100;
```

---

## 📝 Notas
- ✅ El SQL usa `ON CONFLICT ... DO NOTHING` para evitar duplicados
- ✅ Todas las subcategorías están correctamente enlazadas a sus padres
- ✅ Cada categoría tiene un `slug` único para URLs
- ✅ El `sort_order` mantiene el orden de visualización

**Estado:** ✅ LISTO PARA DEPLOY
