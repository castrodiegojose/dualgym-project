ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS numero_carnet text;

CREATE INDEX IF NOT EXISTS idx_profiles_numero_carnet
  ON public.profiles (numero_carnet)
  WHERE numero_carnet IS NOT NULL;

COMMENT ON COLUMN public.profiles.numero_carnet IS 'Número de carnet del sistema legacy (listado de carnets)';
