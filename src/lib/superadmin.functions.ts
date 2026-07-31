import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuperAdmin(supabase: any) {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error || data !== true) throw new Error("Acesso negado");
}

export const listCompaniesOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [companies, profiles, orders] = await Promise.all([
      supabaseAdmin.from("companies").select("id, name, city, active, created_at").order("name"),
      supabaseAdmin.from("profiles").select("company_id"),
      supabaseAdmin.from("service_orders").select("company_id"),
    ]);
    if (companies.error) throw companies.error;

    const count = (rows: { company_id: string }[] | null, id: string) =>
      (rows ?? []).filter((r) => r.company_id === id).length;

    return (companies.data ?? []).map((c) => ({
      ...c,
      users: count(profiles.data as any, c.id),
      orders: count(orders.data as any, c.id),
    }));
  });

export const setCompanyActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("companies")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const renameCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), name: z.string().trim().min(2).max(150) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("companies").update({ name: data.name }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const createCompanyWithAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyName: z.string().trim().min(2).max(150),
        city: z.string().trim().max(100).optional(),
        adminName: z.string().trim().min(2).max(120),
        adminEmail: z.string().trim().email().max(255),
        adminPassword: z.string().min(8).max(72),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: data.adminEmail,
      password: data.adminPassword,
      email_confirm: true,
      user_metadata: { full_name: data.adminName },
    });
    if (userError || !created.user) {
      throw new Error(
        userError?.message?.includes("already")
          ? "Este e-mail já está cadastrado."
          : "Não foi possível criar o usuário administrador.",
      );
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({ name: data.companyName, city: data.city || "Aracaju" })
      .select("id")
      .single();
    if (companyError || !company) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("Não foi possível criar a empresa.");
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      company_id: company.id,
      full_name: data.adminName,
      email: data.adminEmail,
    });
    if (profileError) {
      await supabaseAdmin.from("companies").delete().eq("id", company.id);
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("Não foi possível criar o perfil do administrador.");
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "admin" });
    if (roleError) throw new Error("Empresa criada, mas houve erro ao definir o papel de administrador.");

    return { companyId: company.id };
  });
