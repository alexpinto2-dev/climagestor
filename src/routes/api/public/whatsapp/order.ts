import { createFileRoute } from "@tanstack/react-router";
import {
  checkAuth,
  ensureClient,
  jsonResponse,
  orderSchema,
  resolveInstance,
} from "@/lib/whatsapp-api.server";

export const Route = createFileRoute("/api/public/whatsapp/order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = checkAuth(request);
        if (unauthorized) return unauthorized;

        const parsed = orderSchema.safeParse(await request.json());
        if (!parsed.success) {
          return jsonResponse({ error: "Invalid payload" }, 400);
        }
        const p = parsed.data;
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const instance = await resolveInstance(supabaseAdmin, p.instance_name);
        if (!instance) return jsonResponse({ error: "Unknown instance" }, 404);

        const client = await ensureClient(
          supabaseAdmin,
          instance.company_id,
          p.phone_e164,
          p.name,
        );

        const { data, error } = await supabaseAdmin.rpc("wa_create_order", {
          p_company_id: instance.company_id,
          p_client_id: client.id,
          p_service_type: p.service_type,
          p_conversation_id: p.conversation_id ?? null,
          p_external_ref: p.external_ref ?? null,
          p_equipment: p.equipment ?? null,
          p_btus: p.btus ?? null,
          p_description: p.description ?? null,
          p_reported_problem: p.reported_problem ?? null,
          p_address: p.address ?? null,
          p_neighborhood: p.neighborhood ?? null,
          p_status: p.status ?? "agendada",
          p_scheduled_at: p.scheduled_at ?? null,
          p_amount: p.amount ?? null,
        });
        if (error) return jsonResponse({ error: error.message }, 400);

        const order = data as { id: string; status: string };
        return jsonResponse({ order_id: order.id, status: order.status });
      },
    },
  },
});
