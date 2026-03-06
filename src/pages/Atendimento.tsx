import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Bot, BotOff, Send, Phone, User, Circle,
  Search, Briefcase, Menu, Info, Pencil, Check, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AudioRecorder from "@/components/atendimento/AudioRecorder";
import ChatAudioPlayer from "@/components/atendimento/ChatAudioPlayer";
import { useIsMobile } from "@/hooks/use-mobile";

const N8N_WEBHOOK_URL = "https://awlegaltech-n8n.cloudfy.live/webhook/envio-manual-aw";

interface Chat {
  whatsapp_numero: string;
  bot_ativo: boolean | null;
  last_intercept: string | null;
  nome_contato: string | null;
  lastMessage?: string;
  lastMessageType?: string;
  lastTime?: string;
}

interface Mensagem {
  id: string;
  whatsapp_id: string | null;
  conteudo: string | null;
  direcao: string | null;
  origem: string | null;
  tipo_midia: string | null;
  created_at: string | null;
}

export default function Atendimento() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingBot, setLoadingBot] = useState(false);
  const [sending, setSending] = useState(false);
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightSheetOpen, setRightSheetOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [contactName, setContactName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chats from controle_bot
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("controle_bot").select("*");
      if (data) {
        const enriched: Chat[] = await Promise.all(
          data.map(async (c) => {
            const { data: msgs } = await supabase
              .from("historico_mensagens")
              .select("conteudo, created_at, tipo_midia")
              .eq("whatsapp_id", c.whatsapp_numero)
              .order("created_at", { ascending: false })
              .limit(1);
            return {
              whatsapp_numero: c.whatsapp_numero,
              bot_ativo: c.bot_ativo,
              last_intercept: c.last_intercept,
              nome_contato: c.nome_contato || null,
              lastMessage: msgs?.[0]?.conteudo || "Sem mensagens",
              lastMessageType: msgs?.[0]?.tipo_midia || "texto",
              lastTime: msgs?.[0]?.created_at || undefined,
            };
          })
        );
        setChats(enriched);
        if (!selectedChat && enriched.length > 0) setSelectedChat(enriched[0].whatsapp_numero);
      }
    }
    load();
  }, []);

  // Load messages + realtime subscription for selected chat
  useEffect(() => {
    if (!selectedChat) return;
    async function loadMsgs() {
      const { data } = await supabase
        .from("historico_mensagens")
        .select("*")
        .eq("whatsapp_id", selectedChat)
        .order("created_at", { ascending: true });
      if (data) setMensagens(data);
    }
    loadMsgs();

    const channel = supabase
      .channel(`chat-${selectedChat}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "historico_mensagens",
        filter: `whatsapp_id=eq.${selectedChat}`,
      }, (payload) => {
        setMensagens((prev) => [...prev, payload.new as Mensagem]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const currentChat = chats.find((c) => c.whatsapp_numero === selectedChat);

  // Sync contactName when selected chat changes
  useEffect(() => {
    if (currentChat) {
      setContactName(currentChat.nome_contato || "");
      setEditingName(false);
    }
  }, [selectedChat]);

  const saveContactName = async () => {
    if (!selectedChat) return;
    const trimmed = contactName.trim();
    await supabase
      .from("controle_bot")
      .update({ nome_contato: trimmed || null } as any)
      .eq("whatsapp_numero", selectedChat);
    setChats((prev) =>
      prev.map((c) =>
        c.whatsapp_numero === selectedChat ? { ...c, nome_contato: trimmed || null } : c
      )
    );
    setEditingName(false);
    toast({ title: trimmed ? `Contato renomeado para "${trimmed}"` : "Nome removido" });
  };
  const toggleBot = async () => {
    if (!currentChat) return;
    setLoadingBot(true);
    const newVal = !currentChat.bot_ativo;
    await supabase
      .from("controle_bot")
      .update({ bot_ativo: newVal })
      .eq("whatsapp_numero", currentChat.whatsapp_numero);
    setChats((prev) =>
      prev.map((c) =>
        c.whatsapp_numero === currentChat.whatsapp_numero ? { ...c, bot_ativo: newVal } : c
      )
    );
    toast({
      title: newVal ? "Robô Ativado" : "Robô Pausado — Humano Assumiu",
      description: newVal ? "O bot voltou a responder." : "Você assumiu o atendimento.",
    });
    setLoadingBot(false);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedChat || sending) return;
    setSending(true);
    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "text", numero: selectedChat, mensagem: newMsg }),
      });
      if (!response.ok) throw new Error("Webhook error");
      setNewMsg("");
      toast({ title: "Mensagem enviada!" });
    } catch {
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleAudioSend = async (blob: Blob, extension: string = ".webm") => {
    if (!selectedChat) return;

    // Force contentType to audio/webm regardless of what the browser reports
    const contentType = "audio/webm";
    const ext = extension.startsWith(".") ? extension : `.${extension}`;
    const filename = `${selectedChat}/${Date.now()}${ext}`;

    console.log("[Atendimento] UPLOAD START — file:", filename, "blob size:", blob.size, "forced contentType:", contentType);

    // Step 1: Upload to Supabase and WAIT for full completion
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("mensagens_audio")
      .upload(filename, blob, {
        contentType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[Atendimento] UPLOAD FAILED:", uploadError);
      toast({ title: "Erro ao fazer upload do áudio", variant: "destructive" });
      return; // STOP here — do NOT call webhook
    }

    console.log("[Atendimento] UPLOAD SUCCESS — path:", uploadData?.path);

    // Step 2: Get public URL only AFTER confirmed upload
    const { data: urlData } = supabase.storage.from("mensagens_audio").getPublicUrl(filename);
    const publicUrl = urlData.publicUrl;
    console.log("[Atendimento] PUBLIC URL:", publicUrl);

    // Step 3: Send webhook only AFTER upload is 100% confirmed
    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "audio",
          numero: selectedChat,
          audioUrl: publicUrl,
          options: { ptt: true },
        }),
      });
      if (!response.ok) throw new Error(`Webhook HTTP ${response.status}`);
      console.log("[Atendimento] WEBHOOK SUCCESS");
      toast({ title: "Áudio enviado!" });
    } catch (webhookErr) {
      console.error("[Atendimento] WEBHOOK FAILED:", webhookErr);
      toast({ title: "Erro ao enviar áudio", variant: "destructive" });
    }
  };

  const filteredChats = chats.filter((c) =>
    c.whatsapp_numero.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPhone = (id: string) => {
    // Full Brazilian number with country code: 5592999722659 (13 digits)
    if (id.length === 13) {
      return `+${id.slice(0, 2)} (${id.slice(2, 4)}) ${id.slice(4, 5)} ${id.slice(5, 9)}-${id.slice(9)}`;
    }
    // Brazilian number without country code: 92999722659 (11 digits)
    if (id.length === 11) {
      return `(${id.slice(0, 2)}) ${id.slice(2, 3)} ${id.slice(3, 7)}-${id.slice(7)}`;
    }
    // 10-digit landline
    if (id.length === 10) {
      return `(${id.slice(0, 2)}) ${id.slice(2, 6)}-${id.slice(6)}`;
    }
    return id;
  };

  const isOutgoing = (msg: Mensagem) => {
    const origem = msg.origem?.toLowerCase();
    return origem === "bot" || origem === "advogado";
  };

  const handleSelectChat = (numero: string) => {
    setSelectedChat(numero);
    if (isMobile) setLeftDrawerOpen(false);
  };

  // ── Shared chat list content ──
  const chatListContent = (
    <>
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            className="pl-9 bg-background/50 border-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filteredChats.map((chat) => (
          <button
            key={chat.whatsapp_numero}
            onClick={() => handleSelectChat(chat.whatsapp_numero)}
            className={cn(
              "w-full flex items-start gap-3 p-3 text-left transition-colors border-b border-border/50 hover:bg-accent/50",
              selectedChat === chat.whatsapp_numero && "bg-accent border-l-2 border-l-primary"
            )}
          >
            <div className="relative shrink-0">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              {chat.bot_ativo && (
                <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-primary text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground truncate">
                  {chat.nome_contato || formatPhone(chat.whatsapp_numero)}
                </span>
                {chat.lastTime && (
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(chat.lastTime), "HH:mm")}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {chat.lastMessageType === "audio" ? "🎵 Áudio" : chat.lastMessage}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {chat.bot_ativo ? (
                  <Bot className="h-3 w-3 text-primary" />
                ) : (
                  <User className="h-3 w-3 text-destructive" />
                )}
              </div>
            </div>
          </button>
        ))}
        {filteredChats.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhuma conversa encontrada</p>
        )}
      </ScrollArea>
    </>
  );

  // ── Shared right panel content ──
  const rightPanelContent = currentChat ? (
    <>
      <div className="text-center">
        <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
          <Phone className="h-6 w-6 text-primary" />
        </div>
        <p className="font-medium text-sm">{formatPhone(selectedChat || "")}</p>
        <Badge
          variant="outline"
          className={cn(
            "mt-1",
            currentChat.bot_ativo
              ? "border-primary/50 text-primary"
              : "border-destructive/50 text-destructive"
          )}
        >
          {currentChat.bot_ativo ? "🤖 Bot Ativo" : "👤 Humano"}
        </Badge>
      </div>

      <Button
        onClick={toggleBot}
        disabled={loadingBot}
        variant={currentChat.bot_ativo ? "destructive" : "default"}
        className="w-full font-bold text-sm py-5"
      >
        {currentChat.bot_ativo ? (
          <><BotOff className="h-4 w-4 mr-2" /> TRAVAR ROBÔ</>
        ) : (
          <><Bot className="h-4 w-4 mr-2" /> REATIVAR ROBÔ</>
        )}
      </Button>

      <div className="border-t border-border pt-4 space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informações</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status Bot</span>
            <Badge variant="secondary">{currentChat.bot_ativo ? "Ativo" : "Pausado"}</Badge>
          </div>
          {currentChat.last_intercept && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Última interação</span>
              <span className="text-foreground text-xs">
                {format(new Date(currentChat.last_intercept), "dd/MM HH:mm")}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            toast({ title: "Criar processo a partir do lead", description: "Funcionalidade em desenvolvimento" });
          }}
        >
          <Briefcase className="h-4 w-4 mr-2" />
          Criar Processo Jurídico
        </Button>
      </div>
    </>
  ) : (
    <p className="text-sm text-muted-foreground text-center mt-8">Selecione um chat</p>
  );

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-0 -mx-4 md:-mx-8 -my-6">
      {/* ── Column 1: Chat list ── */}
      {isMobile ? (
        <Sheet open={leftDrawerOpen} onOpenChange={setLeftDrawerOpen}>
          <SheetContent side="left" className="w-[85vw] max-w-sm p-0 flex flex-col">
            <SheetHeader className="p-3 border-b border-border">
              <SheetTitle>Conversas</SheetTitle>
            </SheetHeader>
            {chatListContent}
          </SheetContent>
        </Sheet>
      ) : (
        <div className="w-80 shrink-0 border-r border-border bg-card/50 flex flex-col">
          {chatListContent}
        </div>
      )}

      {/* ── Column 2: Chat window ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedChat ? (
          <>
            <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-card/30">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLeftDrawerOpen(true)}>
                    <Menu className="h-5 w-5" />
                  </Button>
                )}
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{formatPhone(selectedChat)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {currentChat?.bot_ativo ? "🤖 Bot ativo" : "👤 Humano atendendo"}
                  </p>
                </div>
              </div>
              {isMobile && (
                <Sheet open={rightSheetOpen} onOpenChange={setRightSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Info className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[85vw] max-w-sm flex flex-col gap-4 overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Informações do Lead</SheetTitle>
                    </SheetHeader>
                    {rightPanelContent}
                  </SheetContent>
                </Sheet>
              )}
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {mensagens.map((msg) => {
                  const outgoing = isOutgoing(msg);
                  return (
                    <div key={msg.id} className={cn("flex", outgoing ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2 text-sm",
                          outgoing
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-muted-foreground rounded-bl-sm"
                        )}
                      >
                        {msg.origem && (
                          <p className={cn("text-[9px] font-semibold uppercase mb-0.5", outgoing ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
                            {msg.origem}
                          </p>
                        )}
                        {msg.tipo_midia === "audio" ? (
                          <ChatAudioPlayer src={msg.conteudo || ""} outgoing={outgoing} />
                        ) : msg.tipo_midia === "imagem" || msg.tipo_midia === "image" ? (
                          <img src={msg.conteudo || ""} alt="imagem" className="rounded-lg max-w-full max-h-60" />
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.conteudo}</p>
                        )}
                        {msg.created_at && (
                          <p className={cn("text-[10px] mt-1", outgoing ? "text-primary-foreground/60" : "text-muted-foreground/60")}>
                            {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-border bg-card/30">
              <div className="flex items-center gap-2">
                <AudioRecorder onSend={handleAudioSend} disabled={sending} />
                <Input
                  placeholder="Digite uma mensagem..."
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1 bg-background/50"
                  disabled={sending}
                />
                <Button onClick={sendMessage} size="icon" className="bg-primary hover:bg-primary/90" disabled={sending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            {isMobile && (
              <Button variant="outline" onClick={() => setLeftDrawerOpen(true)}>
                <Menu className="h-4 w-4 mr-2" /> Abrir Conversas
              </Button>
            )}
            <p>Selecione uma conversa</p>
          </div>
        )}
      </div>

      {/* ── Column 3: Lead control panel (desktop only) ── */}
      {!isMobile && (
        <div className="w-72 shrink-0 border-l border-border bg-card/50 flex flex-col p-4 gap-4 overflow-y-auto">
          {rightPanelContent}
        </div>
      )}
    </div>
  );
}
