-- Script: Promover edelatorre298@gmail.com a administrador
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2 de enero de 2026

-- Promover edelatorre298@gmail.com a admin
UPDATE profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'edelatorre298@gmail.com'
);

-- Verificación: Mostrar el usuario actualizado
SELECT 
  id,
  email,
  (SELECT role FROM profiles WHERE id = auth.users.id) as role,
  created_at
FROM auth.users
WHERE email = 'edelatorre298@gmail.com';
