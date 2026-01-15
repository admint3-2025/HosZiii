# 🏗️ Arquitectura: Control de Acceso por Rol

## Diagrama de Flujo de Acceso

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUARIO AUTENTICADO                       │
│                   (session con auth.uid())                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────┐
        │  SELECT * FROM profiles            │
        │  WHERE id = auth.uid()             │
        │                                    │
        │  → role (admin/supervisor/etc)    │
        │  → asset_category ('IT'/'MAINT')  │
        │  → can_manage_assets (true/false)  │
        └────────────────────┬───────────────┘
                             │
                ┌────────────┴─────────────┬──────────────┐
                │                          │              │
                ▼                          ▼              ▼
        ┌──────────────┐          ┌──────────────┐  ┌──────────┐
        │    ADMIN     │          │ SUPERVISOR   │  │ TÉCNICO  │
        │              │          │              │  │          │
        │asset_category│          │asset_category│  │asset_cat │
        │   = NULL     │          │  = 'IT' or   │  │= 'IT' or │
        │              │          │'MAINTENANCE' │  │'MAINTEN' │
        │ VE: TODOS    │          │              │  │          │
        │ GESTIONA:    │          │ VE: solo su  │  │ VE: solo │
        │ TODO         │          │ categoría    │  │ su cat   │
        └──────┬───────┘          │ GESTIONA:    │  │ NO crea  │
               │                  │ solo su cat  │  │ activos  │
               │                  └──────┬───────┘  └─────┬────┘
               │                         │               │
               └─────────────┬───────────┴───────────────┘
                             │
                             ▼
        ┌────────────────────────────────────┐
        │  RLS POLICY en tabla ASSETS        │
        │                                    │
        │  WHERE (                           │
        │   admin? → todo visible            │
        │  OR                                │
        │   exists asset_type_categories     │
        │   WHERE category = user.asset_cat  │
        │  OR                                │
        │   user.asset_category IS NULL      │
        │  )                                 │
        └────────────────────┬───────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
        ┌──────────────────┐    ┌──────────────────┐
        │ IT ASSETS (10)   │    │MAINT ASSETS (20) │
        │                  │    │                  │
        │ DESKTOP          │    │ AIR_CONDITIONING │
        │ LAPTOP           │    │ HVAC_SYSTEM      │
        │ TABLET           │    │ BOILER           │
        │ PHONE            │    │ REFRIGERATOR     │
        │ MONITOR          │    │ KITCHEN_EQUIP    │
        │ PRINTER          │    │ WASHING_MACHINE  │
        │ SCANNER          │    │ DRYER            │
        │ SERVER           │    │ WATER_HEATER     │
        │ UPS              │    │ PUMP             │
        │ PROJECTOR        │    │ GENERATOR        │
        │                  │    │ ELEVATOR         │
        │                  │    │ FURNITURE        │
        │                  │    │ FIXTURE          │
        │                  │    │ CLEANING_EQUIP   │
        │                  │    │ SECURITY_SYSTEM  │
        │                  │    │ FIRE_SYSTEM      │
        │                  │    │ PLUMBING         │
        │                  │    │ ELECTRICAL       │
        │                  │    │ LIGHTING         │
        │                  │    │ VEHICLE          │
        │                  │    │ OTHER            │
        └──────────────────┘    └──────────────────┘
```

---

## Estructura de Base de Datos

### 1. Tabla: `asset_type_categories`
```sql
┌─ id: UUID (PK)
├─ asset_type: VARCHAR(50) UNIQUE
│  ├─ "DESKTOP", "LAPTOP", etc.
│  └─ "AIR_CONDITIONING", "BOILER", etc.
├─ category: VARCHAR(50)
│  ├─ "IT" (10 tipos)
│  └─ "MAINTENANCE" (20 tipos)
├─ description: TEXT
├─ is_active: BOOLEAN
└─ created_at: TIMESTAMP
```

### 2. Tabla: `profiles` (modificada)
```sql
┌─ id: UUID (FK auth.users)
├─ role: user_role
│  ├─ 'admin'
│  ├─ 'supervisor'
│  ├─ 'agent_l1', 'agent_l2'
│  └─ 'requester', 'auditor'
├─ asset_category: VARCHAR(50) ← NUEVA
│  ├─ 'IT' (solo ve IT)
│  ├─ 'MAINTENANCE' (solo ve Mantenimiento)
│  └─ NULL (admin - ve todo)
├─ can_manage_assets: BOOLEAN
├─ active: BOOLEAN
└─ ... otros campos
```

### 3. Tabla: `asset_type_categories` (índice)
```sql
CREATE INDEX idx_profiles_role_asset_category
  ON profiles(role, asset_category)
  WHERE active = true;
