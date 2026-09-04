import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, ClipboardList } from "lucide-react";
import {
  useConversations,
  useConversationMessages,
  useConversationAiOrder,
  useIsAdmin,
  useIsSuperAdmin,
  conversationStatusLabels,
  messageAuthorLabels,
  serviceTypeLabels,
  orderStatusLabels,
  formatDateTime,
  type ConversationWithClient,
} from "@/lib/app-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/conversas")({
  head: () => ({
    meta: [
      { title: "Conversas | ClimaGestor" },
      {
        name: "description",
        content: "Atendimentos por WhatsApp conduzidos pela IA e pela equipe.",
      },
      { property: "og:title", content: "Conversas | ClimaGestor" },
      {
        property: "og:description",
        content: "Histórico de conversas de WhatsApp da sua empresa de climatização.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Conversas,
});

type Filter = "abertas" | "encerradas" | "todas";

function statusLabel(status: string) {
  return conversationStatusLabels[status] ?? status;
}

function Conversas() {
  const [filter, setFilter] = useState<Filter>("abertas");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: conversations = [], isLoading } = useConversations();
  const { data: isAdmin } = useIsAdmin();
  const { data: isSuperAdmin } = useIsSuperAdmin();
  const canSeeAudit = !!isAdmin || !!isSuperAdmin;

  const { data: messages = [], isLoading: loadingMessages } =
    useConversationMessages(selectedId);
  const { data: aiOrder } = useConversationAiOrder(selectedId, canSeeAudit);

  const filtered = conversations.filter((c) =>
    filter === "todas" ? true : filter === "abertas" ? c.status !== "encerrada" : c.status === "encerrada",
  );
  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Conversas</h1>
        <p className="text-sm text-muted-foreground">
          Atendimentos de WhatsApp, atualizados automaticamente.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="w-full">
              <TabsTrigger className="flex-1" value="abertas">
                Em andamento
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="encerradas">
                Encerradas
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="todas">
                Todas
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <ScrollArea className="h-[60vh] rounded-lg border border-border">
            <div className="space-y-2 p-2">
              {isLoading && <p className="p-2 text-sm text-muted-foreground">Carregando...</p>}
              {!isLoading && filtered.length === 0 && (
                <p className="p-2 text-sm text-muted-foreground">Nenhuma conversa por aqui.</p>
              )}
              {filtered.map((c: ConversationWithClient) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "w-full rounded-lg border border-transparent p-3 text-left transition-colors hover:bg-muted",
                    selectedId === c.id && "border-border bg-muted",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-medium text-foreground">
                      {c.clients?.name || c.phone_e164}
                    </p>
                    <Badge variant={c.status === "encerrada" ? "secondary" : "default"}>
                      {statusLabel(c.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.phone_e164}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[c.intent, formatDateTime(c.last_message_at ?? c.created_at)]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <Card className="min-h-[60vh]">
          <CardContent className="flex h-full flex-col gap-4 p-4">
            {!selected && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                <MessageSquare className="h-8 w-8" />
                <p className="text-sm">Selecione uma conversa para ver as mensagens.</p>
              </div>
            )}

            {selected && (
              <>
                <div className="border-b border-border pb-3">
                  <p className="font-medium text-foreground">
                    {selected.clients?.name || selected.phone_e164}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[selected.phone_e164, selected.intent, statusLabel(selected.status)]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                </div>

                {aiOrder && (
                  <div className="flex gap-3 rounded-lg border border-border bg-primary/5 p-3 text-sm">
                    <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">
                        Ordem de serviço criada pela IA
                      </p>
                      <p className="text-muted-foreground">
                        {[
                          serviceTypeLabels[aiOrder.service_type] ?? aiOrder.service_type,
                          orderStatusLabels[aiOrder.status] ?? aiOrder.status,
                          `Agendada para ${formatDateTime(aiOrder.scheduled_at)}`,
                        ].join(" • ")}
                      </p>
                    </div>
                  </div>
                )}

                <ScrollArea className="h-[46vh] pr-3">
                  <div className="space-y-3">
                    {loadingMessages && (
                      <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
                    )}
                    {!loadingMessages && messages.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma mensagem nesta conversa.
                      </p>
                    )}
                    {messages.map((m) => {
                      if (m.author_type === "system") {
                        return (
                          <div key={m.id} className="text-center">
                            <p className="text-xs text-muted-foreground">{m.content}</p>
                            <p className="text-[11px] text-muted-foreground/70">
                              {formatDateTime(m.created_at)}
                            </p>
                          </div>
                        );
                      }
                      const outgoing = m.direction === "outgoing";
                      return (
                        <div
                          key={m.id}
                          className={cn("flex flex-col", outgoing ? "items-end" : "items-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                              !outgoing && "rounded-bl-sm bg-muted text-foreground",
                              outgoing &&
                                m.author_type === "ai" &&
                                "rounded-br-sm bg-primary text-primary-foreground",
                              outgoing &&
                                m.author_type !== "ai" &&
                                "rounded-br-sm bg-accent text-accent-foreground",
                            )}
                          >
                            {m.content || `[${m.message_type}]`}
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {(messageAuthorLabels[m.author_type] ?? m.author_type) +
                              " • " +
                              formatDateTime(m.created_at)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
