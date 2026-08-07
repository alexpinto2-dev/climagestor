-- 1. CLIENTS
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone_e164 text;

UPDATE public.clients c
SET phone_e164 = CASE
  WHEN length(regexp_replace(coalesce(c.phone,''),'[^0-9]','','g')) IN (10,11)
    THEN '+55' || regexp_replace(c.phone,'[^0-9]','','g')
  WHEN length(regexp_replace(coalesce(c.phone,''),'[^0-9]','','g')) IN (12,13)
    AND regexp_replace(c.phone,'[^0-9]','','g') LIKE '55%'
    THEN '+' || regexp_replace(c.phone,'[^0-9]','','g')
  ELSE NULL
END
WHERE c.phone IS NOT NULL AND c.phone_e164 IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_company_phone_e164 ON public.clients (company_id, phone_e164);
CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_company_phone_e164 ON public.clients (company_id, phone_e164) WHERE phone_e164 IS NOT NULL;

-- 2. WHATSAPP INSTANCES
CREATE TABLE public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  instance_name text NOT NULL,
  phone text,
  provider text NOT NULL DEFAULT 'evolution',
  status text NOT NULL DEFAULT 'active',
  webhook_secret text,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.whatsapp_instances.webhook_secret IS 'Somente referencia/identificador do segredo (ex: nome da secret), nunca a API key da Evolution em texto claro.';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_instances TO authenticated;
GRANT ALL ON public.whatsapp_instances TO service_role;
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX uq_wa_instances_company_name ON public.whatsapp_instances (company_id, instance_name);
CREATE INDEX idx_wa_instances_company ON public.whatsapp_instances (company_id);
CREATE TRIGGER trg_wa_instances_updated BEFORE UPDATE ON public.whatsapp_instances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY wa_instances_select_company ON public.whatsapp_instances FOR SELECT TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY wa_instances_admin_insert ON public.whatsapp_instances FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY wa_instances_admin_update ON public.whatsapp_instances FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_admin()) WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY wa_instances_admin_delete ON public.whatsapp_instances FOR DELETE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY wa_instances_superadmin_all ON public.whatsapp_instances FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 3. CONVERSATIONS
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  whatsapp_instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  phone_e164 text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  intent text,
  context jsonb NOT NULL DEFAULT '{}',
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_conversations_company ON public.conversations (company_id);
CREATE INDEX idx_conversations_company_phone ON public.conversations (company_id, phone_e164);
CREATE INDEX idx_conversations_client ON public.conversations (client_id);
CREATE INDEX idx_conversations_last_message ON public.conversations (last_message_at DESC);
CREATE UNIQUE INDEX uq_conversations_open_per_phone ON public.conversations (company_id, phone_e164) WHERE status = 'open';

