# 🏭 Marcas para Activos de Mantenimiento

## 📋 Resumen

Se ha expandido el catálogo de marcas para incluir marcas relevantes para activos de mantenimiento, no solo IT. Ahora el sistema soporta marcas de HVAC, electrodomésticos, plomería, generadores, y más.

---

## ✅ Cambios Realizados

### 1. **BrandSelector Actualizado**
   - **Archivo**: `/src/components/BrandSelector.tsx`
   - Se agregaron nuevas categorías organizadas en grupos:
     - **Tecnología / IT**: Computadoras, Impresoras, Redes, etc.
     - **HVAC / Climatización**: Aire Acondicionado, Ventilación, Refrigeración, Calefacción
     - **Cocina y Lavandería**: Electrodomésticos, Equipos de Lavandería, Refrigeradores
     - **Infraestructura**: Plomería, Eléctrico, Generadores, Elevadores
     - **Seguridad y Otros**: Seguridad, Mobiliario, Limpieza, Vehículos

### 2. **Catálogo de Marcas Expandido**
   - **Archivo**: `/supabase/seed-brands-maintenance.sql`
   - Más de 160 marcas nuevas agregadas, incluyendo:
     - **HVAC**: Carrier, Trane, York, Daikin, Mitsubishi Electric, etc.
     - **Electrodomésticos**: Whirlpool, GE Appliances, Frigidaire, Electrolux, etc.
     - **Lavandería**: Speed Queen, Maytag, Dexter, Unimac, etc.
     - **Plomería**: Kohler, Moen, Delta, Grundfos, A.O. Smith, etc.
     - **Generadores**: Caterpillar, Cummins, Generac, Kohler Power, etc.
     - **Eléctrico**: Schneider Electric, Siemens, ABB, Eaton, etc.
     - **Elevadores**: Otis, Schindler, KONE, ThyssenKrupp, etc.
     - **Seguridad**: Honeywell, Bosch, Axis, Hikvision, etc.
     - **Mobiliario**: Herman Miller, Steelcase, Knoll, etc.
     - **Limpieza**: Tennant, Karcher, Nilfisk, etc.
     - **Vehículos**: Toyota, Ford, Chevrolet, Club Car, etc.

### 3. **Script de Aplicación**
   - **Archivo**: `/scripts/apply-brands-maintenance.ps1`
   - Script PowerShell interactivo para aplicar las marcas
   - Opciones:
     - Aplicar via SSH al servidor
     - Copiar SQL al portapapeles para Supabase Studio

---

## 🚀 Cómo Aplicar las Marcas

### Opción A: PowerShell Script (Recomendado)

```powershell
cd /media/jmosorioe/DEV/deV/ZIII-helpdesk
.\scripts\apply-brands-maintenance.ps1
```

### Opción B: SSH Directo

```bash
cd /media/jmosorioe/DEV/deV/ZIII-helpdesk
ssh root@192.168.31.240 "cd /opt/helpdesk && docker exec -i supabase-db psql -U postgres -d postgres" < supabase/seed-brands-maintenance.sql
```

### Opción C: Supabase Studio

1. Abre [Supabase Studio](http://192.168.31.240:8000)
2. Ve a **SQL Editor**
3. Copia el contenido de `supabase/seed-brands-maintenance.sql`
4. Pega y ejecuta con **Run**

---

## 📊 Categorías de Marcas Disponibles

| Categoría | Ejemplos de Marcas | Cantidad Aproximada |
|-----------|-------------------|---------------------|
| **Aire Acondicionado** | Carrier, Trane, York, Daikin | 14 |
| **Refrigeración** | True, Turbo Air, Copeland | 5 |
| **Calefacción** | Cleaver-Brooks, Bosch, Lochinvar | 5 |
| **Electrodomésticos Cocina** | Whirlpool, GE, Hobart, Rational | 13 |
| **Refrigeradores** | Sub-Zero, Marvel, U-Line | 3 |
| **Equipos de Lavandería** | Speed Queen, Maytag, Girbau | 9 |
| **Plomería** | Kohler, Moen, Delta, Toto | 21 |
| **Generadores** | Caterpillar, Cummins, Generac | 8 |
| **Eléctrico** | Schneider, Siemens, ABB | 14 |
| **Elevadores** | Otis, Schindler, KONE | 6 |
| **Seguridad** | Honeywell, Bosch, Hikvision | 11 |
| **Mobiliario** | Herman Miller, Steelcase | 5 |
| **Limpieza** | Tennant, Karcher, Nilfisk | 7 |
| **Vehículos** | Toyota, Ford, Club Car | 13 |

**Total**: ~160 marcas nuevas

---

## 🎯 Uso en la Aplicación

### Al Crear un Activo:

1. Selecciona la **Categoría** del activo (ej: HVAC, Cocina, etc.)
2. Selecciona el **Tipo de Activo** específico
3. En el campo **Marca**:
   - Las marcas se muestran **agrupadas por categoría**
   - Puedes seleccionar una marca existente
   - O hacer clic en **"+ Crear nueva marca"**
4. Al crear una marca nueva:
   - Ingresa el nombre
   - Selecciona la categoría apropiada del menú desplegable
   - Se guardará automáticamente

### Ejemplo: Crear Aire Acondicionado

```
Categoría: HVAC
Tipo: Aire Acondicionado
Marca: Carrier (o crear nueva si no existe)
Modelo: 24ACC636A003
```

---

## 🔍 Verificar Instalación

Después de aplicar el script SQL:

```sql
-- Ver total de marcas
SELECT COUNT(*) as total FROM brands WHERE is_active = true;

-- Ver marcas por categoría
SELECT 
  category, 
  COUNT(*) as cantidad
FROM brands 
WHERE is_active = true
GROUP BY category
ORDER BY cantidad DESC;

-- Ver marcas de HVAC
SELECT name, category 
FROM brands 
WHERE category IN ('Aire Acondicionado', 'Refrigeración', 'Calefacción', 'Ventilación')
  AND is_active = true
ORDER BY category, name;
```

---

## 📝 Notas

- ✅ Todas las marcas se insertan con `ON CONFLICT (name) DO NOTHING` para evitar duplicados
- ✅ Compatible con el sistema de auditoría existente
- ✅ Las marcas inactivas (`is_active = false`) no aparecen en el selector
- ✅ Se mantiene compatibilidad con marcas IT existentes
- ✅ El campo `category` es opcional pero recomendado para organización

---

## 🛠️ Mantenimiento

### Agregar Nueva Marca Manualmente

```sql
INSERT INTO brands (name, category, description, is_active) 
VALUES ('Nombre Marca', 'Categoría', 'Descripción opcional', true)
ON CONFLICT (name) DO NOTHING;
```

### Desactivar Marca

```sql
UPDATE brands 
SET is_active = false 
WHERE name = 'Nombre de la Marca';
```

### Cambiar Categoría

```sql
UPDATE brands 
SET category = 'Nueva Categoría' 
WHERE name = 'Nombre de la Marca';
```

---

## 🎉 Resultado Final

Con estos cambios, el sistema ahora puede gestionar **activos de cualquier categoría** con marcas apropiadas:

- ✅ IT / Tecnología
- ✅ HVAC / Climatización  
- ✅ Cocina y Lavandería
- ✅ Plomería e Infraestructura
- ✅ Generadores y Energía
- ✅ Seguridad
- ✅ Mobiliario
- ✅ Limpieza
- ✅ Vehículos
- ✅ Y más...

**¡El sistema está listo para gestionar activos de mantenimiento general! 🎊**
