import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { IcePetals } from "@/components/IcePetals";
import logoAsset from "@/assets/logo-climagestor.png.asset.json";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | ClimaGestor" },
      { name: "description", content: "Acesse o painel de gestão da sua empresa de climatização." },
      { property: "og:title", content: "Entrar | ClimaGestor" },
      { property: "og:description", content: "Acesse o painel da sua empresa de climatização." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) return toast.error("Não foi possível entrar. Verifique e-mail e senha.");
    navigate({ to: "/painel" });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-secondary px-4 py-12">
      <IcePetals />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <img src={logoAsset.url} alt="ClimaGestor" className="h-24 w-auto rounded-xl" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Acesse sua conta</CardTitle>
            <CardDescription>
              O acesso é criado pelo administrador do sistema. Fale com ele caso não tenha login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-mail</Label>
                <Input id="login-email" name="email" type="email" required maxLength={255} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <Input id="login-password" name="password" type="password" required maxLength={72} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                Entrar
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogle} type="button">
              Continuar com Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

