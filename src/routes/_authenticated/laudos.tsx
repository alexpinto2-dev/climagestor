import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  useClients,
  useTechnicalReports,
  useProfile,
  reportStatusLabels,
  formatDate,
  type ReportWithClient,
} from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/laudos")({
  head: () => ({
    meta: [
      { title: "Laudos técnicos | ClimaGestor" },
      { name: "description", content: "Relatórios e laudos técnicos dos atendimentos." },
      { property: "og:title", content: "Laudos técnicos | ClimaGestor" },
      { property: "og:description", content: "Relatórios técnicos da sua empresa de climatização." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Laudos,
});

const schema = z.object({
  client_id: z.string().uuid("Selecione o cliente"),
  report_date: z.string().min(1, "Informe a data"),
  objective: z.string().trim().max(2000).optional().or(z.literal("")),
  technicians: z.string().trim().max(300).optional().or(z.literal("")),
  findings: z.string().trim().max(4000).optional().or(z.literal("")),
  conclusion: z.string().trim().max(4000).optional().or(z.literal("")),
  status: z.enum(["rascunho", "finalizado", "entregue"]),
});

function Laudos() {
  const queryClient = useQueryClient();
  const { data: reports = [], isLoading } = useTechnicalReports();
  const { data: clients = [] } = useClients();
  const { data: profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReportWithClient | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");

  const save = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const payload = {
        client_id: values.client_id,
        report_date: values.report_date,
        objective: values.objective || null,
        technicians: values.technicians || null,
        findings: values.findings || null,
        conclusion: values.conclusion || null,
        status: values.status,
      };
      if (editing) {
        const { error } = await supabase
          .from("technical_reports")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("technical_reports")
          .insert({ ...payload, company_id: profile!.company_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Laudo atualizado." : "Laudo criado.");
      setOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["technical_reports"] });
    },
    onError: () => toast.error("Não foi possível salvar o laudo."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("technical_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Laudo removido.");
      queryClient.invalidateQueries({ queryKey: ["technical_reports"] });
    },
    onError: () => toast.error("Não foi possível remover o laudo."),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    save.mutate(parsed.data);
  }

  const filtered = reports.filter((r) => statusFilter === "todos" || r.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laudos</h1>
          <p className="text-sm text-muted-foreground">Relatórios técnicos dos atendimentos.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo laudo
        </Button>
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="max-w-xs bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os status</SelectItem>
          {Object.entries(reportStatusLabels).map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid gap-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum laudo encontrado.</p>
        )}
        {filtered.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{r.clients?.name ?? "Sem cliente"}</p>
                  <Badge variant="secondary">{reportStatusLabels[r.status] ?? r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(r.report_date)}
                  {r.technicians ? ` • ${r.technicians}` : ""}
                </p>
                {r.objective && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.objective}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setEditing(r);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => remove.mutate(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar laudo" : "Novo relatório técnico"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" key={editing?.id ?? "novo"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client_id">Cliente</Label>
                <Select name="client_id" defaultValue={editing?.client_id ?? undefined}>
                  <SelectTrigger id="client_id">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="report_date">Data</Label>
                <Input
                  id="report_date"
                  name="report_date"
                  type="date"
                  defaultValue={editing?.report_date ?? new Date().toISOString().slice(0, 10)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="objective">Objetivo</Label>
              <Textarea id="objective" name="objective" defaultValue={editing?.objective ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="technicians">Técnicos responsáveis</Label>
              <Input
                id="technicians"
                name="technicians"
                placeholder="Separe os nomes por vírgula"
                defaultValue={editing?.technicians ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="findings">Constatações</Label>
              <Textarea id="findings" name="findings" defaultValue={editing?.findings ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conclusion">Conclusão</Label>
              <Textarea id="conclusion" name="conclusion" defaultValue={editing?.conclusion ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Situação</Label>
              <Select name="status" defaultValue={editing?.status ?? "rascunho"}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(reportStatusLabels).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={save.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
