-- Ver el código de assign_asset_code_trigger (la función que faltó)
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'assign_asset_code_trigger';

-- Ver TODOS los triggers activos en assets
SELECT 
  t.tgname as trigger_name,
  p.proname as function_name,
  CASE t.tgtype::int & 1
    WHEN 1 THEN 'ROW'
    ELSE 'STATEMENT'
  END as level,
  CASE t.tgtype::int & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END as timing,
  CASE 
    WHEN t.tgtype::int & 4 != 0 THEN 'INSERT'
    WHEN t.tgtype::int & 8 != 0 THEN 'DELETE'
    WHEN t.tgtype::int & 16 != 0 THEN 'UPDATE'
  END as event
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'assets'::regclass
  AND t.tgisinternal = false
ORDER BY t.tgname;
