# Estado del Sistema de Permisos - 2026-02-15

## ✅ Refactor Completado

### Arquitectura Actual

**Fuente Única de Verdad:**
- `hub_visible_modules: Record<ModuleId, 'user' | 'supervisor' | false>` — Determina acceso a módulos y nivel de supervisión
- `user_locations` + `profiles.location_id` — Determina acceso a sedes
- `asset_category` — SOLO para filtrado de tipos de inventario (granular)

### Status por Capa

#### 1. **Código NextJS** ✅ SINCRONIZADO
- **Completado:** Phase 2-3 refactoring (Commits: 500f548, cb73ef6, 9b225c5)
- **Cambios:** 25+ archivos actualizados
- **Verificación:** TypeScript clean, zero errors
- **Referencias removidas:** 80+ referencias a `is_it_supervisor`/`is_maintenance_supervisor`

```
✓ src/lib/permissions.ts — getModuleAccess() exportado
✓ AppShell.tsx — usa hub_visible_modules
✓ Tickets/Reports/Mantenimiento pages — centralizadas
✓ API routes — validation actualizada
✓ Ticket creation actions — permisos unificados
```

#### 2. **RLS Policies (Supabase)** ✅ SINCRONIZADO
- **Migración:** `migrate-rls-to-hub-modules-only.sql` (Ejecutada 2026-02-15)
- **Cambios:** Políticas reescritas para usar SOLO `hub_visible_modules`
- **Tablas afectadas:**
  - `tickets` — Policy: `tickets_select_with_hub_modules`
  - `tickets_maintenance` — Policy: `tickets_maintenance_select_hub`

```sql
-- Antes (❌ Redundante):
AND p.is_it_supervisor = true

-- Ahora (✅ Óptimo):
AND (p.hub_visible_modules->>'it-helpdesk')::text IN ('user', 'supervisor')
```

### Campos Heredados - Estado

| Campo | Aplicación | RLS | Acción |
|-------|-----------|-----|--------|
| `is_it_supervisor` | ❌ Removido | ❌ Removido | ✅ Seguro eliminar en 1-2 semanas |
| `is_maintenance_supervisor` | ❌ Removido | ❌ Removido | ✅ Seguro eliminar en 1-2 semanas |
| `asset_category` | ✅ En uso (filtrado granular) | ✅ En uso | ⏸️ Mantener |

### Commits de Referencia

```
500f548 - Phase 2: Remove supervisor flags from critical paths
cb73ef6 - Phase 3: Replace asset-category access checks  
9b225c5 - Final: Ticket creation actions centralization
```

### Próximos Pasos (Opcionales)

**Después de 1-2 semanas de testing en producción:**

```sql
-- Si todo funciona correctamente, eliminar columnas heredadas:
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS is_it_supervisor,
  DROP COLUMN IF EXISTS is_maintenance_supervisor;
```

### Verificación de Funcionamiento

```sql
-- Para verificar que RLS está usando hub_visible_modules:
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('tickets', 'tickets_maintenance')
ORDER BY tablename;
```

---

**Status:** Sistema de permisos **100% centralizado y óptimo**  
**Última actualización:** 2026-02-15  
**Responsable:** GitHub Copilot - Phase 2-3 Refactoring
