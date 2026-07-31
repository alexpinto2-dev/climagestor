import { createFileRoute, Link } from "@tanstack/react-router";
import { Snowflake, ClipboardList, Users, FileText, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClimaGestor — Gestão para empresas de climatização" },
      {
        name: "description",
        content:
          "Controle clientes, técnicos, ordens de serviço e orçamentos da sua empresa de ar-condicionado em Aracaju.",
      },
      { property: "og:title", content: "ClimaGestor — Gestão para climatização" },
      {
        property: "og:description",
        content: "Ordens de serviço, orçamentos e relatórios para empresas de ar-condicionado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: ClipboardList, title: "Ordens de serviço", desc: "Agende, acompanhe e conclua atendimentos." },
  { icon: Users, title: "Clientes e técnicos", desc: "Cadastros completos por empresa." },
  { icon: FileText, title: "Orçamentos", desc: "Monte propostas com itens e valores." },
  { icon: BarChart3, title: "Relatórios", desc: "Faturamento e desempenho da equipe." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Snowflake className="h-6 w-6 text-primary" />
          ClimaGestor
        </div>
        <Button asChild>
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="py-16 md:py-24">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Aracaju • Climatização</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-foreground md:text-5xl">
            A gestão completa da sua empresa de ar-condicionado, em um só lugar
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Cadastre clientes e técnicos, agende ordens de serviço, envie orçamentos e acompanhe os
            resultados do mês. Cada empresa enxerga somente os próprios dados.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Entrar no sistema</Link>
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Os acessos são criados pelo administrador do sistema.
          </p>

        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <f.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 font-semibold text-card-foreground">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
