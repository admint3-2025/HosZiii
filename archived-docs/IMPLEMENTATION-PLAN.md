# Plan de Implementación: Control de Acceso por Rol (IT vs Mantenimiento)

## 📋 Resumen

Segregar activos en **IT** y **Mantenimiento** mediante roles especializados. Los técnicos/supervisores solo verán y gestionarán activos de su categoría.

## 🗄️ Base de Datos

**Estado**: ✅ SQL Migration Creada
**Archivo**: `supabase/migration-role-based-asset-access.sql`

### Lo que hace:
1. ✅ Tabla `asset_type_categories` (mapeo de 30 tipos de activos → IT o MAINTENANCE)
2. ✅ Columna `asset_category` en `profiles` (VARCHAR: 'IT', 'MAINTENANCE', NULL)
3. ✅ Funciones helper: `get_asset_category()`, `user_can_access_asset()`
4. ✅ Políticas RLS en `assets` para filtrar por categoría
5. ✅ Tabla `user_category_audit` (auditoría de cambios)

**Próximo paso**: Ejecutar bloques SQL en Supabase (ver `APPLY-ROLE-BASED-ACCESS-STEP-BY-STEP.md`)

---

## 🎯 Frontend - Componentes a Actualizar

### 1. **Hook: useAssetCategoryFilter**
**Estado**: ✅ Creado
**Archivo**: `src/lib/hooks/useAssetCategoryFilter.ts`
**Funciones**:
- `useAssetCategoryFilter()` - Obtener categoría del usuario actual
- `useAvailableAssetTypes()` - Tipos de activos disponibles
- `useFilteredAssets()` - Filtrar lista de activos
- `AssetCategoryBadge` - Componente visual (mostrar categoría)
- `buildAssetCategoryFilter()` - Helper para queries SQL

### 2. **AssetList.tsx** (lista de activos)
**Estado**: ⏳ Por hacer
**Cambios**:
```tsx
import { useAssetCategoryFilter, useFilteredAssets } from '@/lib/hooks/useAssetCategoryFilter'

export default function AssetList() {
  const { access, loading } = useAssetCategoryFilter()
  const { filtered: visibleAssets } = useFilteredAssets(allAssets)
  
  // Mostrar solo visibleAssets en lugar de allAssets
  return (...)
}
```

**En query SQL**:
```sql
-- Agregar a la cláusula WHERE:
AND user_can_access_asset(auth.uid(), assets.asset_type)
```

### 3. **CreateTicketForm** (crear tickets)
**Estado**: ⏳ Por hacer
**Cambios**:
```tsx
import { useAvailableAssetTypes } from '@/lib/hooks/useAssetCategoryFilter'

export default function CreateTicketForm() {
  const { assetTypes } = useAvailableAssetTypes()
  
  // Cargar solo activos de assetTypes
  return (...)
}
```

### 4. **AssetCreateForm** (crear activos)
**Estado**: ⏳ Por hacer
**Cambios**:
```tsx
import { useAssetCategoryFilter } from '@/lib/hooks/useAssetCategoryFilter'

export default function AssetCreateForm() {
  const { access } = useAssetCategoryFilter()
  
  // Validar que asset_type coincida con access.assetCategory
  const handleSubmit = async (formData) => {
    if (access.assetCategory && 
        !isAssetInCategory(formData.asset_type, access.assetCategory)) {
      // Mostrar error
      return
    }
  }
}
```

### 5. **InventoryManager** (gestión de inventario)
**Estado**: ⏳ Por hacer
**Cambios**:
```tsx
import { useAssetCategoryFilter, AssetCategoryBadge } from '@/lib/hooks/useAssetCategoryFilter'

export default function InventoryManager() {
  const { access } = useAssetCategoryFilter()
  
  return (
    <div>
      <AssetCategoryBadge /> {/* Mostrar categoría del usuario */}
      {/* Filtrar activos por categoría */}
    </div>
  )
}
```

---

## 🔐 Seguridad

