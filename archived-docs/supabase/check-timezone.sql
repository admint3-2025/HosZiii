-- Verificar la configuración de timezone en Supabase
SHOW timezone;

-- Ver la hora actual del servidor
SELECT now() as server_time, 
       now() AT TIME ZONE 'America/Mexico_City' as mexico_city_time,
       now() AT TIME ZONE 'UTC' as utc_time;

-- Ver las últimas fechas creadas en tickets
SELECT 
  ticket_number,
  created_at,
  created_at AT TIME ZONE 'America/Mexico_City' as created_at_mexico,
  updated_at,
  updated_at AT TIME ZONE 'America/Mexico_City' as updated_at_mexico
FROM tickets 
ORDER BY created_at DESC 
LIMIT 5;
