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
          p_conversation_id: p.conversation_id ?? undefined,
          p_external_ref: p.external_ref ?? undefined,
          p_equipment: p.equipment ?? undefined,
          p_btus: p.btus ?? undefined,
          p_description: p.description ?? undefined,
          p_reported_problem: p.reported_problem ?? undefined,
          p_address: p.address ?? undefined,
          p_neighborhood: p.neighborhood ?? undefined,
          p_status: p.status ?? "agendada",
          p_scheduled_at: p.scheduled_at ?? undefined,
          p_amount: p.amount ?? undefined,
        });
        if (error) return jsonResponse({ error: error.message }, 400);

        const order = data as { id: string; status: string };
        return jsonResponse({ order_id: order.id, status: order.status });
      },
    },
  },
});
