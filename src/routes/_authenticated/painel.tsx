import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarClock,
  ClipboardList,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  useOrders,
  useEquipments,
  maintenanceStatus,
  formatCurrency,
  formatDateTime,
  orderStatusLabels,
  serviceTypeLabels,
} from "@/lib/app-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel | ClimaGestor" },
      { name: "description", content: "Resumo mensal das ordens de serviço da sua empresa." },
      { property: "og:title", content: "Painel | ClimaGestor" },
      { property: "og:description", content: "Resumo mensal das ordens de serviço da sua empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Painel,
});

type Period = "hoje" | "semana" | "mes";

const periodLabels: Record<Period, string> = {
  hoje: "Hoje",
  semana: "Semana",
  mes: "Mês",
};

function periodStart(period: Period) {
  const now = new Date();
  if (period === "hoje") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "semana") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - start.getDay());
    return start;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function Painel() {
  const { data: orders = [], isLoading, isError } = useOrders();
  const { data: equipments = [] } = useEquipments();
  const [period, setPeriod] = useState<Period>("mes");

  const now = new Date();
  const start = periodStart(period);
  const inPeriod = orders.filter((o) => new Date(o.scheduled_at) >= start);
  const todayOrders = orders.filter(
    (o) => new Date(o.scheduled_at).toDateString() === now.toDateString(),
  );
  const completed = inPeriod.filter((o) => o.status === "concluida");
  const revenue = completed.reduce((s, o) => s + Number(o.amount ?? 0), 0);
  const withAmount = completed.filter((o) => o.amount != null);
  const ticket = withAmount.length
    ? withAmount.reduce((s, o) => s + Number(o.amount), 0) / withAmount.length
    : 0;

  const suffix = period === "hoje" ? "hoje" : period === "semana" ? "na semana" : "no mês";

  const cards = [
    { label: `Ordens ${suffix}`, value: String(inPeriod.length), icon: ClipboardList },
    { label: "Agendadas para hoje", value: String(todayOrders.length), icon: CalendarClock },
    { label: `Concluídas ${suffix}`, value: String(completed.length), icon: CheckCircle2 },
    { label: "Ticket médio", value: formatCurrency(ticket), icon: DollarSign },
    { label: `Faturamento ${suffix}`, value: formatCurrency(revenue), icon: TrendingUp },
  ];

  const overdueEquip = equipments.filter(
    (e) => maintenanceStatus(e.next_maintenance_at) === "vencida",
  );
  const soonEquip = equipments.filter(
    (e) => maintenanceStatus(e.next_maintenance_at, 30) === "proxima",
  );

  const upcoming = [...orders]
    .filter((o) => o.status === "agendada" || o.status === "em_andamento")
    .sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Painel</h1>
          <p className="text-sm text-muted-foreground">Resumo da operação da sua empresa.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          {(Object.keys(periodLabels) as Period[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "outline"}
              className="flex-1 sm:flex-none"
              onClick={() => setPeriod(p)}
            >
              {periodLabels[p]}
            </Button>
          ))}
        </div>
      </header>

      {isError && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Não foi possível carregar as ordens de serviço. Tente novamente.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="min-w-0 truncate text-sm font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
              <c.icon className="h-4 w-4 shrink-0 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{isLoading ? "—" : c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(overdueEquip.length > 0 || soonEquip.length > 0) && (
        <Card className={overdueEquip.length ? "border-destructive/50" : undefined}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Manutenção preventiva
            </CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link to="/equipamentos">Ver equipamentos</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Vencidas</p>
              <p className="text-2xl font-bold text-destructive">{overdueEquip.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Próximos 30 dias</p>
              <p className="text-2xl font-bold text-foreground">{soonEquip.length}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Próximos atendimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando atendimentos...</p>}
          {!isLoading && upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum atendimento em aberto.</p>
          )}
          {upcoming.map((o) => (
            <div
              key={o.id}
              className="grid grid-cols-[minmax(0,1fr)] gap-2 rounded-lg border border-border p-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{o.clients?.name ?? "Cliente"}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {serviceTypeLabels[o.service_type]} • {o.technicians?.name ?? "Sem técnico"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">{formatDateTime(o.scheduled_at)}</span>
                <Badge variant="secondary">{orderStatusLabels[o.status]}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
