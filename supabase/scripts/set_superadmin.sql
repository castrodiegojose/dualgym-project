-- Marcar un usuario como superadmin (role = 'admin') por email.
-- Ejecuta esto en Supabase SQL Editor y cambia el email por el tuyo.
-- Luego inicia sesión con ese usuario en la app (login con Supabase).

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'TU_EMAIL@ejemplo.com';

-- Comprobar (opcional):
-- SELECT id, email, first_name, last_name, role FROM public.profiles WHERE role = 'admin';
