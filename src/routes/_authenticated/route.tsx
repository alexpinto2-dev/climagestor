import { useState } from "react";
import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Snowflake,
  LayoutDashboard,
  Users,
  Wrench,
  ClipboardList,
  FileText,
  BarChart3,
  LogOut,
  Menu,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useIsAdmin } from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const navItems = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard, adminOnly: false },
  { to: "/clientes", label: "Clientes", icon: Users, adminOnly: false },
  { to: "/tecnicos", label: "Técnicos", icon: Wrench, adminOnly: true },
  { to: "/ordens", label: "Ordens de serviço", icon: ClipboardList, adminOnly: false },
  { to: "/orcamentos", label: "Orçamentos", icon: FileText, adminOnly: true },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, adminOnly: true },
] as const;

function OnboardingCompany() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const companyName = String(form.get("companyName") ?? "").trim();
    const fullName = String(form.get("fullName") ?? "").trim();
    if (companyName.length < 2 || fullName.length < 2) {
      return toast.error("Preencha o nome da empresa e o seu nome.");
    }
    setLoading(true);
    const { error } = await supabase.rpc("setup_company", {
      p_company_name: companyName,
      p_full_name: fullName,
    });
    setLoading(false);
    if (error) return toast.error("Não foi possível criar a empresa.");
    toast.success("Empresa criada!");
    await queryClient.invalidateQueries();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Cadastre sua empresa</CardTitle>
          <CardDescription>
            Sua conta ainda não está vinculada a uma empresa. Crie a sua para começar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da empresa</Label>
              <Input id="companyName" name="companyName" required maxLength={150} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Seu nome</Label>
              <Input id="fullName" name="fullName" required maxLength={120} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              Criar empresa
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!profile) return <OnboardingCompany />;

  const items = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="flex min-h-screen bg-secondary">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex-col bg-sidebar p-4 text-sidebar-foreground transition-transform md:static md:flex md:translate-x-0",
          open ? "flex translate-x-0" : "hidden -translate-x-full md:flex",
        )}
      >
        <div className="mb-8 flex items-center gap-2 px-2 py-2 font-semibold">
          <Snowflake className="h-6 w-6 text-sidebar-primary" />
          ClimaGestor
        </div>
        <nav className="flex-1 space-y-1">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent",
                pathname === item.to && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 space-y-2 border-t border-sidebar-border pt-4 text-sm">
          <div className="px-3">
            <p className="font-medium">{profile.full_name || "Usuário"}</p>
            <p className="text-xs opacity-70">{profile.companies?.name}</p>
            <p className="text-xs opacity-70">{isAdmin ? "Administrador" : "Técnico"}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">ClimaGestor</span>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
