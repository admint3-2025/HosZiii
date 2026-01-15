-- Actualizar asset_category para supervisores y agentes
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar usuarios actuales y sus categorías (con email desde auth.users)
SELECT p.id, u.email, p.full_name, p.role, p.department, p.asset_category
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.role IN ('supervisor', 'agent_l1', 'agent_l2')
ORDER BY p.role, p.full_name;

-- 2. Actualizar Juan Torres (supervisor de mantenimiento) - buscar por nombre o departamento
UPDATE public.profiles
SET asset_category = 'MAINTENANCE'
WHERE (
  lower(full_name) LIKE '%juan%torres%'
  OR lower(department) LIKE '%mantenim%'
  OR lower(department) LIKE '%mantenimiento%'
)
AND role IN ('supervisor', 'agent_l1', 'agent_l2');

-- 3. Actualizar supervisores/agentes de IT (ajustar según tus usuarios)
UPDATE public.profiles
SET asset_category = 'IT'
WHERE (
  lower(department) LIKE '%sistema%'
  OR lower(department) LIKE '%tecnolog%'
  OR lower(department) LIKE '%it%'
  OR lower(department) LIKE '%soporte%'
)
AND role IN ('supervisor', 'agent_l1', 'agent_l2')
AND asset_category IS NULL;

-- 4. Verificar cambios
SELECT p.id, u.email, p.full_name, p.role, p.department, p.asset_category
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.role IN ('supervisor', 'agent_l1', 'agent_l2')
ORDER BY p.asset_category, p.role, p.full_name;

-- 5. OPCIONAL: Si conoces el ID exacto del usuario, usar este UPDATE directo:
-- UPDATE public.profiles SET asset_category = 'MAINTENANCE' WHERE id = 'UUID-DEL-USUARIO';
-- UPDATE public.profiles SET asset_category = 'IT' WHERE id = 'UUID-DEL-USUARIO';
