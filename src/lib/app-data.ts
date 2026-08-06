import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Client = Tables<"clients">;
export type Technician = Tables<"technicians">;
export type ServiceOrder = Tables<"service_orders">;
export type Quote = Tables<"quotes">;
export type Profile = Tables<"profiles">;

export const serviceTypeLabels: Record<string, string> = {
  instalacao: "Instalação",
  manutencao_preventiva: "Manutenção preventiva",
  manutencao_corretiva: "Manutenção corretiva",
  limpeza: "Limpeza",
  recarga_gas: "Recarga de gás",
  outro: "Outro",
};

export const orderOriginLabels: Record<string, string> = {
  manual: "Manual",
  whatsapp: "WhatsApp",
  ia: "IA",
};

export const orderStatusLabels: Record<string, string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const quoteStatusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  expirado: "Expirado",
};

export const clientTypeLabels: Record<string, string> = {
  residencial: "Residencial",
  comercial: "Comercial",
};

export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*, companies(name)")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (error) throw error;
      return data as (Profile & { companies: { name: string } | null }) | null;
    },
  });
}

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      if (error) throw error;
      return (data ?? []).some((r) => r.role === "admin");
    },
  });
}

export function useIsSuperAdmin() {
  return useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_super_admin");
      if (error) return false;
      return data === true;
    },
  });
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useTechnicians() {
  return useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data, error } = await supabase.from("technicians").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export type OrderWithRelations = ServiceOrder & {
  clients: { name: string } | null;
  technicians: { name: string } | null;
};

export function useOrders() {
  return useQuery({
    queryKey: ["service_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*, clients(name), technicians(name)")
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data as OrderWithRelations[];
    },
  });
}

export type QuoteItem = { description: string; quantity: number; unitPrice: number };
export type QuoteWithClient = Quote & { clients: { name: string } | null };

export function useQuotes() {
  return useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as QuoteWithClient[];
    },
  });
}

export function useClientOrders(clientId: string | null) {
  return useQuery({
    queryKey: ["service_orders", "client", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*, clients(name), technicians(name)")
        .eq("client_id", clientId!)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data as OrderWithRelations[];
    },
  });
}
