-- Agrega campos específicos de socios a la tabla public.profiles
-- Ejecutar en Supabase.

alter table public.profiles
  add column if not exists numero_socio text,
  add column if not exists dni text,
  add column if not exists direccion text,
  add column if not exists localidad text,
  add column if not exists provincia text,
  add column if not exists fecha_nacimiento date,
  add column if not exists fecha_ingreso date,
  add column if not exists telefono text,
  add column if not exists celular text;

-- Asegurar unicidad por DNI (ignorando nulos)
create unique index if not exists profiles_dni_key
  on public.profiles(dni)
  where dni is not null;

