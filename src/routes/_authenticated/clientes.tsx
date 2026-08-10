import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, History, AirVent } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  useClients,
  useIsAdmin,
  useProfile,
  useClientOrders,
  useClientEquipments,
  equipmentTypeLabels,
  clientTypeLabels,
  orderStatusLabels,
  serviceTypeLabels,
  formatCurrency,
  formatDate,
  formatDateTime,
  type Client,
} from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  EquipmentForm,
  EquipmentHistory,
  MaintenanceBadge,
  useEquipmentSave,
} from "@/routes/_authenticated/equipamentos";
import type { Equipment } from "@/lib/app-data";
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

function ClientHistory({ client }: { client: Client }) {
  const { data: orders = [], isLoading } = useClientOrders(client.id);
  const done = orders.filter((o) => o.status === "concluida");
  const total = done.reduce((sum, o) => sum + Number(o.amount ?? 0), 0);
  const paid = done.filter((o) => o.amount != null);
  const ticket = paid.length ? total / paid.length : 0;
  const last = orders.length
    ? orders.reduce((a, b) => (new Date(a.scheduled_at) > new Date(b.scheduled_at) ? a : b))
    : null;

  const stats = [
    { label: "Atendimentos", value: String(orders.length) },
    { label: "Faturado", value: formatCurrency(total) },
    { label: "Ticket médio", value: formatCurrency(ticket) },
    { label: "Último atendimento", value: last ? formatDate(last.scheduled_at) : "—" },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-foreground">{client.name}</p>
          <Badge variant="secondary">{clientTypeLabels[client.type]}</Badge>
        </div>
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <p>{[client.phone, client.email].filter(Boolean).join(" • ") || "Sem contato"}</p>
          <p>{[client.address, client.neighborhood].filter(Boolean).join(" • ") || "Sem endereço"}</p>
          {client.notes && <p className="pt-1 text-foreground">{client.notes}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <ClientEquipments client={client} />

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Atendimentos</p>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando histórico...</p>}
        {!isLoading && orders.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum serviço registrado para este cliente.</p>
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



function ClientEquipments({ client }: { client: Client }) {
  const queryClient = useQueryClient();
  const { data: equipments = [], isLoading } = useClientEquipments(client.id);
  const { data: isAdmin } = useIsAdmin();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [detail, setDetail] = useState<Equipment | null>(null);

  const save = useEquipmentSave(() => {
    setOpen(false);
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ["equipments", "client", client.id] });
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Equipamento removido.");
      queryClient.invalidateQueries({ queryKey: ["equipments"] });
      queryClient.invalidateQueries({ queryKey: ["equipments", "client", client.id] });
    },
    onError: () => toast.error("Não foi possível remover o equipamento."),
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <AirVent className="h-4 w-4 text-primary" /> Equipamentos
        </p>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        )}
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Carregando equipamentos...</p>}
      {!isLoading && equipments.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado.</p>
      )}
      {equipments.map((e) => (
        <div
          key={e.id}
          className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border p-3"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">
                {equipmentTypeLabels[e.type]}
                {e.location ? ` — ${e.location}` : ""}
              </p>
              <MaintenanceBadge equipment={e} />
            </div>
            <p className="text-xs text-muted-foreground">
              {[e.brand, e.model, e.btus ? `${e.btus} BTUs` : null].filter(Boolean).join(" • ") ||
                "Sem detalhes"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setDetail(e)} title="Histórico">
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
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar equipamento" : "Novo equipamento"}</DialogTitle>
          </DialogHeader>
          <EquipmentForm
            key={editing?.id ?? "novo"}
            editing={editing}
            clientId={client.id}
            lockClient
            pending={save.isPending}
            onSubmit={(values) => save.mutate({ values, editingId: editing?.id })}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico do equipamento</DialogTitle>
          </DialogHeader>
          {detail && <EquipmentHistory equipment={detail} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes | ClimaGestor" },
      { name: "description", content: "Cadastro de clientes da sua empresa de climatização." },
      { property: "og:title", content: "Clientes | ClimaGestor" },
      { property: "og:description", content: "Cadastro de clientes da empresa de climatização." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Clientes,
});

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(150),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().max(255).email("E-mail inválido").optional().or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  neighborhood: z.string().trim().max(100).optional().or(z.literal("")),
  type: z.enum(["residencial", "comercial"]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

function Clientes() {
  const queryClient = useQueryClient();
  const { data: clients = [], isLoading } = useClients();
  const { data: isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<Client | null>(null);

  const save = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const payload = {
        ...values,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        neighborhood: values.neighborhood || null,
        notes: values.notes || null,
      };
      if (editing) {
        const { error } = await supabase.from("clients").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("clients")
          .insert({ ...payload, company_id: profile!.company_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Cliente atualizado." : "Cliente cadastrado.");
      setOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: () => toast.error("Não foi possível salvar o cliente."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente removido.");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: () => toast.error("Não foi possível remover (verifique ordens vinculadas)."),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    save.mutate(parsed.data);
  }

  const filtered = clients.filter((c) =>
    [c.name, c.phone, c.neighborhood].join(" ").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">Cadastro de clientes da empresa.</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo cliente
          </Button>
        )}
      </div>

      <Input
        placeholder="Buscar por nome, telefone ou bairro"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm bg-background"
      />

      <div className="grid gap-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
        )}
        {filtered.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{c.name}</p>
                  <Badge variant="secondary">{clientTypeLabels[c.type]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {[c.phone, c.neighborhood, c.address].filter(Boolean).join(" • ") || "Sem contato"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setHistory(c)} title="Histórico">
                  <History className="h-4 w-4" />
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditing(c);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => remove.mutate(c.id)}>
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
            <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" defaultValue={editing?.name ?? ""} required maxLength={150} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" defaultValue={editing?.phone ?? ""} maxLength={30} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" defaultValue={editing?.email ?? ""} maxLength={255} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  name="neighborhood"
                  defaultValue={editing?.neighborhood ?? ""}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select name="type" defaultValue={editing?.type ?? "residencial"}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residencial">Residencial</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" name="address" defaultValue={editing?.address ?? ""} maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" name="notes" defaultValue={editing?.notes ?? ""} maxLength={1000} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={save.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!history} onOpenChange={(v) => !v && setHistory(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{history?.name}</DialogTitle>
          </DialogHeader>
          {history && <ClientHistory client={history} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
