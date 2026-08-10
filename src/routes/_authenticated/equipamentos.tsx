import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, History, AlertTriangle, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  useEquipments,
  useClients,
  useIsAdmin,
  useProfile,
  useEquipmentOrders,
  equipmentTypeLabels,
  maintenanceIntervalLabels,
  maintenanceStatus,
  daysToMaintenance,
  orderStatusLabels,
  serviceTypeLabels,
  formatCurrency,
  formatDate,
  formatDateTime,
  type EquipmentWithClient,
  type Equipment,
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

export const Route = createFileRoute("/_authenticated/equipamentos")({
  head: () => ({
    meta: [
      { title: "Equipamentos | ClimaGestor" },
      {
        name: "description",
        content: "Cadastro de equipamentos de climatização e controle de manutenção preventiva.",
      },
      { property: "og:title", content: "Equipamentos | ClimaGestor" },
      {
        property: "og:description",
        content: "Equipamentos por cliente, histórico de serviços e preventiva/PMOC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Equipamentos,
});

const schema = z.object({
  client_id: z.string().uuid("Selecione o cliente"),
  type: z.enum(["split", "janela", "cassete", "piso_teto", "outro"]),
  brand: z.string().trim().max(100).optional().or(z.literal("")),
  model: z.string().trim().max(100).optional().or(z.literal("")),
  btus: z.string().optional(),
  location: z.string().trim().max(100).optional().or(z.literal("")),
  serial_number: z.string().trim().max(100).optional().or(z.literal("")),
  installed_at: z.string().optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  has_maintenance_contract: z.enum(["sim", "nao"]),
  maintenance_interval_months: z.string().optional(),
  last_maintenance_at: z.string().optional(),
});

export function MaintenanceBadge({ equipment }: { equipment: Equipment }) {
  const status = maintenanceStatus(equipment.next_maintenance_at);
  const days = daysToMaintenance(equipment.next_maintenance_at);
  if (status === "sem_contrato") return null;
  if (status === "vencida")
    return <Badge variant="destructive">Preventiva vencida há {Math.abs(days!)} dia(s)</Badge>;
  if (status === "proxima")
    return (
      <Badge className="bg-accent text-accent-foreground">
        Preventiva em {days} dia(s)
      </Badge>
    );
  return <Badge variant="secondary">Preventiva em dia</Badge>;
}

export function EquipmentSummary({ equipment }: { equipment: Equipment }) {
  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      <p>
        {[
          equipmentTypeLabels[equipment.type],
          equipment.brand,
          equipment.model,
          equipment.btus ? `${equipment.btus} BTUs` : null,
        ]
          .filter(Boolean)
          .join(" • ")}
      </p>
      <p>
        {[
          equipment.location ? `Local: ${equipment.location}` : null,
          equipment.serial_number ? `Série: ${equipment.serial_number}` : null,
          equipment.installed_at ? `Instalado em ${formatDate(equipment.installed_at)}` : null,
        ]
          .filter(Boolean)
          .join(" • ") || "Sem detalhes adicionais"}
      </p>
      {equipment.has_maintenance_contract && (
        <p>
          Preventiva:{" "}
          {equipment.maintenance_interval_months
            ? maintenanceIntervalLabels[String(equipment.maintenance_interval_months)]
            : "sem periodicidade"}{" "}
          • Última: {formatDate(equipment.last_maintenance_at)} • Próxima:{" "}
          {formatDate(equipment.next_maintenance_at)}
        </p>
      )}
      {equipment.notes && <p className="text-foreground">{equipment.notes}</p>}
    </div>
  );
}

export function EquipmentHistory({ equipment }: { equipment: Equipment }) {
  const { data: orders = [], isLoading } = useEquipmentOrders(equipment.id);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="font-semibold text-foreground">
            {equipmentTypeLabels[equipment.type]} {equipment.brand ?? ""}
          </p>
          <MaintenanceBadge equipment={equipment} />
        </div>
        <EquipmentSummary equipment={equipment} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Ordens de serviço deste equipamento</p>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando histórico...</p>}
        {!isLoading && orders.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma ordem de serviço vinculada a este equipamento.
          </p>
        )}
        {orders.map((o) => (
          <div key={o.id} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{serviceTypeLabels[o.service_type]}</p>
              <div className="flex items-center gap-2">
                {o.amount != null && (
                  <span className="text-sm font-semibold text-primary">
                    {formatCurrency(Number(o.amount))}
                  </span>
                )}
                <Badge variant="secondary">{orderStatusLabels[o.status]}</Badge>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(o.scheduled_at)} • {o.technicians?.name ?? "Sem técnico"}
            </p>
            {o.reported_problem && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{o.reported_problem}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function useEquipmentSave(onDone: () => void) {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  return useMutation({
    mutationFn: async ({
      values,
      editingId,
    }: {
      values: z.infer<typeof schema>;
      editingId?: string;
    }) => {
      const hasContract = values.has_maintenance_contract === "sim";
      const payload = {
        client_id: values.client_id,
        type: values.type,
        brand: values.brand || null,
        model: values.model || null,
        btus: values.btus ? Number(values.btus) : null,
        location: values.location || null,
        serial_number: values.serial_number || null,
        installed_at: values.installed_at || null,
        notes: values.notes || null,
        has_maintenance_contract: hasContract,
        maintenance_interval_months:
          hasContract && values.maintenance_interval_months
            ? Number(values.maintenance_interval_months)
            : null,
        last_maintenance_at: hasContract ? values.last_maintenance_at || null : null,
      };
      if (editingId) {
        const { error } = await supabase.from("equipments").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("equipments")
          .insert({ ...payload, company_id: profile!.company_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Equipamento salvo.");
      queryClient.invalidateQueries({ queryKey: ["equipments"] });
      onDone();
    },
    onError: () => toast.error("Não foi possível salvar o equipamento."),
  });
}

export function EquipmentForm({
  editing,
  clientId,
  lockClient,
  onSubmit,
  pending,
}: {
  editing: Equipment | null;
  clientId?: string;
  lockClient?: boolean;
  onSubmit: (values: z.infer<typeof schema>) => void;
  pending: boolean;
}) {
  const { data: clients = [] } = useClients();
  const [hasContract, setHasContract] = useState(
    editing?.has_maintenance_contract ? "sim" : "nao",
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    onSubmit(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="client_id">Cliente</Label>
        <Select
          name="client_id"
          defaultValue={editing?.client_id ?? clientId}
          disabled={lockClient}
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
        {lockClient && <input type="hidden" name="client_id" value={editing?.client_id ?? clientId} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo</Label>
          <Select name="type" defaultValue={editing?.type ?? "split"}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(equipmentTypeLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Local de instalação</Label>
          <Input
            id="location"
            name="location"
            placeholder="Sala, quarto, escritório..."
            defaultValue={editing?.location ?? ""}
            maxLength={100}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="brand">Marca</Label>
          <Input id="brand" name="brand" defaultValue={editing?.brand ?? ""} maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Modelo</Label>
          <Input id="model" name="model" defaultValue={editing?.model ?? ""} maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="btus">BTUs</Label>
          <Input id="btus" name="btus" type="number" defaultValue={editing?.btus ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="serial_number">Número de série</Label>
          <Input
            id="serial_number"
            name="serial_number"
            defaultValue={editing?.serial_number ?? ""}
            maxLength={100}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="installed_at">Data de instalação</Label>
          <Input
            id="installed_at"
            name="installed_at"
            type="date"
            defaultValue={editing?.installed_at ?? ""}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border p-4">
        <p className="text-sm font-medium text-foreground">Manutenção preventiva (PMOC)</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="has_maintenance_contract">Possui contrato?</Label>
            <Select
              name="has_maintenance_contract"
              value={hasContract}
              onValueChange={setHasContract}
            >
              <SelectTrigger id="has_maintenance_contract">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maintenance_interval_months">Periodicidade</Label>
            <Select
              name="maintenance_interval_months"
              defaultValue={
                editing?.maintenance_interval_months
                  ? String(editing.maintenance_interval_months)
                  : "6"
              }
              disabled={hasContract !== "sim"}
            >
              <SelectTrigger id="maintenance_interval_months">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(maintenanceIntervalLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_maintenance_at">Última preventiva</Label>
            <Input
              id="last_maintenance_at"
              name="last_maintenance_at"
              type="date"
              defaultValue={editing?.last_maintenance_at ?? ""}
              disabled={hasContract !== "sim"}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          A data da próxima preventiva é calculada automaticamente a partir da última preventiva e da
          periodicidade.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" defaultValue={editing?.notes ?? ""} maxLength={1000} />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}

function Equipamentos() {
  const queryClient = useQueryClient();
  const { data: equipments = [], isLoading } = useEquipments();
  const { data: isAdmin } = useIsAdmin();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "vencida" | "proxima">("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentWithClient | null>(null);
  const [history, setHistory] = useState<EquipmentWithClient | null>(null);

  const save = useEquipmentSave(() => {
    setOpen(false);
    setEditing(null);
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Equipamento removido.");
      queryClient.invalidateQueries({ queryKey: ["equipments"] });
    },
    onError: () => toast.error("Não foi possível remover o equipamento."),
  });

  const overdue = equipments.filter((e) => maintenanceStatus(e.next_maintenance_at) === "vencida");
  const soon = equipments.filter((e) => maintenanceStatus(e.next_maintenance_at, 30) === "proxima");

  const filtered = equipments.filter((e) => {
    const status = maintenanceStatus(e.next_maintenance_at);
    if (filter === "vencida" && status !== "vencida") return false;
    if (filter === "proxima" && status !== "proxima") return false;
    const haystack = [e.clients?.name, e.brand, e.model, e.location, e.serial_number]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipamentos</h1>
          <p className="text-sm text-muted-foreground">
            Equipamentos dos clientes e controle de manutenção preventiva.
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo equipamento
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className={overdue.length ? "border-destructive/50" : undefined}>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm text-muted-foreground">Preventivas vencidas</p>
              <p className="text-2xl font-bold text-foreground">{overdue.length}</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm text-muted-foreground">Preventivas nos próximos 30 dias</p>
              <p className="text-2xl font-bold text-foreground">{soon.length}</p>
            </div>
            <CalendarClock className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por cliente, marca, modelo ou local"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-background"
        />
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-56 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os equipamentos</SelectItem>
            <SelectItem value="vencida">Preventiva vencida</SelectItem>
            <SelectItem value="proxima">Preventiva próxima (30 dias)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum equipamento encontrado.</p>
        )}
        {filtered.map((e) => (
          <Card key={e.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{e.clients?.name ?? "Cliente"}</p>
                  <Badge variant="secondary">{equipmentTypeLabels[e.type]}</Badge>
                  <MaintenanceBadge equipment={e} />
                </div>
                <EquipmentSummary equipment={e} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setHistory(e)} title="Histórico">
                  <History className="h-4 w-4" />
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditing(e);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => remove.mutate(e.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar equipamento" : "Novo equipamento"}</DialogTitle>
          </DialogHeader>
          <EquipmentForm
            key={editing?.id ?? "novo"}
            editing={editing}
            pending={save.isPending}
            onSubmit={(values) => save.mutate({ values, editingId: editing?.id })}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!history} onOpenChange={(v) => !v && setHistory(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico do equipamento</DialogTitle>
          </DialogHeader>
          {history && <EquipmentHistory equipment={history} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
