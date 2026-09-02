import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2, Upload, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useIsAdmin, useCompany, roleLabels } from "@/lib/app-data";
import { listMembers, createMember, updateMember, removeMember } from "@/lib/members.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil e organização | ClimaGestor" },
      {
        name: "description",
        content: "Configure seus dados, a identidade da organização e os membros da equipe.",
      },
      { property: "og:title", content: "Perfil e organização | ClimaGestor" },
      {
        property: "og:description",
        content: "Dados do usuário, organização, logotipo e membros da equipe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Perfil,
});

type Member = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
};

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

/** Redimensiona a imagem no navegador e devolve um data URL leve. */
function resizeImage(file: File, max = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("reader"));
    reader.readAsDataURL(file);
  });
}

function MyProfileCard() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const save = useMutation({
    mutationFn: async (values: { full_name: string; phone: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: values.full_name, phone: values.phone || null })
        .eq("id", profile!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado.");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Não foi possível atualizar o perfil."),
  });

  const changePassword = useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Senha alterada."),
    onError: () => toast.error("Não foi possível alterar a senha."),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meu perfil</CardTitle>
        <CardDescription>{profile?.email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const name = String(f.get("full_name") ?? "").trim();
            if (name.length < 2) return toast.error("Informe seu nome.");
            save.mutate({ full_name: name, phone: String(f.get("phone") ?? "").trim() });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome</Label>
              <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} />
            </div>
          </div>
          <Button type="submit" disabled={save.isPending}>
            Salvar dados
          </Button>
        </form>

        <form
          className="space-y-4 border-t border-border pt-6"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const pass = String(f.get("password") ?? "");
            const confirm = String(f.get("confirm") ?? "");
            if (pass.length < 8) return toast.error("A senha deve ter ao menos 8 caracteres.");
            if (pass !== confirm) return toast.error("As senhas não conferem.");
            changePassword.mutate(pass);
            (e.target as HTMLFormElement).reset();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" />
            </div>
          </div>
          <Button type="submit" variant="outline" disabled={changePassword.isPending}>
            Alterar senha
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function OrganizationCard() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const save = useMutation({
    mutationFn: async (values: Record<string, string | null>) => {
      const { error } = await supabase
        .from("companies")
        .update(values as never)
        .eq("id", company!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Organização atualizada.");
      queryClient.invalidateQueries({ queryKey: ["company"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Não foi possível atualizar a organização."),
  });

  async function handleLogo(file: File) {
    setUploading(true);
    try {
      const dataUrl = await resizeImage(file);
      await save.mutateAsync({ logo_url: dataUrl });
    } catch {
      toast.error("Não foi possível processar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  if (!company) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organização</CardTitle>
        <CardDescription>Dados e identidade visual da empresa.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-40 items-center justify-center rounded-lg border border-border bg-muted/40 p-2">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="max-h-full max-w-full" />
            ) : (
              <span className="text-xs text-muted-foreground">Sem logotipo</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogo(file);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="mr-2 h-4 w-4" /> Enviar logotipo
            </Button>
            {company.logo_url && (
              <Button variant="ghost" onClick={() => save.mutate({ logo_url: null })}>
                Remover
              </Button>
            )}
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const get = (k: string) => String(f.get(k) ?? "").trim() || null;
            const name = get("name");
            if (!name) return toast.error("Informe o nome da empresa.");
            save.mutate({
              name,
              cnpj: get("cnpj"),
              phone: get("phone"),
              email: get("email"),
              address: get("address"),
              city: get("city") ?? "Aracaju",
              state: get("state"),
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-name">Nome</Label>
              <Input id="c-name" name="name" defaultValue={company.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-cnpj">CNPJ</Label>
              <Input id="c-cnpj" name="cnpj" defaultValue={company.cnpj ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-phone">Telefone</Label>
              <Input id="c-phone" name="phone" defaultValue={company.phone ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-email">E-mail</Label>
              <Input id="c-email" name="email" defaultValue={company.email ?? ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="c-address">Endereço</Label>
              <Input id="c-address" name="address" defaultValue={company.address ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-city">Cidade</Label>
              <Input id="c-city" name="city" defaultValue={company.city ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-state">Estado</Label>
              <Input id="c-state" name="state" defaultValue={company.state ?? ""} maxLength={2} />
            </div>
          </div>
          <Button type="submit" disabled={save.isPending}>
            Salvar organização
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const memberSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().max(30).optional(),
  role: z.enum(["admin", "administrativo", "tecnico"]),
});

function MembersCard() {
  const queryClient = useQueryClient();
  const fetchMembers = useServerFn(listMembers);
  const create = useServerFn(createMember);
  const update = useServerFn(updateMember);
  const destroy = useServerFn(removeMember);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: () => fetchMembers({}) as Promise<Member[]>,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["members"] });
    queryClient.invalidateQueries({ queryKey: ["technicians"] });
  };

  const save = useMutation({
    mutationFn: async (payload: z.infer<typeof memberSchema>) => {
      if (editing) {
        await update({
          data: {
            id: editing.id,
            fullName: payload.fullName,
            phone: payload.phone,
            role: payload.role,
            password: password || "",
          },
        });
      } else {
        await create({ data: { ...payload, password } });
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Membro atualizado." : "Membro adicionado.");
      setOpen(false);
      setEditing(null);
      setPassword("");
      setConfirm("");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível salvar o membro."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => destroy({ data: { id } }),
    onSuccess: () => {
      toast.success("Membro removido.");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível remover o membro."),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = memberSchema.safeParse({
      fullName: f.get("fullName"),
      email: editing?.email ?? f.get("email"),
      phone: String(f.get("phone") ?? ""),
      role: f.get("role"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!editing || password) {
      if (password.length < 8) return toast.error("A senha deve ter ao menos 8 caracteres.");
      if (password !== confirm) return toast.error("As senhas não conferem.");
    }
    save.mutate(parsed.data);
  }

  function openNew() {
    setEditing(null);
    setPassword("");
    setConfirm("");
    setOpen(true);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Membros</CardTitle>
          <CardDescription>Usuários com acesso ao sistema da empresa.</CardDescription>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar membro
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando membros...</p>}
        {!isLoading && members.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
        )}
        {members.map((m) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{m.full_name}</p>
                <Badge variant="secondary">{roleLabels[m.role] ?? m.role}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {[m.email, m.phone].filter(Boolean).join(" • ")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setEditing(m);
                  setPassword("");
                  setConfirm("");
                  setOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => remove.mutate(m.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar membro" : "Adicionar membro"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="m-name">Nome</Label>
              <Input id="m-name" name="fullName" defaultValue={editing?.full_name ?? ""} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="m-role">Função</Label>
                <Select name="role" defaultValue={editing?.role ?? "tecnico"}>
                  <SelectTrigger id="m-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-phone">Telefone</Label>
                <Input id="m-phone" name="phone" defaultValue={editing?.phone ?? ""} />
              </div>
            </div>
            {!editing && (
              <div className="space-y-2">
                <Label htmlFor="m-email">E-mail</Label>
                <Input id="m-email" name="email" type="email" required />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="m-pass">{editing ? "Nova senha (opcional)" : "Senha"}</Label>
                <Input
                  id="m-pass"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-confirm">Confirmar senha</Label>
                <Input
                  id="m-confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const p = randomPassword();
                setPassword(p);
                setConfirm(p);
                toast.success("Senha gerada — copie antes de salvar.");
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Gerar senha
            </Button>
            <DialogFooter>
              <Button type="submit" disabled={save.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Perfil() {
  const { data: isAdmin } = useIsAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Perfil e organização</h1>
        <p className="text-sm text-muted-foreground">
          Seus dados, configurações da empresa e equipe.
        </p>
      </div>
      <MyProfileCard />
      {isAdmin && <OrganizationCard />}
      {isAdmin && <MembersCard />}
    </div>
  );
}
