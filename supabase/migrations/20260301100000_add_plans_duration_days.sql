-- Agrega la duración en días del plan a public.plans.
-- Permite definir periodos flexibles (ej. 30 días mensual, 365 anual, o planes personalizados).

alter table public.plans
  add column if not exists duration_days integer not null default 30;

comment on column public.plans.duration_days is 'Cantidad de días que dura el periodo del plan (ej. 30 mensual, 365 anual).';

-- Planes anuales existentes: 365 días
update public.plans
set duration_days = 365
where interval = 'year';