### Políticas RLS (servidor)
- **SELECT**: Admin ve todo, otros ven solo su categoría
- **INSERT**: Solo admin o supervisor con `can_manage_assets=true` de su categoría
- **UPDATE/DELETE**: Solo admin

### Validación (cliente)
- Hook valida categoría antes de mostrar activos
- No se puede "burlar" porque las queries SQL tienen RLS

---

## 🧪 Testing

### 1. Test con usuario IT
```
Email: tecnico.it@empresa.com
Rol: supervisor
asset_category: 'IT'

✅ Debe ver: DESKTOP, LAPTOP, SERVER, etc.
❌ No debe ver: HVAC_SYSTEM, BOILER, etc.
```

### 2. Test con usuario Mantenimiento
```
Email: tecnico.manto@empresa.com
Rol: supervisor
asset_category: 'MAINTENANCE'

❌ No debe ver: DESKTOP, LAPTOP, SERVER, etc.
✅ Debe ver: HVAC_SYSTEM, BOILER, etc.
```

### 3. Test con admin
```
Email: admin@empresa.com
Rol: admin
asset_category: NULL

✅ Debe ver TODOS los activos (IT + MAINTENANCE)
```

---

## 📝 Checklist de Implementación

### Fase 1: Database
- [ ] Ejecutar SQL blocks en Supabase (6 bloques)
- [ ] Verificar tabla `asset_type_categories` tiene 30 registros
- [ ] Asignar categorías a usuarios de prueba

### Fase 2: Frontend Setup
- [ ] Hook `useAssetCategoryFilter` importable en componentes
- [ ] Verificar que el hook obtiene `asset_category` del usuario
- [ ] Componente `AssetCategoryBadge` renderiza correctamente

### Fase 3: Actualizar Componentes
- [ ] AssetList filtra activos
- [ ] CreateTicketForm solo muestra activos disponibles
- [ ] AssetCreateForm valida categoría
- [ ] InventoryManager muestra indicador visual

### Fase 4: Testing
- [ ] Test 1: Usuario IT ve solo IT
- [ ] Test 2: Usuario Mantenimiento ve solo Mantenimiento
- [ ] Test 3: Admin ve todo
- [ ] Test 4: Cambiar categoría y verificar actualización

### Fase 5: Deployment
- [ ] Crear usuarios de prueba en Supabase
- [ ] Ejecutar suite de tests
- [ ] Documentar en README

---

## 📚 Documentación

| Archivo | Propósito |
|---------|-----------|
| `ROLE-BASED-ASSET-ACCESS-README.md` | Guía general del sistema |
| `APPLY-ROLE-BASED-ACCESS-STEP-BY-STEP.md` | Pasos SQL detallados |
| `src/lib/hooks/useAssetCategoryFilter.ts` | Código del hook |
| `supabase/migration-role-based-asset-access.sql` | SQL completa |

---

## 🚀 Próximos Pasos

1. ✅ Ejecutar SQL en Supabase (6 bloques)
2. ⏳ Copiar archivos a `/home/jmosorioe/ZIII-helpdesk`
3. ⏳ Actualizar AssetList.tsx
4. ⏳ Actualizar CreateTicketForm.tsx
5. ⏳ Actualizar AssetCreateForm.tsx
6. ⏳ Testar con usuarios IT y Mantenimiento
7. ⏳ Deployment a producción

---

## 💡 Ventajas

✅ **Seguridad**: RLS garantiza que no se pueda burlar desde la UI
✅ **Escalabilidad**: Fácil agregar nuevas categorías
✅ **Auditoría**: Se registran cambios de categoría
✅ **UX**: Usuarios ven solo lo que pueden gestionar
✅ **Admin**: Acceso completo pero pueden asignar restricciones

---

## ⚠️ Consideraciones

- La validación ocurre en ambos lados (cliente + servidor)
- `asset_category = NULL` en admin significa acceso a TODOS
- Para cambiar categoría de usuario: admin edita `profiles.asset_category`
- Los cambios aplican en la siguiente sesión del usuario
