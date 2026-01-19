-- Verificar que los datos de usuarios se estén guardando correctamente

-- 1. Ver todos los perfiles con su asset_category
SELECT 
  'Perfiles con asset_category' as info,
  p.id,
  u.email,
  p.full_name,
  p.role,
  p.department,
  p.asset_category,
  p.can_manage_assets
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
ORDER BY p.full_name
LIMIT 20;
