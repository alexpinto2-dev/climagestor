import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useQuotes,
  useClients,
  useProfile,
  quoteStatusLabels,
  formatCurrency,
  formatDate,
  type QuoteItem,
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

export const Route = createFileRoute("/_authenticated/orcamentos")({
  head: () => ({
    meta: [
      { title: "Orçamentos | ClimaGestor" },
      { name: "description", content: "Propostas comerciais para clientes de climatização." },
      { property: "og:title", content: "Orçamentos | ClimaGestor" },
      { property: "og:description", content: "Propostas comerciais para clientes de climatização." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Orcamentos,
});

function Orcamentos() {
  const queryClient = useQueryClient();
  const { data: quotes = [], isLoading } = useQuotes();
  const { data: clients = [] } = useClients();
  const { data: profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("rascunho");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);

  const total = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);

  const create = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("cliente");
      const valid = items.filter((i) => i.description.trim().length > 0);
      if (valid.length === 0) throw new Error("itens");
      const { error } = await supabase.from("quotes").insert({
        company_id: profile!.company_id,
        client_id: clientId,
        number: `ORC-${Date.now().toString().slice(-6)}`,
        status: status as "rascunho",
        items: valid,
        total,
        valid_until: validUntil || null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Orçamento criado.");
      setOpen(false);
      setClientId("");
      setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      setNotes("");
      setValidUntil("");
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: () => toast.error("Preencha cliente e ao menos um item."),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const { error } = await supabase
        .from("quotes")
        .update({ status: value as "rascunho" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quotes"] }),
    onError: () => toast.error("Não foi possível atualizar a situação."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Orçamento removido.");
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: () => toast.error("Não foi possível remover o orçamento."),
  });

  const convert = useMutation({
    mutationFn: async (quote: (typeof quotes)[number]) => {
      const description = (quote.items as unknown as QuoteItem[] | null)
        ?.map((i) => `${i.quantity}x ${i.description}`)
        .join(" | ");
      const { error } = await supabase.from("service_orders").insert({
        company_id: quote.company_id,
        client_id: quote.client_id,
        service_type: "outro",
        description: description || `Orçamento ${quote.number}`,
        amount: Number(quote.total),
        status: "agendada",
        origin: "manual",
        scheduled_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ordem de serviço criada a partir do orçamento.");
      queryClient.invalidateQueries({ queryKey: ["service_orders"] });
    },
    onError: () => toast.error("Não foi possível converter o orçamento."),
  });

  function updateItem(index: number, patch: Partial<QuoteItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Propostas enviadas aos clientes.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo orçamento
        </Button>
      </div>

      <div className="grid gap-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando orçamentos...</p>}
        {!isLoading && quotes.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum orçamento cadastrado.</p>
        )}
        {quotes.map((q) => (
          <Card key={q.id}>
            <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-3 p-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{q.number}</p>
                  <Badge variant="secondary">{quoteStatusLabels[q.status]}</Badge>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {q.clients?.name ?? "Cliente"} • Validade {formatDate(q.valid_until)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {((q.items as unknown as QuoteItem[] | null) ?? []).length} item(ns)
                </p>
                <p className="text-lg font-semibold text-primary">{formatCurrency(Number(q.total))}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {q.status === "aprovado" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={convert.isPending}
                    onClick={() => convert.mutate(q)}
                  >
                    <FileCheck2 className="mr-2 h-4 w-4" /> Gerar ordem
                  </Button>
                )}
                <Select value={q.status} onValueChange={(value) => changeStatus.mutate({ id: q.id, value })}>
                  <SelectTrigger className="w-40 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(quoteStatusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => remove.mutate(q.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
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
                <Label>Situação</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(quoteStatusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Validade</Label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>

            <div className="space-y-3">
              <Label>Itens</Label>
              {items.map((item, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_80px_120px_40px]">
                  <Input
                    placeholder="Descrição"
                    value={item.description}
                    maxLength={200}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }])}
              >
                <Plus className="mr-2 h-4 w-4" /> Adicionar item
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <p className="text-right text-lg font-semibold text-foreground">
              Total: {formatCurrency(total)}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              Salvar orçamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
