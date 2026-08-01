ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'outro';

DO $$ BEGIN
  CREATE TYPE public.order_origin AS ENUM ('manual', 'whatsapp', 'ia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS reported_problem text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS origin public.order_origin NOT NULL DEFAULT 'manual';