```

### 4. Tabla: `user_category_audit` (nueva)
```sql
┌─ id: UUID (PK)
├─ user_id: UUID (FK auth.users)
├─ old_category: VARCHAR(50)
├─ new_category: VARCHAR(50)
├─ changed_by: UUID (FK auth.users) ← quién lo cambió
├─ changed_at: TIMESTAMP
└─ reason: TEXT
```

---

## Componentes Frontend

### Hook: `useAssetCategoryFilter.ts`
```
useAssetCategoryFilter()
├─ Retorna: { access, loading, error }
│  ├─ access.userRole: string
│  ├─ access.assetCategory: 'IT' | 'MAINTENANCE' | null
│  └─ access.canViewAllAssets: boolean
└─ Usado en: AssetList, CreateTicketForm, InventoryManager

useAvailableAssetTypes()
├─ Retorna: { assetTypes, typesLoading, category }
├─ Filtra tipos según asset_category del usuario
└─ Usado en: Dropdowns de tipos de activos

useFilteredAssets<T>(allAssets: T[])
├─ Retorna: { filtered, loading }
├─ Filtra lista de activos
└─ Usado en: AssetList

AssetCategoryBadge()
├─ Componente visual
├─ Muestra: "📱 IT" o "🔧 Mantenimiento" o "👨‍💼 Administrador"
└─ Usado en: Headers de páginas

buildAssetCategoryFilter(category)
├─ Retorna: cláusula SQL WHERE
├─ Usado en: Server actions
└─ Ejemplos:
   "AND a.asset_type IN ('DESKTOP', 'LAPTOP', ...)" ← IT
   "AND a.asset_type IN ('HVAC_SYSTEM', 'BOILER', ...)" ← MAINT
```

---

## Políticas RLS (Row Level Security)

### POLICY: "Users view assets by role and category"
```sql
SELECT policy

ALLOW IF:
  - admin? → true (ve todo)
  OR
  - supervisor/agent + tiene asset_category?
    → existe asset_type_categories
    → category MATCHES asset_category
  OR
  - usuario.asset_category IS NULL? → true
```

### POLICY: "Users can create update assets by category"
```sql
INSERT/UPDATE policy

ALLOW IF:
  - admin? → true
  OR
  - supervisor/agent + can_manage_assets = true?
    → asset_type es válido para su categoría
```

---

## Flujo de una Solicitud

### Caso 1: Supervisor IT intentando ver LAPTOP
```
1. Request: GET /api/assets?asset_type=LAPTOP
2. Backend: SELECT * FROM profiles WHERE id = auth.uid()
   → role = 'supervisor', asset_category = 'IT'
3. RLS Policy evalúa:
   ✅ asset_category = 'IT'
   ✅ LAPTOP está en asset_type_categories.category = 'IT'
4. Resultado: 200 OK (ve el activo)
```

### Caso 2: Supervisor IT intentando ver HVAC_SYSTEM
```
1. Request: GET /api/assets?asset_type=HVAC_SYSTEM
2. Backend: SELECT * FROM profiles WHERE id = auth.uid()
   → role = 'supervisor', asset_category = 'IT'
3. RLS Policy evalúa:
   ❌ asset_category = 'IT'
   ❌ HVAC_SYSTEM está en asset_type_categories.category = 'MAINTENANCE'
   ❌ No coincide
