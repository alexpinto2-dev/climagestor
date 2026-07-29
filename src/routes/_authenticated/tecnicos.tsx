import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useTechnicians, useProfile, type Technician } from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/tecnicos")({
  head: () => ({
    meta: [
      { title: "Técnicos | ClimaGestor" },
      { name: "description", content: "Cadastro e situação dos técnicos da sua empresa." },
      { property: "og:title", content: "Técnicos | ClimaGestor" },
      { property: "og:description", content: "Cadastro e situação dos técnicos da sua empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Tecnicos,
});

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(150),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  specialty: z.string().trim().max(120).optional().or(z.literal("")),
});

function Tecnicos() {
  const queryClient = useQueryClient();
  const { data: technicians = [], isLoading } = useTechnicians();
  const { data: profile } = useProfile();
  const [editing, setEditing] = useState<Technician | null>(null);
  const [open, setOpen] = useState(false);

  const save = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const payload = {
        name: values.name,
        phone: values.phone || null,
        specialty: values.specialty || null,
      };
      if (editing) {
        const { error } = await supabase.from("technicians").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("technicians")
          .insert({ ...payload, company_id: profile!.company_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Técnico salvo.");
      setOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
    },
    onError: () => toast.error("Não foi possível salvar o técnico."),
  });

  const toggleActive = useMutation({
    mutationFn: async (tech: Technician) => {
      const { error } = await supabase
        .from("technicians")
        .update({ active: !tech.active })
        .eq("id", tech.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["technicians"] }),
    onError: () => toast.error("Não foi possível alterar a situação."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("technicians").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Técnico removido.");
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
    },
    onError: () => toast.error("Não foi possível remover o técnico."),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    save.mutate(parsed.data);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Técnicos</h1>
          <p className="text-sm text-muted-foreground">Equipe que executa os atendimentos.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo técnico
        </Button>
      </div>

      <div className="grid gap-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && technicians.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum técnico cadastrado.</p>
        )}
        {technicians.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{t.name}</p>
                  <Badge variant={t.active ? "default" : "secondary"}>
                    {t.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {[t.specialty, t.phone].filter(Boolean).join(" • ") || "Sem informações"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={t.active} onCheckedChange={() => toggleActive.mutate(t)} />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setEditing(t);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => remove.mutate(t.id)}>
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
            <DialogTitle>{editing ? "Editar técnico" : "Novo técnico"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" defaultValue={editing?.name ?? ""} required maxLength={150} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" defaultValue={editing?.phone ?? ""} maxLength={30} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidade</Label>
              <Input
                id="specialty"
                name="specialty"
                placeholder="Split, VRF, refrigeração..."
                defaultValue={editing?.specialty ?? ""}
                maxLength={120}
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
