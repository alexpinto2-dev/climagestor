
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'tecnico');
CREATE TYPE public.client_type AS ENUM ('residencial', 'comercial');
CREATE TYPE public.service_type AS ENUM ('instalacao', 'manutencao_preventiva', 'manutencao_corretiva', 'limpeza', 'recarga_gas');
CREATE TYPE public.order_status AS ENUM ('agendada', 'em_andamento', 'concluida', 'cancelada');
CREATE TYPE public.quote_status AS ENUM ('rascunho', 'enviado', 'aprovado', 'recusado');

-- UPDATED_AT
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- TABLES
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text,
  phone text,
  email text,
  city text NOT NULL DEFAULT 'Aracaju',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  neighborhood text,
  type public.client_type NOT NULL DEFAULT 'residencial',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  specialty text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL,
  service_type public.service_type NOT NULL DEFAULT 'manutencao_preventiva',
  equipment text,
  btus integer,
  description text,
  status public.order_status NOT NULL DEFAULT 'agendada',
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  amount numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  number text NOT NULL,
  status public.quote_status NOT NULL DEFAULT 'rascunho',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(12,2) NOT NULL DEFAULT 0,
  valid_until date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_company ON public.profiles(company_id);
CREATE INDEX idx_clients_company ON public.clients(company_id);
CREATE INDEX idx_technicians_company ON public.technicians(company_id);
CREATE INDEX idx_orders_company ON public.service_orders(company_id);
CREATE INDEX idx_orders_tech ON public.service_orders(technician_id);
CREATE INDEX idx_quotes_company ON public.quotes(company_id);

CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_technicians_updated BEFORE UPDATE ON public.technicians FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.service_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_quotes_updated BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technicians TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.companies, public.profiles, public.user_roles, public.clients, public.technicians, public.service_orders, public.quotes TO service_role;

-- SECURITY DEFINER HELPERS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_technician_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.technicians WHERE profile_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- SIGNUP: cria empresa + perfil + papel admin
CREATE OR REPLACE FUNCTION public.setup_company(p_company_name text, p_full_name text, p_phone text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Nao autenticado'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user) THEN
    RAISE EXCEPTION 'Usuario ja possui empresa';
  END IF;
  IF coalesce(trim(p_company_name), '') = '' THEN
    RAISE EXCEPTION 'Nome da empresa obrigatorio';
  END IF;

  INSERT INTO public.companies (name) VALUES (trim(p_company_name)) RETURNING id INTO v_company;
  INSERT INTO public.profiles (id, company_id, full_name, phone, email)
  VALUES (v_user, v_company, coalesce(trim(p_full_name), ''), p_phone,
          (SELECT email FROM auth.users WHERE id = v_user));
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user, 'admin');
  RETURN v_company;
END; $$;

REVOKE ALL ON FUNCTION public.setup_company(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.setup_company(text, text, text) TO authenticated;

-- RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- companies
CREATE POLICY "companies_select_own" ON public.companies FOR SELECT TO authenticated
  USING (id = public.get_user_company_id());
CREATE POLICY "companies_update_admin" ON public.companies FOR UPDATE TO authenticated
  USING (id = public.get_user_company_id() AND public.is_company_admin())
  WITH CHECK (id = public.get_user_company_id() AND public.is_company_admin());

-- profiles
CREATE POLICY "profiles_select_company" ON public.profiles FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND company_id = public.get_user_company_id());

-- user_roles
CREATE POLICY "user_roles_select_company" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = user_roles.user_id AND p.company_id = public.get_user_company_id()));
CREATE POLICY "user_roles_admin_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_company_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = user_roles.user_id AND p.company_id = public.get_user_company_id()));
CREATE POLICY "user_roles_admin_delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_company_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = user_roles.user_id AND p.company_id = public.get_user_company_id()));

-- clients
CREATE POLICY "clients_select_company" ON public.clients FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY "clients_admin_insert" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY "clients_admin_update" ON public.clients FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_company_admin())
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY "clients_admin_delete" ON public.clients FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_company_admin());

-- technicians
CREATE POLICY "technicians_select_company" ON public.technicians FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY "technicians_admin_insert" ON public.technicians FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY "technicians_admin_update" ON public.technicians FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_company_admin())
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY "technicians_admin_delete" ON public.technicians FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_company_admin());

-- service_orders
CREATE POLICY "orders_select_scoped" ON public.service_orders FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id()
    AND (public.is_company_admin() OR technician_id = public.current_technician_id()));
CREATE POLICY "orders_admin_insert" ON public.service_orders FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY "orders_update_scoped" ON public.service_orders FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id()
    AND (public.is_company_admin() OR technician_id = public.current_technician_id()))
  WITH CHECK (company_id = public.get_user_company_id()
    AND (public.is_company_admin() OR technician_id = public.current_technician_id()));
CREATE POLICY "orders_admin_delete" ON public.service_orders FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_company_admin());

-- quotes (somente admin)
CREATE POLICY "quotes_admin_select" ON public.quotes FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY "quotes_admin_insert" ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY "quotes_admin_update" ON public.quotes FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_company_admin())
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY "quotes_admin_delete" ON public.quotes FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_company_admin());
