import { createFileRoute } from "@tanstack/react-router";
import {
  checkAuth,
  ensureClient,
  ensureConversation,
  jsonResponse,
  messageSchema,
  resolveInstance,
} from "@/lib/whatsapp-api.server";

export const Route = createFileRoute("/api/public/whatsapp/message")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = checkAuth(request);
        if (unauthorized) return unauthorized;

        const parsed = messageSchema.safeParse(await request.json());
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
        const conversationId = await ensureConversation(
          supabaseAdmin,
          instance.company_id,
          instance.id,
          client.id,
          p.phone_e164,
          p.intent,
        );

        const { data, error } = await supabaseAdmin
          .from("messages")
          .upsert(
            {
              company_id: instance.company_id,
              conversation_id: conversationId,
              client_id: client.id,
              whatsapp_instance_id: instance.id,
              external_message_id: p.external_message_id ?? null,
              direction: p.direction,
              message_type: p.message_type ?? "text",
              content: p.content ?? null,
              author_type: p.author_type,
              metadata: (p.metadata ?? {}) as Record<string, unknown>,
            },
            { onConflict: "company_id,external_message_id", ignoreDuplicates: true },
          )
          .select("id")
          .maybeSingle();
        if (error) return jsonResponse({ error: error.message }, 400);

        return jsonResponse({
          conversation_id: conversationId,
          client_id: client.id,
          message_id: data?.id ?? null,
          duplicate: !data,
        });
      },
    },
  },
});
