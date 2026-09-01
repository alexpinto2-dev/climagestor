import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleSchema = z.enum(["admin", "administrativo", "tecnico"]);

/** Garante que o usuário logado é admin de uma empresa e devolve o company_id. */
async function assertCompanyAdmin(supabase: any): Promise<string> {
  const [{ data: isAdmin }, { data: companyId }] = await Promise.all([
    supabase.rpc("is_company_admin"),
    supabase.rpc("get_user_company_id"),
  ]);
  if (isAdmin !== true || !companyId) throw new Error("Acesso negado");
  return companyId as string;
}

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await assertCompanyAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone, created_at")
      .eq("company_id", companyId)
      .order("full_name");
    if (error) throw error;

    const ids = (profiles ?? []).map((p) => p.id);
    const { data: roles } = ids.length
      ? await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids)
      : { data: [] as { user_id: string; role: string }[] };

    return (profiles ?? []).map((p) => ({
      ...p,
      role: (roles ?? []).find((r) => r.user_id === p.id)?.role ?? "tecnico",
    }));
  });

export const createMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(255),
        phone: z.string().trim().max(30).optional(),
        role: roleSchema,
        password: z.string().min(8).max(72),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const companyId = await assertCompanyAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (userError || !created.user) {
      throw new Error(
        userError?.message?.includes("already")
          ? "Este e-mail já está cadastrado."
          : "Não foi possível criar o usuário.",
      );
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      company_id: companyId,
      full_name: data.fullName,
      email: data.email,
      phone: data.phone || null,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("Não foi possível criar o perfil do membro.");
    }

    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });

    if (data.role === "tecnico") {
      await supabaseAdmin.from("technicians").insert({
        company_id: companyId,
        profile_id: created.user.id,
        name: data.fullName,
        phone: data.phone || null,
      });
    }

    return { id: created.user.id };
  });

export const updateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        fullName: z.string().trim().min(2).max(120),
        phone: z.string().trim().max(30).optional(),
        role: roleSchema,
        password: z.string().min(8).max(72).optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const companyId = await assertCompanyAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id, company_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!target || target.company_id !== companyId) throw new Error("Membro não encontrado");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.fullName, phone: data.phone || null })
      .eq("id", data.id);
    if (error) throw error;

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.id, role: data.role });

    if (data.password) {
      await supabaseAdmin.auth.admin.updateUserById(data.id, { password: data.password });
    }

    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const companyId = await assertCompanyAdmin(context.supabase);
    if (data.id === context.userId) throw new Error("Você não pode remover a própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id, company_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!target || target.company_id !== companyId) throw new Error("Membro não encontrado");

    await supabaseAdmin.from("technicians").update({ profile_id: null }).eq("profile_id", data.id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    await supabaseAdmin.from("profiles").delete().eq("id", data.id);
    await supabaseAdmin.auth.admin.deleteUser(data.id);
    return { ok: true };
  });
