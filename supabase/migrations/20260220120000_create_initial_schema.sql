-- =============================================================================
-- DUAL GYM – Migración inicial para Supabase
-- Crea: profiles, plans, subscriptions, payments, check_ins + RLS + triggers
-- No crea auth (Supabase ya tiene auth.users y auth.uid())
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABLAS PÚBLICAS
-- -----------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  first_name text,
  last_name text,
  phone text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  membership_status text NOT NULL DEFAULT 'inactive' CHECK (membership_status IN ('active', 'inactive')),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Perfil extendido por usuario; id = auth.users.id';

CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  interval text NOT NULL CHECK (interval IN ('month', 'year')),
  stripe_price_id text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.plans IS 'Planes de suscripción (mensual, anual, etc.)';

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'unpaid')),
  current_period_start date,
  current_period_end date,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  stripe_subscription_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_profile_id ON public.subscriptions(profile_id);
CREATE UNIQUE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

COMMENT ON TABLE public.subscriptions IS 'Suscripción de un perfil a un plan';

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded')),
  payment_provider text NOT NULL,
  external_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_profile_id ON public.payments(profile_id);
CREATE INDEX idx_payments_subscription_id ON public.payments(subscription_id);
CREATE INDEX idx_payments_external_id ON public.payments(external_id) WHERE external_id IS NOT NULL;

COMMENT ON TABLE public.payments IS 'Pagos (Stripe, PayPal, etc.)';

CREATE TABLE public.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_check_ins_profile_id ON public.check_ins(profile_id);

COMMENT ON TABLE public.check_ins IS 'Registro de asistencia / entrenamientos';

-- -----------------------------------------------------------------------------
-- TRIGGER: updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- -----------------------------------------------------------------------------
-- TRIGGER: crear perfil al registrarse (auth.users)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'firstName'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'lastName'),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- -----------------------------------------------------------------------------
-- RLS helper (evita recursión: políticas admin no pueden leer profiles en USING)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Service role can insert profile (trigger)"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read plans"
  ON public.plans FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage plans"
  ON public.plans FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can read own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can read all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can insert own subscription (e.g. checkout)"
  ON public.subscriptions FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can read own payments"
  ON public.payments FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can read all payments"
  ON public.payments FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can insert own payment (webhook/checkout)"
  ON public.payments FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can read own check_ins"
  ON public.check_ins FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own check_in"
  ON public.check_ins FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admins can read all check_ins"
  ON public.check_ins FOR SELECT
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- DATOS INICIALES
-- -----------------------------------------------------------------------------
INSERT INTO public.plans (name, description, price_cents, currency, interval, active)
VALUES
  ('Mensual', 'Membresía mensual', 2999, 'USD', 'month', true),
  ('Anual', 'Membresía anual (2 meses gratis)', 29990, 'USD', 'year', true);
