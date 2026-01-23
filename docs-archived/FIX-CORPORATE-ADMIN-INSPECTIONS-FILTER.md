# FIX: Corporate Admin Viendo Todas las Inspecciones

## 🐛 Problema Reportado

Un usuario con rol `corporate_admin` estaba viendo **TODAS** las inspecciones de **TODOS** los departamentos, incluso aquellos que no tenía asignados en su perfil (campo `allowed_departments`).

### Ejemplo del Problema

Usuario: **Max Baby**
- Rol: `ADMIN CORPORATIVO` (corporate_admin)
- Departamentos asignados: `["ESPECIALISTA EN SEO"]` (o posiblemente vacío/null)
- **Problema:** Veía inspecciones de `RECURSOS HUMANOS`, `GSH`, `MANTENIMIENTO`, etc.

## 🔍 Causa Raíz

Las políticas RLS (Row Level Security) en Supabase estaban configuradas con una lógica que permitía a `corporate_admin` ver todas las inspecciones sin validar el campo `allowed_departments`:

```sql
-- POLÍTICA INCORRECTA (old)
CREATE POLICY "inspections_rrhh_select_policy"
  ON inspections_rrhh FOR SELECT
  USING (
    (SELECT role::text FROM profiles WHERE id = auth.uid()) IN ('admin', 'corporate_admin')
    OR location_id IN (SELECT location_id FROM user_locations WHERE user_id = auth.uid())
  );
```

Esta política trataba a `corporate_admin` igual que `admin`, dándole acceso total.

## ✅ Solución Implementada

Se aplicó la política correcta que utiliza la función `user_can_access_department()` para validar los departamentos permitidos:

```sql
-- POLÍTICA CORRECTA (new)
CREATE POLICY "Users can view inspections from their departments"
  ON inspections_rrhh FOR SELECT
  USING (
    -- Admin puede ver TODO
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR
    -- Corporate_admin SOLO ve inspecciones de sus departamentos permitidos
    (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'corporate_admin'
      )
      AND
      user_can_access_department(auth.uid(), department)
    )
    OR
    -- Usuarios normales SOLO sus ubicaciones asignadas
    (
      location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
      AND
      NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'corporate_admin')
      )
    )
  );
```

### Función `user_can_access_department()`

Esta función valida si un usuario puede acceder a un departamento específico:

```sql
CREATE OR REPLACE FUNCTION user_can_access_department(
  p_user_id UUID,
  p_department TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_allowed_departments TEXT[];
BEGIN
  -- Obtener rol y departamentos permitidos
  SELECT role, allowed_departments
  INTO v_role, v_allowed_departments
  FROM profiles
  WHERE id = p_user_id;
  
  -- Si es admin: acceso total
  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Si es corporate_admin
  IF v_role = 'corporate_admin' THEN
    -- Sin restricción (NULL o array vacío) = acceso a TODOS los departamentos
    IF v_allowed_departments IS NULL OR array_length(v_allowed_departments, 1) IS NULL THEN
      RETURN TRUE;
    END IF;
    
    -- Con restricción = verificar si el departamento está en la lista
    RETURN p_department = ANY(v_allowed_departments);
  END IF;
  
  -- Otros roles NO tienen acceso corporativo
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 📋 Archivos Creados/Modificados

### Nuevos Archivos

1. **`supabase/fix-corporate-admin-department-filter.sql`**
   - Migración SQL que aplica la política correcta
   - Incluye validación de la función `user_can_access_department()`

2. **`scripts/apply-corporate-admin-department-filter.ps1`**
   - Script PowerShell para aplicar la migración
   - Con instrucciones claras y validaciones

3. **`FIX-CORPORATE-ADMIN-INSPECTIONS-FILTER.md`** (este archivo)
   - Documentación del problema y solución

## 🚀 Cómo Aplicar el Fix

### Opción 1: Usando el script PowerShell

```powershell
cd scripts
.\apply-corporate-admin-department-filter.ps1
```

El script te pedirá:
- Project Reference de Supabase
- Contraseña de la base de datos

### Opción 2: Manualmente en SQL Editor

1. Ve a: `https://supabase.com/dashboard/project/[TU_PROJECT_ID]/sql/new`
2. Copia el contenido de `supabase/fix-corporate-admin-department-filter.sql`
3. Pégalo y ejecuta
4. Verifica que veas el mensaje: ✅ Política de filtrado por departamento aplicada correctamente

## 🧪 Cómo Probar que Funciona

### Antes del Fix
```
Usuario: corporate_admin con allowed_departments = ['RECURSOS HUMANOS']
Bandeja de inspecciones: Ve inspecciones de TODOS los departamentos ❌
```

### Después del Fix
```
Usuario: corporate_admin con allowed_departments = ['RECURSOS HUMANOS']
Bandeja de inspecciones: SOLO ve inspecciones de RECURSOS HUMANOS ✅
```

### Pasos de Prueba

1. **Configurar usuario de prueba:**
   ```sql
   -- Actualizar departamentos permitidos
   UPDATE profiles 
   SET allowed_departments = ARRAY['RECURSOS HUMANOS']
   WHERE email = 'max@empresa.com';
   ```

2. **Iniciar sesión como corporate_admin**

3. **Ir a "Bandeja de inspecciones"** (`/inspections`)

4. **Verificar que solo aparecen inspecciones de departamentos permitidos:**
   - ✅ Ver: Inspecciones de "RECURSOS HUMANOS"
   - ❌ NO ver: Inspecciones de "GSH", "MANTENIMIENTO", "SISTEMAS", etc.

