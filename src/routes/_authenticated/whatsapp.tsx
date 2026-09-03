import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  MessageSquare,
  Bot,
  ClipboardList,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  useProfile,
  useWhatsappInstances,
  whatsappProviderLabels,
  whatsappStatusLabels,
  formatDateTime,
  type WhatsappInstance,
} from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  head: () => ({
    meta: [
      { title: "Atendimento por IA | ClimaGestor" },
      {
        name: "description",
        content: "Configuração do atendimento automático por IA no WhatsApp.",
      },
      { property: "og:title", content: "Atendimento por IA | ClimaGestor" },
      {
        property: "og:description",
        content: "Instâncias do WhatsApp e endpoints da automação por IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WhatsappPage,
});

const schema = z.object({
  instance_name: z.string().trim().min(2, "Informe o identificador da instância").max(80),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  provider: z.string().trim().min(1),
  status: z.string().trim().min(1),
  webhook_secret: z.string().trim().max(120).optional().or(z.literal("")),
});

const steps = [
  {
    icon: MessageSquare,
    title: "1. Cliente manda mensagem",
    text: "O cliente escreve no WhatsApp da empresa e a mensagem chega na instância conectada.",
  },
  {
    icon: Bot,
    title: "2. A IA atende e agenda",
    text: "O fluxo no n8n interpreta o pedido, identifica o cliente e define o serviço e o horário.",
  },
  {
    icon: ClipboardList,
    title: "3. Ordem nasce sozinha",
    text: "A automação chama os endpoints do sistema e a Ordem de Serviço aparece no painel.",
  },
];

const endpoints = [
  { path: "/api/public/whatsapp/client", desc: "Cria ou atualiza o cliente pelo telefone." },
  { path: "/api/public/whatsapp/message", desc: "Registra a conversa e as mensagens trocadas." },
  { path: "/api/public/whatsapp/order", desc: "Cria a Ordem de Serviço a partir do atendimento." },
];

function WhatsappPage() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: instances = [], isLoading } = useWhatsappInstances();
  const [editing, setEditing] = useState<WhatsappInstance | null>(null);
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState("evolution");
  const [status, setStatus] = useState("active");
  const [toRemove, setToRemove] = useState<WhatsappInstance | null>(null);

  function openDialog(instance: WhatsappInstance | null) {
    setEditing(instance);
    setProvider(instance?.provider ?? "evolution");
    setStatus(instance?.status ?? "active");
    setOpen(true);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  const save = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const payload = {
        instance_name: values.instance_name,
        phone: values.phone || null,
        provider: values.provider,
        status: values.status,
        webhook_secret: values.webhook_secret || null,
      };
      if (editing) {
        const { error } = await supabase
          .from("whatsapp_instances")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whatsapp_instances")
          .insert({ ...payload, company_id: profile!.company_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Instância salva.");
      setOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["whatsapp_instances"] });
    },
    onError: (error: { message?: string }) =>
      toast.error(
        error?.message?.includes("duplicate")
          ? "Já existe uma instância com esse identificador."
          : "Não foi possível salvar a instância.",
      ),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_instances").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Instância removida.");
      setToRemove(null);
      queryClient.invalidateQueries({ queryKey: ["whatsapp_instances"] });
    },
    onError: () => toast.error("Não foi possível remover a instância."),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = schema.safeParse({ ...raw, provider, status });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    save.mutate(parsed.data);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Atendimento por IA</h1>
        <p className="text-sm text-muted-foreground">
          Como o WhatsApp e a automação conversam com o ClimaGestor.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step) => (
          <Card key={step.title}>
            <CardContent className="space-y-2 p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <step.icon className="h-5 w-5" />
              </span>
              <p className="font-medium text-foreground">{step.title}</p>
              <p className="text-sm text-muted-foreground">{step.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endereços da automação</CardTitle>
          <CardDescription>
            Combine estes caminhos com o domínio da aplicação no seu fluxo do n8n.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {endpoints.map((endpoint) => (
            <div
              key={endpoint.path}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-sm text-foreground">
                  POST {endpoint.path}
                </p>
                <p className="text-xs text-muted-foreground">{endpoint.desc}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => copy(endpoint.path)}>
                <Copy className="mr-2 h-4 w-4" /> Copiar
              </Button>
            </div>
          ))}
          <div className="flex gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Toda chamada precisa do cabeçalho <span className="font-mono">x-n8n-token</span> com o
              valor da variável de ambiente <span className="font-mono">N8N_WEBHOOK_SECRET</span>.
              Esse valor não é cadastrado aqui nem exibido na tela.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Instâncias do WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            O identificador enviado pelo n8n define a empresa do atendimento.
          </p>
        </div>
        <Button onClick={() => openDialog(null)}>
          <Plus className="mr-2 h-4 w-4" /> Nova instância
        </Button>
      </div>

      <div className="grid gap-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && instances.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma instância cadastrada.</p>
        )}
        {instances.map((instance) => (
          <Card key={instance.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono font-medium text-foreground">{instance.instance_name}</p>
                  <Badge variant={instance.status === "active" ? "default" : "secondary"}>
                    {whatsappStatusLabels[instance.status] ?? instance.status}
                  </Badge>
                  <Badge variant="outline">
                    {whatsappProviderLabels[instance.provider] ?? instance.provider}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {[
                    instance.phone,
                    instance.webhook_secret ? `Segredo: ${instance.webhook_secret}` : null,
                    `Criada em ${formatDateTime(instance.created_at)}`,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => openDialog(instance)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setToRemove(instance)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar instância" : "Nova instância"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instance_name">Identificador da instância</Label>
              <Input
                id="instance_name"
                name="instance_name"
                defaultValue={editing?.instance_name ?? ""}
                placeholder="climagestor-aracaju"
                required
                maxLength={80}
              />
              <p className="text-xs text-muted-foreground">
                É este nome que o n8n envia em cada chamada para o sistema achar a empresa certa.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={editing?.phone ?? ""}
                placeholder="+55 79 98802 8287"
                maxLength={30}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Provedor</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(whatsappProviderLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
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
                    {Object.entries(whatsappStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook_secret">Referência do segredo (opcional)</Label>
              <Input
                id="webhook_secret"
                name="webhook_secret"
                defaultValue={editing?.webhook_secret ?? ""}
                placeholder="N8N_WEBHOOK_SECRET"
                maxLength={120}
              />
              <p className="text-xs text-muted-foreground">
                Use apenas um nome ou identificador do segredo. Nunca escreva a chave em texto — a
                autenticação real usa a variável de ambiente.
              </p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={save.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toRemove} onOpenChange={(v) => !v && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir instância?</AlertDialogTitle>
            <AlertDialogDescription>
              A instância <span className="font-mono">{toRemove?.instance_name}</span> deixará de
              ser reconhecida pela automação. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toRemove && remove.mutate(toRemove.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
