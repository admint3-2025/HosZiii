-- Configurar el timezone de la sesión a México (opcional, solo si es necesario)
-- Ejecuta esto en el SQL Editor de Supabase si encuentras que las fechas están incorrectas

-- ALTER DATABASE postgres SET timezone TO 'America/Mexico_City';

-- O puedes configurarlo a nivel de sesión:
-- SET timezone = 'America/Mexico_City';

-- Nota: Normalmente Supabase maneja esto correctamente con timestamptz.
-- El problema suele estar en la visualización del frontend, no en la base de datos.
