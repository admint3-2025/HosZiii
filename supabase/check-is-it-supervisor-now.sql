-- =====================================================
-- CHECK INMEDIATO: ¿Qué valor tiene is_it_supervisor AHORA?
-- =====================================================

-- Query simple y directa
SELECT 
  u.email,
  p.is_it_supervisor,
  pg_typeof(p.is_it_supervisor) as tipo_columna,
  p.is_it_supervisor IS TRUE as es_true_explicito,
  p.is_it_supervisor = true as comparacion_igual,
  CASE 
    WHEN p.is_it_supervisor IS TRUE THEN '✅ TRUE'
    WHEN p.is_it_supervisor IS FALSE THEN '❌ FALSE'
    WHEN p.is_it_supervisor IS NULL THEN '⚠️ NULL'
  END as estado,
  -- Verificar la condición COMPLETA del middleware
  CASE 
    WHEN p.role = 'corporate_admin'
      AND (p.hub_visible_modules->'it-helpdesk')::boolean = true
      AND p.is_it_supervisor = true
    THEN '✅ DEBERÍA PASAR'
    ELSE '❌ BLOQUEADO - razón: ' ||
      CASE 
        WHEN p.role != 'corporate_admin' THEN 'no es corporate_admin'
        WHEN (p.hub_visible_modules->'it-helpdesk')::boolean IS NOT TRUE THEN 'módulo IT no es true'
        WHEN p.is_it_supervisor IS NOT TRUE THEN 'is_it_supervisor no es true (valor: ' || COALESCE(p.is_it_supervisor::text, 'NULL') || ')'
        ELSE 'razón desconocida'
      END
  END as diagnostico_completo
FROM auth.users u
INNER JOIN profiles p ON p.id = u.id
WHERE u.email = 'sistemas@alzen.com';

-- Ver TODOS los campos relevantes
SELECT 
  u.email,
  u.id as user_id,
  p.role,
  p.asset_category,
  p.is_it_supervisor,
  p.is_maintenance_supervisor,
  p.hub_visible_modules,
  p.location_id
FROM auth.users u
INNER JOIN profiles p ON p.id = u.id
WHERE u.email = 'sistemas@alzen.com';
