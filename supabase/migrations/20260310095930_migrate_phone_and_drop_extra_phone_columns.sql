-- Migrar telefono/celular -> phone y eliminar columnas redundantes.
-- Ejecutar en Supabase.

-- 1) Volcar datos en la columna oficial phone.
update public.profiles
set phone = coalesce(telefono, celular, phone);

-- 2) Eliminar columnas telefono y celular (ya no se usarán).
alter table public.profiles
  drop column if exists telefono,
  drop column if exists celular;

