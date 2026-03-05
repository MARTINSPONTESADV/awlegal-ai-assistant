import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, BotOff, Send, Mic, MicOff, Phone, User, Circle,
  Search, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const N8N_WEBHOOK_URL = "https://awlegaltech-n8n.cloudfy.live/webhook/envio-manual-aw";

interface Chat {
  whatsapp_numero: string;
  bot_ativo: boolean | null;
  last_intercept: string | null;
  lastMessage?: string;
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
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loadingBot, setLoadingBot] = useState(false);
  const [sending, setSending] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
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
              .select("conteudo, created_at")
              .eq("whatsapp_id", c.whatsapp_numero)
              .order("created_at", { ascending: false })
              .limit(1);
            return {
              whatsapp_numero: c.whatsapp_numero,
              bot_ativo: c.bot_ativo,
              last_intercept: c.last_intercept,
              lastMessage: msgs?.[0]?.conteudo || "Sem mensagens",
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

  // Toggle bot on controle_bot table
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

  // Send text message via n8n webhook
  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedChat || sending) return;
    setSending(true);
    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "text",
          numero: selectedChat,
          mensagem: newMsg,
        }),
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

  // Audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const filename = `${selectedChat}/${Date.now()}.webm`;
        const { error } = await supabase.storage
          .from("mensagens_audio")
          .upload(filename, blob, { contentType: "audio/webm" });
        if (!error) {
          const { data: urlData } = supabase.storage.from("mensagens_audio").getPublicUrl(filename);
          try {
            const response = await fetch(N8N_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tipo: "audio",
                numero: selectedChat,
                audioUrl: urlData.publicUrl,
              }),
            });
            if (!response.ok) throw new Error("Webhook error");
            toast({ title: "Áudio enviado!" });
          } catch {
            toast({ title: "Erro ao enviar áudio", variant: "destructive" });
          }
        } else {
          toast({ title: "Erro ao fazer upload do áudio", variant: "destructive" });
        }
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast({ title: "Erro ao acessar microfone", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const filteredChats = chats.filter((c) =>
    c.whatsapp_numero.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPhone = (id: string) => {
    if (id.length >= 11) {
      return `(${id.slice(0, 2)}) ${id.slice(2, 7)}-${id.slice(7, 11)}`;
    }
    return id;
  };

  // Determine if message is outgoing based on origem
  const isOutgoing = (msg: Mensagem) => {
    const origem = msg.origem?.toLowerCase();
    return origem === "bot" || origem === "advogado";
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-0 -mx-4 md:-mx-8 -my-6">
      {/* Column 1: Chat list */}
      <div className="w-80 shrink-0 border-r border-border bg-card/50 flex flex-col">
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
              onClick={() => setSelectedChat(chat.whatsapp_numero)}
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
                    {formatPhone(chat.whatsapp_numero)}
                  </span>
                  {chat.lastTime && (
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(chat.lastTime), "HH:mm")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{chat.lastMessage}</p>
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
      </div>

      {/* Column 2: Chat window */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedChat ? (
          <>
            <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-card/30">
              <div className="flex items-center gap-3">
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
                          <audio controls src={msg.conteudo || ""} className="max-w-full" />
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn(isRecording && "text-destructive animate-pulse")}
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
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
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Selecione uma conversa</p>
          </div>
        )}
      </div>

      {/* Column 3: Lead control panel */}
      <div className="w-72 shrink-0 border-l border-border bg-card/50 flex flex-col p-4 gap-4 overflow-y-auto">
        {currentChat ? (
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
        )}
      </div>
    </div>
  );
}