4. Resultado: 0 rows (no ve el activo)
```

### Caso 3: Admin intentando ver cualquier activo
```
1. Request: GET /api/assets
2. Backend: SELECT * FROM profiles WHERE id = auth.uid()
   → role = 'admin', asset_category = NULL
3. RLS Policy evalúa:
   ✅ role = 'admin'? → true
4. Resultado: 200 OK (ve TODOS los activos)
```

---

## Integración con Componentes Existentes

### AssetList.tsx
```tsx
ANTES:
  <AssetList assets={allAssets} />
  └─ Muestra: TODO (30 activos)

DESPUÉS:
  import { useAssetCategoryFilter } from '@/lib/hooks/useAssetCategoryFilter'
  
  const { access } = useAssetCategoryFilter()
  const visibleAssets = filterByCategory(allAssets, access.assetCategory)
  
  <AssetList assets={visibleAssets} />
  └─ Muestra: Solo IT (10) O Mantenimiento (20)
```

### CreateTicketForm.tsx
```tsx
ANTES:
  <select>
    <option>DESKTOP</option>
    <option>LAPTOP</option>
    <option>HVAC_SYSTEM</option>  ← ¿Por qué ve esto un técnico IT?
  </select>

DESPUÉS:
  import { useAvailableAssetTypes } from '@/lib/hooks/useAssetCategoryFilter'
  
  const { assetTypes } = useAvailableAssetTypes()
  
  <select>
    {assetTypes.map(type => <option>{type}</option>)}
    ← Solo muestra IT si usuario es 'IT', solo MAINT si es 'MAINTENANCE'
  </select>
```

---

## Casos de Uso

### Usuario: Técnico IT (Jorge)
```
email: jorge@empresa.com
role: agent_l1
asset_category: 'IT'
can_manage_assets: false

✅ Ve lista de activos IT (DESKTOP, LAPTOP, MONITOR, etc.)
✅ Puede crear tickets para activos IT
❌ No puede crear/editar activos
❌ No ve activos de MANTENIMIENTO
```

### Usuario: Supervisor HVAC (María)
```
email: maria@empresa.com
role: supervisor
asset_category: 'MAINTENANCE'
can_manage_assets: true

✅ Ve lista de activos MANTENIMIENTO
✅ Puede crear/editar activos HVAC, Kitchen, Laundry, etc.
✅ Puede crear tickets para sus activos
❌ No ve activos IT
```

### Usuario: Admin (Carlos)
```
email: carlos@empresa.com
role: admin
asset_category: NULL
can_manage_assets: true

✅ Ve TODOS los activos (IT + MANTENIMIENTO)
✅ Puede crear/editar cualquier activo
✅ Puede asignar categorías a otros usuarios
✅ Acceso completo al sistema
```

---

## Seguridad: Por qué funciona

1. **RLS a nivel de BD**: No se puede burlar con queries SQL directo
2. **Hook valida en cliente**: UX intuitiva, muestra solo lo permitido
3. **Double-check en server**: server actions validan antes de guardar
4. **Auditoría**: cambios de categoría se registran
5. **Inmutable en código**: `asset_category` no se modifica desde cliente

---

## Performance

| Operación | Query | Índice | Tiempo |
|-----------|-------|--------|--------|
| Ver perfil del usuario | SELECT * FROM profiles WHERE id = ? | PK | O(1) |
| Obtener categoría activo | SELECT category FROM asset_type_categories WHERE asset_type = ? | UNIQUE | O(1) |
| Filtrar activos | SELECT * FROM assets WHERE user_can_access_asset(user_id, asset_type) | RLS Policy + index | O(n) |
| Ver auditoría de cambios | SELECT * FROM user_category_audit WHERE user_id = ? | FK | O(n) |

**Índices creados**:
- `idx_profiles_role_asset_category` - Búsquedas frecuentes
- Constraints en `asset_type_categories` - Integridad

---

## Próximos Pasos

1. ✅ Diseñar arquitectura (este documento)
2. ⏳ Ejecutar SQL en Supabase
3. ⏳ Actualizar frontend (AssetList, CreateTicketForm)
4. ⏳ Testar segregación
5. ⏳ Deploy a producción
