import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, ClipboardList, CheckCircle2, DollarSign } from "lucide-react";
import {
  useOrders,
  formatCurrency,
  formatDateTime,
  orderStatusLabels,
  serviceTypeLabels,
} from "@/lib/app-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

function Painel() {
  const { data: orders = [], isLoading } = useOrders();

  const now = new Date();
  const monthOrders = orders.filter((o) => {
    const d = new Date(o.scheduled_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const todayOrders = orders.filter(
    (o) => new Date(o.scheduled_at).toDateString() === now.toDateString(),
  );
  const completed = monthOrders.filter((o) => o.status === "concluida");
  const withAmount = completed.filter((o) => o.amount != null);
  const ticket = withAmount.length
    ? withAmount.reduce((s, o) => s + Number(o.amount), 0) / withAmount.length
    : 0;

  const cards = [
    { label: "Ordens no mês", value: String(monthOrders.length), icon: ClipboardList },
    { label: "Agendadas para hoje", value: String(todayOrders.length), icon: CalendarClock },
    { label: "Concluídas no mês", value: String(completed.length), icon: CheckCircle2 },
    { label: "Ticket médio", value: formatCurrency(ticket), icon: DollarSign },
  ];

  const upcoming = [...orders]
    .filter((o) => o.status === "agendada" || o.status === "em_andamento")
    .sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel</h1>
        <p className="text-sm text-muted-foreground">Resumo da operação da sua empresa.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{isLoading ? "—" : c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximos atendimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum atendimento em aberto.</p>
          )}
          {upcoming.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
            >
              <div>
                <p className="font-medium text-foreground">{o.clients?.name ?? "Cliente"}</p>
                <p className="text-sm text-muted-foreground">
                  {serviceTypeLabels[o.service_type]} • {o.technicians?.name ?? "Sem técnico"}
                </p>
              </div>
              <div className="flex items-center gap-3">
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
