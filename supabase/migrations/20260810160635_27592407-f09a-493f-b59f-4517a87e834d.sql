CREATE TYPE public.equipment_type AS ENUM ('split','janela','cassete','piso_teto','outro');

CREATE TABLE public.equipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type public.equipment_type NOT NULL DEFAULT 'split',
  brand text,
  model text,
  btus integer,
  location text,
  serial_number text,
  installed_at date,
  notes text,
  has_maintenance_contract boolean NOT NULL DEFAULT false,
  maintenance_interval_months integer,
  last_maintenance_at date,
  next_maintenance_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipments TO authenticated;
GRANT ALL ON public.equipments TO service_role;

ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY equipments_select_company ON public.equipments FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY equipments_admin_insert ON public.equipments FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY equipments_admin_update ON public.equipments FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_company_admin())
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY equipments_admin_delete ON public.equipments FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY equipments_superadmin_all ON public.equipments FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE INDEX idx_equipments_client ON public.equipments(client_id);
CREATE INDEX idx_equipments_next_maintenance ON public.equipments(company_id, next_maintenance_at);

CREATE TRIGGER trg_equipments_updated BEFORE UPDATE ON public.equipments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.equipments_set_next_maintenance()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.has_maintenance_contract AND NEW.maintenance_interval_months IS NOT NULL AND NEW.last_maintenance_at IS NOT NULL THEN
    NEW.next_maintenance_at := NEW.last_maintenance_at + (NEW.maintenance_interval_months || ' months')::interval;
  ELSIF NOT NEW.has_maintenance_contract THEN
    NEW.next_maintenance_at := NULL;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_equipments_next_maintenance BEFORE INSERT OR UPDATE ON public.equipments
  FOR EACH ROW EXECUTE FUNCTION public.equipments_set_next_maintenance();

ALTER TABLE public.service_orders ADD COLUMN equipment_id uuid REFERENCES public.equipments(id) ON DELETE SET NULL;
CREATE INDEX idx_orders_equipment ON public.service_orders(equipment_id);