5. **Verificar con diferentes configuraciones:**

   a) **Sin restricción (acceso total):**
   ```sql
   UPDATE profiles 
   SET allowed_departments = NULL
   WHERE email = 'max@empresa.com';
   -- Resultado: Ve TODOS los departamentos
   ```

   b) **Con múltiples departamentos:**
   ```sql
   UPDATE profiles 
   SET allowed_departments = ARRAY['RECURSOS HUMANOS', 'GSH']
   WHERE email = 'max@empresa.com';
   -- Resultado: Ve SOLO RECURSOS HUMANOS y GSH
   ```

   c) **Con array vacío (acceso total):**
   ```sql
   UPDATE profiles 
   SET allowed_departments = ARRAY[]::text[]
   WHERE email = 'max@empresa.com';
   -- Resultado: Ve TODOS los departamentos
   ```

## 📊 Comportamiento por Rol

| Rol | Comportamiento | Filtrado |
|-----|----------------|----------|
| `admin` | Ve **TODAS** las inspecciones | ❌ Sin filtro |
| `corporate_admin` con `allowed_departments = NULL` | Ve **TODAS** las inspecciones | ❌ Sin filtro |
| `corporate_admin` con `allowed_departments = []` (vacío) | Ve **TODAS** las inspecciones | ❌ Sin filtro |
| `corporate_admin` con `allowed_departments = ['RRHH']` | Ve **SOLO** inspecciones de RRHH | ✅ Con filtro |
| `corporate_admin` con `allowed_departments = ['RRHH', 'GSH']` | Ve **SOLO** RRHH y GSH | ✅ Con filtro |
| Usuarios normales (`supervisor`, `technician`, etc.) | Solo sus ubicaciones asignadas | ✅ Por ubicación |

## 🔐 Impacto en Seguridad

### Antes del Fix ⚠️
- **Fuga de información**: Corporate admins veían inspecciones que no deberían
- **Violación de privacidad**: Acceso no autorizado a datos de otros departamentos
- **No cumplimiento**: El sistema no respetaba los permisos configurados

### Después del Fix ✅
- **Acceso controlado**: Solo ven lo que tienen permitido
- **Cumplimiento de permisos**: Respeta la configuración de `allowed_departments`
- **Auditoría clara**: El comportamiento es predecible y documentado

## 🛠️ Prerequisitos

La función `user_can_access_department()` debe existir en la base de datos. Si no existe:

```bash
# Aplicar primero la migración de departamentos permitidos
cd scripts
.\scripts\apply-supabase-sql.mjs ../supabase/add-allowed-departments-to-profiles.sql
```

O ejecutar manualmente: `supabase/add-allowed-departments-to-profiles.sql`

## 📝 Consultas SQL Útiles

### Ver configuración de un usuario
```sql
SELECT 
  id,
  full_name,
  email,
  role,
  allowed_departments,
  CASE 
    WHEN role = 'admin' THEN '✅ Acceso total (Admin)'
    WHEN role = 'corporate_admin' AND allowed_departments IS NULL 
      THEN '✅ Acceso a TODOS los departamentos corporativos'
    WHEN role = 'corporate_admin' AND array_length(allowed_departments, 1) IS NULL
      THEN '✅ Acceso a TODOS los departamentos corporativos (array vacío)'
    WHEN role = 'corporate_admin' 
      THEN '🔒 Acceso restringido a: ' || array_to_string(allowed_departments, ', ')
    ELSE '❌ SIN acceso corporativo'
  END as nivel_acceso
FROM profiles
WHERE email = 'max@empresa.com';
```

### Ver inspecciones que un usuario puede ver
```sql
-- Ejecutar logueado como el usuario en cuestión
SELECT 
  id,
  property_code,
  property_name,
  department,
  inspector_name,
  status,
  inspection_date
FROM inspections_rrhh
ORDER BY inspection_date DESC
LIMIT 20;
```

### Probar la función manualmente
```sql
-- Verificar si un usuario puede acceder a un departamento
SELECT user_can_access_department(
  '00000000-0000-0000-0000-000000000000'::uuid,  -- ID del usuario
  'RECURSOS HUMANOS'                              -- Departamento
);
-- Resultado: true o false
```

## 🔄 Rollback (si es necesario)

Si necesitas revertir el cambio (no recomendado):

```sql
DROP POLICY IF EXISTS "Users can view inspections from their departments" ON inspections_rrhh;

CREATE POLICY "inspections_rrhh_select_policy"
  ON inspections_rrhh FOR SELECT
  USING (
    (SELECT role::text FROM profiles WHERE id = auth.uid()) IN ('admin', 'corporate_admin')
    OR location_id IN (SELECT location_id FROM user_locations WHERE user_id = auth.uid())
  );
```

⚠️ **Advertencia**: Esto restaura el comportamiento con la fuga de información.

## ✅ Checklist de Verificación

Después de aplicar el fix, verificar:

- [ ] La migración se aplicó sin errores
- [ ] La función `user_can_access_department()` existe
- [ ] La política "Users can view inspections from their departments" está activa
- [ ] Admin sigue viendo todas las inspecciones
- [ ] Corporate_admin solo ve sus departamentos permitidos
- [ ] Usuarios normales solo ven sus ubicaciones
- [ ] No hay errores en los logs de Supabase

## 📞 Soporte

Si después de aplicar el fix sigues teniendo problemas:

1. Verifica los logs de Supabase
2. Confirma que la función `user_can_access_department()` existe
3. Verifica la configuración de `allowed_departments` del usuario
4. Revisa las políticas RLS activas en la tabla `inspections_rrhh`

---

**Estado:** ✅ Fix aplicado y listo para producción

**Fecha:** 19 de enero de 2026

**Impacto:** 🔴 CRÍTICO - Seguridad y privacidad de datos
