import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  listCompaniesOverview,
  createCompanyWithAdmin,
  setCompanyActive,
} from "@/lib/superadmin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/app-data";

export const Route = createFileRoute("/_authenticated/empresas")({
  head: () => ({
    meta: [
      { title: "Administração Geral | ClimaGestor" },
      { name: "description", content: "Gerencie todas as empresas cadastradas no ClimaGestor." },
      { property: "og:title", content: "Administração Geral | ClimaGestor" },
      { property: "og:description", content: "Empresas, usuários e ordens de serviço da plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmpresasPage,
});

const schema = z.object({
  companyName: z.string().trim().min(2, "Informe o nome da empresa").max(150),
  city: z.string().trim().max(100).optional(),
  adminName: z.string().trim().min(2, "Informe o nome do administrador").max(120),
  adminEmail: z.string().trim().email("E-mail inválido").max(255),
  adminPassword: z.string().min(8, "A senha temporária deve ter ao menos 8 caracteres").max(72),
});

function EmpresasPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const fetchCompanies = useServerFn(listCompaniesOverview);
  const createCompany = useServerFn(createCompanyWithAdmin);
  const toggleActive = useServerFn(setCompanyActive);

  const { data: companies, isLoading } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: () => fetchCompanies(),
  });

  const createMutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => createCompany({ data: values }),
    onSuccess: async () => {
      toast.success("Empresa e administrador criados!");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível criar a empresa."),
  });

  const toggleMutation = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggleActive({ data: v }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
    },
    onError: () => toast.error("Não foi possível alterar o status da empresa."),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      companyName: form.get("companyName"),
      city: form.get("city"),
      adminName: form.get("adminName"),
      adminEmail: form.get("adminEmail"),
      adminPassword: form.get("adminPassword"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    createMutation.mutate(parsed.data);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Building2 className="h-6 w-6 text-primary" />
            Administração Geral
          </h1>
          <p className="text-sm text-muted-foreground">
            Todas as empresas da plataforma e seus administradores.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova empresa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova empresa + administrador</DialogTitle>
              <DialogDescription>
                A conta do administrador é criada já confirmada. Entregue a senha temporária ao dono
                da empresa.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da empresa</Label>
                <Input id="companyName" name="companyName" required maxLength={150} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" name="city" defaultValue="Aracaju" maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminName">Nome do administrador</Label>
                <Input id="adminName" name="adminName" required maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">E-mail do administrador</Label>
                <Input id="adminEmail" name="adminEmail" type="email" required maxLength={255} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Senha temporária</Label>
                <Input id="adminPassword" name="adminPassword" type="text" required maxLength={72} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  Criar empresa
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Empresas cadastradas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !companies?.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead>Ordens</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.city}</TableCell>
                    <TableCell>{c.users}</TableCell>
                    <TableCell>{c.orders}</TableCell>
                    <TableCell>{formatDate(c.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={c.active ? "default" : "secondary"}>
                        {c.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={toggleMutation.isPending}
                        onClick={() => toggleMutation.mutate({ id: c.id, active: !c.active })}
                      >
                        {c.active ? "Desativar" : "Ativar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
