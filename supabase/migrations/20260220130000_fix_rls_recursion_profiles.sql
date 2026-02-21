-- Fix: infinite recursion in RLS when admin policies read from profiles.
-- Solution: is_admin() with SECURITY DEFINER so it bypasses RLS when checking the current user's role.

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

-- Drop and recreate policies that used SELECT on profiles (causing recursion)

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;
CREATE POLICY "Admins can manage plans"
  ON public.plans FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can read all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can read all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can read all payments" ON public.payments;
CREATE POLICY "Admins can read all payments"
  ON public.payments FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can read all check_ins" ON public.check_ins;
CREATE POLICY "Admins can read all check_ins"
  ON public.check_ins FOR SELECT
  USING (public.is_admin());
