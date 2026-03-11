-- Agrega el email de la persona que dio de alta al miembro.
-- Ejecutar en Supabase.

alter table public.profiles
  add column if not exists created_by_email text;

