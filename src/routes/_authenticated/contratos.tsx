import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  useClients,
  useContracts,
  useProfile,
  contractStatusLabels,
  formatCurrency,
  formatDate,
  type ContractWithClient,
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

export const Route = createFileRoute("/_authenticated/contratos")({
  head: () => ({
    meta: [
      { title: "Contratos | ClimaGestor" },
      { name: "description", content: "Gestão de contratos de manutenção e serviços." },
      { property: "og:title", content: "Contratos | ClimaGestor" },
      { property: "og:description", content: "Contratos de manutenção da sua empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contratos,
});

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome do contrato").max(150),
  client_id: z.string().uuid("Selecione o cliente"),
  responsible: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
  amount: z.string().optional().or(z.literal("")),
  status: z.enum(["ativo", "suspenso", "encerrado"]),
});

function Contratos() {
  const queryClient = useQueryClient();
  const { data: contracts = [], isLoading } = useContracts();
  const { data: clients = [] } = useClients();
  const { data: profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContractWithClient | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");

  const save = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const payload = {
        name: values.name,
        client_id: values.client_id,
        responsible: values.responsible || null,
        description: values.description || null,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        amount: values.amount ? Number(values.amount) : null,
        status: values.status,
      };
      if (editing) {
        const { error } = await supabase.from("contracts").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("contracts")
          .insert({ ...payload, company_id: profile!.company_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Contrato atualizado." : "Contrato criado.");
      setOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: () => toast.error("Não foi possível salvar o contrato."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contrato removido.");
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: () => toast.error("Não foi possível remover o contrato."),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    save.mutate(parsed.data);
  }

  const filtered = contracts.filter((c) => statusFilter === "todos" || c.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
          <p className="text-sm text-muted-foreground">
            Contratos de manutenção e prestação de serviços.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo contrato
        </Button>
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="max-w-xs bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os status</SelectItem>
          {Object.entries(contractStatusLabels).map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid gap-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum contrato encontrado.</p>
        )}
        {filtered.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{c.name}</p>
                  <Badge variant="secondary">{contractStatusLabels[c.status] ?? c.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {c.clients?.name ?? "Sem cliente"}
                  {c.responsible ? ` • ${c.responsible}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Vigência: {formatDate(c.start_date)} até {formatDate(c.end_date)}
                  {c.amount != null ? ` • ${formatCurrency(Number(c.amount))}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar contrato" : "Novo contrato"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" key={editing?.id ?? "novo"}>
            <div className="space-y-2">
              <Label htmlFor="name">Nome do contrato</Label>
              <Input id="name" name="name" defaultValue={editing?.name ?? ""} required />
            </div>
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
                <Label htmlFor="responsible">Responsável</Label>
                <Input id="responsible" name="responsible" defaultValue={editing?.responsible ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" name="description" defaultValue={editing?.description ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_date">Início da vigência</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  defaultValue={editing?.start_date ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Fim da vigência</Label>
                <Input id="end_date" name="end_date" type="date" defaultValue={editing?.end_date ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={editing?.amount != null ? String(editing.amount) : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Situação</Label>
                <Select name="status" defaultValue={editing?.status ?? "ativo"}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(contractStatusLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