CREATE POLICY conversations_select_company ON public.conversations FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY conversations_admin_insert ON public.conversations FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY conversations_admin_update ON public.conversations FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_admin()) WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY conversations_admin_delete ON public.conversations FOR DELETE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY conversations_superadmin_all ON public.conversations FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. MESSAGES
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  whatsapp_instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  external_message_id text,
  direction text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  content text,
  author_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_direction_check CHECK (direction IN ('incoming','outgoing')),
  CONSTRAINT messages_author_type_check CHECK (author_type IN ('client','ai','human','system'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX uq_messages_company_external ON public.messages (company_id, external_message_id) WHERE external_message_id IS NOT NULL;
CREATE INDEX idx_messages_company ON public.messages (company_id);
CREATE INDEX idx_messages_conversation_created ON public.messages (conversation_id, created_at);
CREATE INDEX idx_messages_client ON public.messages (client_id);

CREATE POLICY messages_select_company ON public.messages FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY messages_admin_insert ON public.messages FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY messages_admin_update ON public.messages FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_admin()) WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY messages_admin_delete ON public.messages FOR DELETE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY messages_superadmin_all ON public.messages FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 5. AI INTERACTIONS
CREATE TABLE public.ai_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  model text,
  intent text,
  input jsonb,
  output jsonb,
  tool_name text,
  tool_input jsonb,
  tool_output jsonb,
  tokens_input integer,
  tokens_output integer,
  execution_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_interactions TO authenticated;
GRANT ALL ON public.ai_interactions TO service_role;
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ai_interactions_company ON public.ai_interactions (company_id);
CREATE INDEX idx_ai_interactions_conversation ON public.ai_interactions (conversation_id);
CREATE INDEX idx_ai_interactions_created ON public.ai_interactions (created_at DESC);

CREATE POLICY ai_interactions_select_company ON public.ai_interactions FOR SELECT TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY ai_interactions_superadmin_all ON public.ai_interactions FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 6. AUDIT LOG
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_log_company_created ON public.audit_log (company_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON public.audit_log (entity_type, entity_id);

CREATE POLICY audit_log_select_company ON public.audit_log FOR SELECT TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_admin());
CREATE POLICY audit_log_superadmin_all ON public.audit_log FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 7. SERVICE ORDERS
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS external_ref text;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS duration_minutes integer;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_company_external_ref ON public.service_orders (company_id, external_ref) WHERE external_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_company_status ON public.service_orders (company_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_company_scheduled ON public.service_orders (company_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_orders_tech_scheduled ON public.service_orders (technician_id, scheduled_at);

-- 8. RPC wa_upsert_client
CREATE OR REPLACE FUNCTION public.wa_upsert_client(p_company_id uuid, p_phone_e164 text, p_name text DEFAULT NULL)
RETURNS public.clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_client public.clients;
BEGIN
  IF p_company_id IS NULL OR p_phone_e164 IS NULL OR btrim(p_phone_e164) = '' THEN
    RAISE EXCEPTION 'company_id e phone_e164 sao obrigatorios';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company_id) THEN
    RAISE EXCEPTION 'Empresa inexistente: %', p_company_id;
  END IF;

  SELECT * INTO v_client FROM public.clients
   WHERE company_id = p_company_id AND phone_e164 = p_phone_e164 LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO v_client FROM public.clients
     WHERE company_id = p_company_id
       AND phone_e164 IS NULL
       AND regexp_replace(coalesce(phone,''),'[^0-9]','','g') = regexp_replace(p_phone_e164,'[^0-9]','','g')
       AND regexp_replace(coalesce(phone,''),'[^0-9]','','g') <> ''
     LIMIT 1;
  END IF;

  IF FOUND THEN
    UPDATE public.clients
       SET phone_e164 = p_phone_e164,
           phone = coalesce(phone, p_phone_e164),
           name = CASE WHEN coalesce(btrim(name),'') = '' AND coalesce(btrim(p_name),'') <> '' THEN p_name ELSE name END
     WHERE id = v_client.id
     RETURNING * INTO v_client;
  ELSE
    INSERT INTO public.clients (company_id, name, phone, phone_e164)
    VALUES (p_company_id, coalesce(nullif(btrim(p_name),''), p_phone_e164), p_phone_e164, p_phone_e164)
    RETURNING * INTO v_client;
  END IF;

  RETURN v_client;
END;
$$;
REVOKE ALL ON FUNCTION public.wa_upsert_client(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_upsert_client(uuid, text, text) TO service_role;

-- 9. RPC wa_create_order
CREATE OR REPLACE FUNCTION public.wa_create_order(
  p_company_id uuid,
  p_client_id uuid,
  p_service_type public.service_type,
  p_conversation_id uuid DEFAULT NULL,
  p_external_ref text DEFAULT NULL,
  p_equipment text DEFAULT NULL,
  p_btus integer DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_reported_problem text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_neighborhood text DEFAULT NULL,
  p_status public.order_status DEFAULT 'agendada',
  p_scheduled_at timestamptz DEFAULT NULL,
  p_amount numeric DEFAULT NULL
)
RETURNS public.service_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_order public.service_orders;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id AND company_id = p_company_id) THEN
    RAISE EXCEPTION 'Cliente % nao pertence a empresa %', p_client_id, p_company_id;
  END IF;

  IF p_external_ref IS NOT NULL THEN
    SELECT * INTO v_order FROM public.service_orders
     WHERE company_id = p_company_id AND external_ref = p_external_ref LIMIT 1;
    IF FOUND THEN
      RETURN v_order;
    END IF;
  END IF;

  INSERT INTO public.service_orders (
    company_id, client_id, service_type, equipment, btus, description,
    reported_problem, address, neighborhood, status, scheduled_at, amount,
    external_ref, origin
  ) VALUES (
    p_company_id, p_client_id, p_service_type, p_equipment, p_btus, p_description,
    p_reported_problem, p_address, p_neighborhood, p_status, coalesce(p_scheduled_at, now()), p_amount,
    p_external_ref, 'ia'
  )
  RETURNING * INTO v_order;

  INSERT INTO public.audit_log (company_id, entity_type, entity_id, action, new_data, metadata)
  VALUES (p_company_id, 'service_order', v_order.id, 'created_by_ai', to_jsonb(v_order),
          jsonb_build_object('conversation_id', p_conversation_id));

  RETURN v_order;
END;
$$;
REVOKE ALL ON FUNCTION public.wa_create_order(uuid, uuid, public.service_type, uuid, text, text, integer, text, text, text, text, public.order_status, timestamptz, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_create_order(uuid, uuid, public.service_type, uuid, text, text, integer, text, text, text, text, public.order_status, timestamptz, numeric) TO service_role;