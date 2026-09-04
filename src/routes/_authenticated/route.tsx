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
import logoAsset from "@/assets/logo-climagestor.png.asset.json";
import {
  LayoutDashboard,
  Users,
  AirVent,
  Wrench,
  ClipboardList,
  FileText,
  BarChart3,
  Building2,
  LogOut,
  Menu,
  FileCheck2,
  FileSignature,
  UserCog,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useIsAdmin, useIsSuperAdmin } from "@/lib/app-data";
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
  { to: "/equipamentos", label: "Equipamentos", icon: AirVent, adminOnly: false },
  { to: "/tecnicos", label: "Técnicos", icon: Wrench, adminOnly: true },
  { to: "/ordens", label: "Ordens de serviço", icon: ClipboardList, adminOnly: false },
  { to: "/orcamentos", label: "Orçamentos", icon: FileText, adminOnly: true },
  { to: "/laudos", label: "Laudos", icon: FileCheck2, adminOnly: false },
  { to: "/contratos", label: "Contratos", icon: FileSignature, adminOnly: true },
  { to: "/whatsapp", label: "Atendimento por IA", icon: Bot, adminOnly: true },
  { to: "/conversas", label: "Conversas", icon: MessageSquare, adminOnly: false },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, adminOnly: true },
  { to: "/perfil", label: "Perfil", icon: UserCog, adminOnly: false },
] as const;


function NoCompany({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Conta sem empresa vinculada</CardTitle>
          <CardDescription>
            Sua conta ainda não está vinculada a nenhuma empresa. Peça ao administrador do sistema
            para liberar seu acesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={onSignOut}>
            Sair
          </Button>
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
  const { data: isSuperAdmin, isLoading: loadingSuper } = useIsSuperAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading || loadingSuper) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!profile && !isSuperAdmin) return <NoCompany onSignOut={handleSignOut} />;

  const items = [
    ...(isSuperAdmin
      ? [{ to: "/empresas", label: "Empresas", icon: Building2, adminOnly: false } as const]
      : []),
    ...(profile ? navItems.filter((item) => !item.adminOnly || isAdmin || isSuperAdmin) : []),
  ];


  return (
    <div className="flex min-h-screen bg-secondary">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex-col bg-sidebar p-4 text-sidebar-foreground transition-transform md:static md:flex md:translate-x-0",
          open ? "flex translate-x-0" : "hidden -translate-x-full md:flex",
        )}
      >
        <div className="mb-8 px-2 py-2">
          <img
            src={profile?.companies?.logo_url || logoAsset.url}
            alt={profile?.companies?.name || "ClimaGestor"}
            className="max-h-14 w-auto"
          />
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
            <p className="font-medium">{profile?.full_name || "Usuário"}</p>
            <p className="text-xs opacity-70">{profile?.companies?.name}</p>
            <p className="text-xs opacity-70">
              {isSuperAdmin ? "Super Admin" : isAdmin ? "Administrador" : "Técnico"}
            </p>
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
