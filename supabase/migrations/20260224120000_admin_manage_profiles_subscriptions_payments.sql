-- Admin: permitir actualizar perfiles de cualquier usuario
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- Admin: permitir insertar y actualizar suscripciones para cualquier perfil
CREATE POLICY "Admins can insert subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (public.is_admin());

-- Admin: permitir insertar pagos para cualquier perfil
CREATE POLICY "Admins can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (public.is_admin());
