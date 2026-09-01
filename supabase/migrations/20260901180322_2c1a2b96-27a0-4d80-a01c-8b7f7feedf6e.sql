
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cpf_cnpj text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS state text;

CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  responsible text,
  description text,
  start_date date,
  end_date date,
  amount numeric,
  status text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_select" ON public.contracts FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id() OR public.is_super_admin());
CREATE POLICY "contracts_insert" ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() OR public.is_super_admin());
CREATE POLICY "contracts_update" ON public.contracts FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.get_user_company_id() OR public.is_super_admin());
CREATE POLICY "contracts_delete" ON public.contracts FOR DELETE TO authenticated
  USING ((company_id = public.get_user_company_id() AND public.is_company_admin()) OR public.is_super_admin());

CREATE TRIGGER contracts_set_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.technical_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  equipment_id uuid REFERENCES public.equipments(id) ON DELETE SET NULL,
  report_date date NOT NULL DEFAULT current_date,
  objective text,
  technicians text,
  findings text,
  conclusion text,
  status text NOT NULL DEFAULT 'rascunho',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.technical_reports TO authenticated;
GRANT ALL ON public.technical_reports TO service_role;
ALTER TABLE public.technical_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select" ON public.technical_reports FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id() OR public.is_super_admin());
CREATE POLICY "reports_insert" ON public.technical_reports FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() OR public.is_super_admin());
CREATE POLICY "reports_update" ON public.technical_reports FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.get_user_company_id() OR public.is_super_admin());
CREATE POLICY "reports_delete" ON public.technical_reports FOR DELETE TO authenticated
  USING ((company_id = public.get_user_company_id() AND public.is_company_admin()) OR public.is_super_admin());

CREATE TRIGGER technical_reports_set_updated_at BEFORE UPDATE ON public.technical_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
