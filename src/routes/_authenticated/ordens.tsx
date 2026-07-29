import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  useOrders,
  useClients,
  useTechnicians,
  useIsAdmin,
  useProfile,
  orderStatusLabels,
  serviceTypeLabels,
  formatCurrency,
  formatDateTime,
  type OrderWithRelations,
} from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/_authenticated/ordens")({
  head: () => ({
    meta: [
      { title: "Ordens de serviço | ClimaGestor" },
      { name: "description", content: "Agendamento e acompanhamento das ordens de serviço." },
      { property: "og:title", content: "Ordens de serviço | ClimaGestor" },
      { property: "og:description", content: "Agendamento e acompanhamento das ordens de serviço." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Ordens,
});

const schema = z.object({
  client_id: z.string().uuid("Selecione o cliente"),
  technician_id: z.string().optional(),
  service_type: z.enum([
    "instalacao",
    "manutencao_preventiva",
    "manutencao_corretiva",
    "limpeza",
    "recarga_gas",
  ]),
  status: z.enum(["agendada", "em_andamento", "concluida", "cancelada"]),
  scheduled_at: z.string().min(1, "Informe a data"),
  equipment: z.string().trim().max(150).optional().or(z.literal("")),
  btus: z.string().optional(),
  amount: z.string().optional(),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

function toLocalInput(value: string) {
  const d = new Date(value);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function Ordens() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useOrders();
  const { data: clients = [] } = useClients();
  const { data: technicians = [] } = useTechnicians();
  const { data: isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const [statusFilter, setStatusFilter] = useState("todas");
  const [techFilter, setTechFilter] = useState("todos");
  const [editing, setEditing] = useState<OrderWithRelations | null>(null);
  const [open, setOpen] = useState(false);

  const save = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const payload = {
        client_id: values.client_id,
        technician_id: values.technician_id && values.technician_id !== "none" ? values.technician_id : null,
        service_type: values.service_type,
        status: values.status,
        scheduled_at: new Date(values.scheduled_at).toISOString(),
        completed_at: values.status === "concluida" ? new Date().toISOString() : null,
        equipment: values.equipment || null,
        btus: values.btus ? Number(values.btus) : null,
        amount: values.amount ? Number(values.amount) : null,
        description: values.description || null,
      };
      if (editing) {
        const { error } = await supabase.from("service_orders").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("service_orders")
          .insert({ ...payload, company_id: profile!.company_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Ordem de serviço salva.");
      setOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["service_orders"] });
    },
    onError: () => toast.error("Não foi possível salvar a ordem de serviço."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ordem removida.");
      queryClient.invalidateQueries({ queryKey: ["service_orders"] });
    },
    onError: () => toast.error("Não foi possível remover a ordem."),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    save.mutate(parsed.data);
  }

  const filtered = orders.filter(
    (o) =>
      (statusFilter === "todas" || o.status === statusFilter) &&
      (techFilter === "todos" || o.technician_id === techFilter),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ordens de serviço</h1>
          <p className="text-sm text-muted-foreground">Agendamentos e atendimentos da equipe.</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Nova ordem
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-52 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as situações</SelectItem>
            {Object.entries(orderStatusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={techFilter} onValueChange={setTechFilter}>
          <SelectTrigger className="w-52 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os técnicos</SelectItem>
            {technicians.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma ordem encontrada.</p>
        )}
        {filtered.map((o) => (
          <Card key={o.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{o.clients?.name ?? "Cliente"}</p>
                  <Badge variant="secondary">{orderStatusLabels[o.status]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {serviceTypeLabels[o.service_type]} • {o.technicians?.name ?? "Sem técnico"} •{" "}
                  {formatDateTime(o.scheduled_at)}
                </p>
                {o.amount != null && (
                  <p className="text-sm font-medium text-primary">{formatCurrency(Number(o.amount))}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setEditing(o);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {isAdmin && (
                  <Button variant="outline" size="icon" onClick={() => remove.mutate(o.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar ordem" : "Nova ordem de serviço"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente</Label>
              <Select name="client_id" defaultValue={editing?.client_id ?? undefined} disabled={!isAdmin}>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="technician_id">Técnico</Label>
                <Select
                  name="technician_id"
                  defaultValue={editing?.technician_id ?? "none"}
                  disabled={!isAdmin}
                >
                  <SelectTrigger id="technician_id">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem técnico</SelectItem>
                    {technicians.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_type">Tipo de serviço</Label>
                <Select
                  name="service_type"
                  defaultValue={editing?.service_type ?? "manutencao_preventiva"}
                >
                  <SelectTrigger id="service_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(serviceTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Situação</Label>
                <Select name="status" defaultValue={editing?.status ?? "agendada"}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(orderStatusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled_at">Data e hora</Label>
                <Input
                  id="scheduled_at"
                  name="scheduled_at"
                  type="datetime-local"
                  required
                  defaultValue={toLocalInput(editing?.scheduled_at ?? new Date().toISOString())}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="equipment">Equipamento</Label>
                <Input
                  id="equipment"
                  name="equipment"
                  defaultValue={editing?.equipment ?? ""}
                  maxLength={150}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="btus">BTUs</Label>
                <Input id="btus" name="btus" type="number" defaultValue={editing?.btus ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={editing?.amount ?? ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editing?.description ?? ""}
                maxLength={1000}
              />
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
