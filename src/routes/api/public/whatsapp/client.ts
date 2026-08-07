import { createFileRoute } from "@tanstack/react-router";
import {
  checkAuth,
  clientSchema,
  ensureClient,
  jsonResponse,
  resolveInstance,
} from "@/lib/whatsapp-api.server";

export const Route = createFileRoute("/api/public/whatsapp/client")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = checkAuth(request);
        if (unauthorized) return unauthorized;

        const parsed = clientSchema.safeParse(await request.json());
        if (!parsed.success) {
          return jsonResponse({ error: "Invalid payload" }, 400);
        }
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const instance = await resolveInstance(
          supabaseAdmin,
          parsed.data.instance_name,
        );
        if (!instance) return jsonResponse({ error: "Unknown instance" }, 404);

        const client = await ensureClient(
          supabaseAdmin,
          instance.company_id,
          parsed.data.phone_e164,
          parsed.data.name,
        );
        return jsonResponse({ client_id: client.id, name: client.name });
      },
    },
  },
});
