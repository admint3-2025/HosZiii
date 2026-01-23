-- Ver TODOS los triggers relacionados con asset_changes
SELECT 
  trigger_schema,
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (
    trigger_name ILIKE '%asset%'
    OR action_statement ILIKE '%track_asset_changes%'
    OR action_statement ILIKE '%asset_changes%'
  )
ORDER BY event_object_table, trigger_name;
