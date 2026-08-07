import { z } from "zod";

export const clientSchema = z.object({
  instance_name: z.string().min(1).max(120),
  phone_e164: z.string().min(8).max(20).regex(/^\+?[0-9]+$/),
  name: z.string().max(200).optional().nullable(),
});

export const orderSchema = z.object({
  instance_name: z.string().min(1).max(120),
  phone_e164: z.string().min(8).max(20).regex(/^\+?[0-9]+$/),
  name: z.string().max(200).optional().nullable(),
  external_ref: z.string().max(200).optional().nullable(),
  conversation_id: z.string().uuid().optional().nullable(),
  service_type: z.enum([
    "instalacao",
    "manutencao_preventiva",
    "manutencao_corretiva",
    "limpeza",
    "recarga_gas",
    "outro",
  ]),
  equipment: z.string().max(200).optional().nullable(),
  btus: z.number().int().min(0).max(1000000).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  reported_problem: z.string().max(4000).optional().nullable(),
  address: z.string().max(400).optional().nullable(),
  neighborhood: z.string().max(200).optional().nullable(),
  status: z
    .enum(["agendada", "em_andamento", "concluida", "cancelada"])
    .optional(),
  scheduled_at: z.string().datetime({ offset: true }).optional().nullable(),
  amount: z.number().min(0).max(10000000).optional().nullable(),
});

export const messageSchema = z.object({
  instance_name: z.string().min(1).max(120),
  phone_e164: z.string().min(8).max(20).regex(/^\+?[0-9]+$/),
  name: z.string().max(200).optional().nullable(),
  external_message_id: z.string().max(300).optional().nullable(),
  direction: z.enum(["incoming", "outgoing"]),
  message_type: z.string().max(50).optional(),
  content: z.string().max(20000).optional().nullable(),
  author_type: z.enum(["client", "ai", "human", "system"]),
  intent: z.string().max(120).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkAuth(request: Request): Response | null {
  const secret = process.env["N8N_WEBHOOK_SECRET"];
  if (!secret) return jsonResponse({ error: "Integration not configured" }, 503);
  const header =
    request.headers.get("x-n8n-token") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!header || !timingSafeEqual(header, secret)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  return null;
}

type Admin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

/** Resolves the tenant from the WhatsApp instance name. The caller never picks company_id. */
export async function resolveInstance(admin: Admin, instanceName: string) {
  const { data, error } = await admin
    .from("whatsapp_instances")
    .select("id, company_id, status")
    .eq("instance_name", instanceName)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.status !== "active") return null;
  return data;
}

export async function ensureClient(
  admin: Admin,
  companyId: string,
  phone: string,
  name?: string | null,
) {
  const { data, error } = await admin.rpc("wa_upsert_client", {
    p_company_id: companyId,
    p_phone_e164: phone,
    p_name: name ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as { id: string; name: string; phone_e164: string | null };
}

export async function ensureConversation(
  admin: Admin,
  companyId: string,
  instanceId: string,
  clientId: string,
  phone: string,
  intent?: string | null,
) {
  const { data: existing } = await admin
    .from("conversations")
    .select("id")
    .eq("company_id", companyId)
    .eq("phone_e164", phone)
    .eq("status", "open")
    .maybeSingle();

  if (existing) {
    await admin
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        client_id: clientId,
        ...(intent ? { intent } : {}),
      })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await admin
    .from("conversations")
    .insert({
      company_id: companyId,
      client_id: clientId,
      whatsapp_instance_id: instanceId,
      phone_e164: phone,
      status: "open",
      intent: intent ?? null,
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}
