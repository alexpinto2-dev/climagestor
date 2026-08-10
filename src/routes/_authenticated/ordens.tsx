import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, List, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  useOrders,
  useClients,
  useTechnicians,
  useIsAdmin,
  useProfile,
  useClientEquipments,
  equipmentTypeLabels,
  orderStatusLabels,
  serviceTypeLabels,
  orderOriginLabels,
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
  technician_id: z.string().min(1, "Selecione o técnico responsável"),
  service_type: z.enum([
    "instalacao",
    "manutencao_preventiva",
    "manutencao_corretiva",
    "limpeza",
    "recarga_gas",
    "outro",
  ]),
  status: z.enum(["agendada", "em_andamento", "concluida", "cancelada"]),
  origin: z.enum(["manual", "whatsapp", "ia"]),
  scheduled_at: z.string().min(1, "Informe a data"),
  reported_problem: z.string().trim().min(3, "Descreva o problema relatado").max(1000),
  address: z.string().trim().min(3, "Informe o endereço do atendimento").max(255),
  neighborhood: z.string().trim().min(2, "Informe o bairro").max(100),
  equipment: z.string().trim().max(150).optional().or(z.literal("")),
  equipment_id: z.string().optional(),
  btus: z.string().optional(),
  amount: z.string().optional(),
  internal_notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

