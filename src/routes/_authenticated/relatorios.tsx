import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useOrders,
  useTechnicians,
  formatCurrency,
  orderStatusLabels,
  serviceTypeLabels,
} from "@/lib/app-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios | ClimaGestor" },
      { name: "description", content: "Faturamento, situações e desempenho por técnico." },
      { property: "og:title", content: "Relatórios | ClimaGestor" },
      { property: "og:description", content: "Faturamento, situações e desempenho por técnico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Relatorios,
});

function Relatorios() {
  const { data: orders = [] } = useOrders();
  const { data: technicians = [] } = useTechnicians();
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const inRange = orders.filter((o) => {
    const d = new Date(o.scheduled_at).toISOString().slice(0, 10);
    return d >= from && d <= to;
  });

  const revenue = inRange
    .filter((o) => o.status === "concluida")
    .reduce((s, o) => s + Number(o.amount ?? 0), 0);

  const byStatus = Object.keys(orderStatusLabels).map((k) => ({
    label: orderStatusLabels[k],
    count: inRange.filter((o) => o.status === k).length,
  }));

  const byType = Object.keys(serviceTypeLabels).map((k) => ({
    label: serviceTypeLabels[k],
    count: inRange.filter((o) => o.service_type === k).length,
  }));

  const byTech = technicians.map((t) => {
    const list = inRange.filter((o) => o.technician_id === t.id);
    return {
      name: t.name,
      total: list.length,
      done: list.filter((o) => o.status === "concluida").length,
      revenue: list
        .filter((o) => o.status === "concluida")
        .reduce((s, o) => s + Number(o.amount ?? 0), 0),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Resultados por período.</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="space-y-2">
          <Label htmlFor="from">De</Label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to">Até</Label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-background"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Faturamento concluído</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ordens no período</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{inRange.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Técnicos ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {technicians.filter((t) => t.active).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ordens por situação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byStatus.map((s) => (
              <div key={s.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-medium text-foreground">{s.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Serviços mais realizados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...byType]
              .sort((a, b) => b.count - a.count)
              .map((s) => (
                <div key={s.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-medium text-foreground">{s.count}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Desempenho por técnico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {byTech.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum técnico cadastrado.</p>
          )}
          {byTech.map((t) => (
            <div key={t.name} className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-medium text-foreground">{t.name}</span>
              <span className="text-muted-foreground">
                {t.total} ordens • {t.done} concluídas • {formatCurrency(t.revenue)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