function toLocalInput(value: string) {
  const d = new Date(value);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function dayKey(value: string) {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const statusTone: Record<string, string> = {
  agendada: "bg-primary/15 text-primary",
  em_andamento: "bg-accent/20 text-accent-foreground",
  concluida: "bg-secondary text-secondary-foreground",
  cancelada: "bg-destructive/15 text-destructive",
};

function CalendarView({
  orders,
  onSelect,
}: {
  orders: OrderWithRelations[];
  onSelect: (order: OrderWithRelations) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const byDay = useMemo(() => {
    const map = new Map<string, OrderWithRelations[]>();
    for (const o of orders) {
      const key = dayKey(o.scheduled_at);
      map.set(key, [...(map.get(key) ?? []), o]);
    }
    return map;
  }, [orders]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const today = new Date();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="font-medium capitalize text-foreground">
            {cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} className="min-h-20 rounded-md" />;
            const items = byDay.get(`${year}-${month}-${day}`) ?? [];
            const isToday =
              today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            return (
              <div
                key={day}
                className={`min-h-20 rounded-md border p-1 text-left ${
                  isToday ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <span className="text-xs text-muted-foreground">{day}</span>
                <div className="mt-1 space-y-1">
                  {items.slice(0, 3).map((o) => (
                    <button
                      key={o.id}
                      onClick={() => onSelect(o)}
                      className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] ${statusTone[o.status]}`}
                      title={`${o.clients?.name ?? ""} — ${serviceTypeLabels[o.service_type]}`}
                    >
                      {new Date(o.scheduled_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      {o.clients?.name ?? "Cliente"}
                    </button>
                  ))}
                  {items.length > 3 && (
                    <span className="block text-[10px] text-muted-foreground">
                      +{items.length - 3} mais
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
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
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [view, setView] = useState<"lista" | "calendario">("lista");
  const [editing, setEditing] = useState<OrderWithRelations | null>(null);
  const [open, setOpen] = useState(false);
  const [formClientId, setFormClientId] = useState<string | undefined>(undefined);
  const { data: formEquipments = [] } = useClientEquipments(formClientId);

  const save = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const payload = {
        client_id: values.client_id,
        technician_id: values.technician_id,
        service_type: values.service_type,
        status: values.status,
        origin: values.origin,
        scheduled_at: new Date(values.scheduled_at).toISOString(),
        completed_at: values.status === "concluida" ? new Date().toISOString() : null,
        reported_problem: values.reported_problem,
        description: values.reported_problem,
        address: values.address,
        neighborhood: values.neighborhood,
        internal_notes: values.internal_notes || null,
        equipment: values.equipment || null,
        equipment_id: values.equipment_id && values.equipment_id !== "nenhum" ? values.equipment_id : null,
        btus: values.btus ? Number(values.btus) : null,
        amount: values.amount ? Number(values.amount) : null,
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

  function openNew() {
    setEditing(null);
    setFormClientId(undefined);
    setOpen(true);
  }

  function openEdit(order: OrderWithRelations) {
    setEditing(order);
    setFormClientId(order.client_id);
    setOpen(true);
  }

  const filtered = orders.filter((o) => {
    const when = new Date(o.scheduled_at);
    if (statusFilter !== "todas" && o.status !== statusFilter) return false;
    if (techFilter !== "todos" && o.technician_id !== techFilter) return false;
    if (from && when < new Date(`${from}T00:00:00`)) return false;
    if (to && when > new Date(`${to}T23:59:59`)) return false;
    return true;
  });

  const selectedClient = clients.find((c) => c.id === (formClientId ?? editing?.client_id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ordens de serviço</h1>
          <p className="text-sm text-muted-foreground">Agendamentos e atendimentos da equipe.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border p-1">
            <Button
              variant={view === "lista" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("lista")}
            >
              <List className="mr-1 h-4 w-4" /> Lista
            </Button>
            <Button
              variant={view === "calendario" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("calendario")}
            >
              <CalendarDays className="mr-1 h-4 w-4" /> Calendário
            </Button>
          </div>
          {isAdmin && (
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> Nova ordem
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-background">
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
          <SelectTrigger className="w-48 bg-background">
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
        <div className="flex items-center gap-2">
          <Label htmlFor="from" className="text-xs text-muted-foreground">
            De
          </Label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-40 bg-background"
          />
          <Label htmlFor="to" className="text-xs text-muted-foreground">
            Até
          </Label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-40 bg-background"
          />
        </div>
        {(from || to || statusFilter !== "todas" || techFilter !== "todos") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFrom("");
              setTo("");
              setStatusFilter("todas");
              setTechFilter("todos");
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {view === "calendario" ? (
        <CalendarView
          orders={filtered}
          onSelect={openEdit}
        />
      ) : (
        <div className="grid gap-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma ordem encontrada.</p>
          )}
          {filtered.map((o) => (
            <Card key={o.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{o.clients?.name ?? "Cliente"}</p>
                    <Badge variant="secondary">{orderStatusLabels[o.status]}</Badge>
                    <Badge variant="outline">{orderOriginLabels[o.origin]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {serviceTypeLabels[o.service_type]} • {o.technicians?.name ?? "Sem técnico"} •{" "}
                    {formatDateTime(o.scheduled_at)}
                  </p>
                  {(o.address || o.neighborhood) && (
                    <p className="text-sm text-muted-foreground">
                      {[o.address, o.neighborhood].filter(Boolean).join(" — ")}
                    </p>
                  )}
                  {o.reported_problem && (
                    <p className="text-sm text-foreground">{o.reported_problem}</p>
                  )}
                  {o.amount != null && (
                    <p className="text-sm font-medium text-primary">{formatCurrency(Number(o.amount))}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openEdit(o)}
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
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar ordem" : "Nova ordem de serviço"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente</Label>
              <Select
                name="client_id"
                value={formClientId}
                onValueChange={setFormClientId}
                disabled={!isAdmin}
              >
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
                <Label htmlFor="technician_id">Técnico responsável</Label>
                <Select
                  name="technician_id"
                  defaultValue={editing?.technician_id ?? undefined}
                  disabled={!isAdmin}
                >
                  <SelectTrigger id="technician_id">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
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
            <div className="space-y-2">
              <Label htmlFor="reported_problem">Problema relatado pelo cliente</Label>
              <Textarea
                id="reported_problem"
                name="reported_problem"
                required
                maxLength={1000}
                defaultValue={editing?.reported_problem ?? editing?.description ?? ""}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address">Endereço do atendimento</Label>
                <Input
                  id="address"
                  name="address"
                  required
                  maxLength={255}
                  defaultValue={editing?.address ?? selectedClient?.address ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  name="neighborhood"
                  required
                  maxLength={100}
                  defaultValue={editing?.neighborhood ?? selectedClient?.neighborhood ?? ""}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
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
                <Label htmlFor="origin">Origem</Label>
                <Select name="origin" defaultValue={editing?.origin ?? "manual"}>
                  <SelectTrigger id="origin">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(orderOriginLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled_at">Data e horário</Label>
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
                <input type="hidden" name="equipment" value={editing?.equipment ?? ""} />
                <Label htmlFor="equipment_id">Equipamento (opcional)</Label>
                <Select
                  name="equipment_id"
                  defaultValue={editing?.equipment_id ?? "nenhum"}
                  disabled={!formClientId}
                >
                  <SelectTrigger id="equipment_id">
                    <SelectValue placeholder="Selecione o cliente primeiro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    {formEquipments.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {[equipmentTypeLabels[e.type], e.location, e.brand, e.model]
                          .filter(Boolean)
                          .join(" • ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="btus">BTUs</Label>
                <Input id="btus" name="btus" type="number" defaultValue={editing?.btus ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Valor do serviço (R$)</Label>
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
              <Label htmlFor="internal_notes">Observações internas</Label>
              <Textarea
                id="internal_notes"
                name="internal_notes"
                defaultValue={editing?.internal_notes ?? ""}
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
