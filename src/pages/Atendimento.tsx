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
  Search, Briefcase, Menu, Info, Pencil, Check, X, Building2, Zap,
  Archive, ArchiveRestore
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AudioRecorder from "@/components/atendimento/AudioRecorder";
import ChatAudioPlayer from "@/components/atendimento/ChatAudioPlayer";
import { useIsMobile } from "@/hooks/use-mobile";

const N8N_WEBHOOK_URL = "https://awlegaltech-n8n.cloudfy.live/webhook/envio-manual-aw";

type Canal = "resolva_ja" | "martins_pontes";

interface Chat {
  whatsapp_numero: string;
  bot_ativo: boolean | null;
  last_intercept: string | null;
  nome_contato: string | null;
  canal?: string | null;
  lastMessage?: string;
  lastMessageType?: string;
  lastTime?: string;
  unread_count?: number;
  arquivado?: boolean;
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
  const [canal, setCanal] = useState<Canal>("resolva_ja");
  const [showArchived, setShowArchived] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
              canal: (c as any).canal || null,
              lastMessage: msgs?.[0]?.conteudo || "Sem mensagens",
              lastMessageType: msgs?.[0]?.tipo_midia || "texto",
              lastTime: msgs?.[0]?.created_at || undefined,
              unread_count: (c as any).unread_count || 0,
              arquivado: (c as any).arquivado || false,
            };
          })
        );
        setChats(enriched);
        if (!selectedChat && enriched.length > 0) setSelectedChat(enriched[0].whatsapp_numero);
      }
    }
    load();
  }, []);

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
        event: "*", // Listen to INSERT, UPDATE, DELETE
        schema: "public",
        table: "historico_mensagens",
        filter: `whatsapp_id=eq.${selectedChat}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setMensagens((prev) => [...prev, payload.new as Mensagem]);
        } else if (payload.eventType === "UPDATE") {
          setMensagens((prev) => prev.map(m => m.id === payload.new.id ? (payload.new as Mensagem) : m));
        } else if (payload.eventType === "DELETE") {
          setMensagens((prev) => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const currentChat = chats.find((c) => c.whatsapp_numero === selectedChat);

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
    if (!currentChat || !selectedChat) return;
    setLoadingBot(true);
    try {
      const { data: existing } = await supabase
        .from("controle_bot")
        .select("bot_ativo")
        .eq("whatsapp_numero", selectedChat)
        .maybeSingle();

      const newVal = !currentChat.bot_ativo;
      
      // Optimistic Update
      setChats((prev) =>
        prev.map((c) =>
          c.whatsapp_numero === selectedChat ? { ...c, bot_ativo: newVal } : c
        )
      );

      const { error } = await supabase
        .from("controle_bot")
        .update({ bot_ativo: newVal })
        .eq("whatsapp_numero", selectedChat);

      if (error) {
        // Rollback on error
        setChats((prev) =>
          prev.map((c) =>
            c.whatsapp_numero === selectedChat ? { ...c, bot_ativo: !newVal } : c
          )
        );
        throw error;
      }

      toast({
        title: newVal ? "Robô Ativado" : "Robô Pausado — Humano Assumiu",
        description: newVal ? "O bot voltou a responder." : "Você assumiu o atendimento.",
      });
    } catch (err) {
      toast({ title: "Erro ao alterar status do robô", variant: "destructive" });
    } finally {
      setLoadingBot(false);
    }
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
    const contentType = "audio/webm";
    const ext = extension.startsWith(".") ? extension : `.${extension}`;
    const filename = `${selectedChat}/${Date.now()}${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("mensagens_audio")
      .upload(filename, blob, { contentType, cacheControl: "3600", upsert: false });

    if (uploadError) {
      toast({ title: "Erro ao fazer upload do áudio", variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage.from("mensagens_audio").getPublicUrl(filename);
    const publicUrl = urlData.publicUrl;

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "audio", numero: selectedChat, audioUrl: publicUrl, options: { ptt: true } }),
      });
      if (!response.ok) throw new Error(`Webhook HTTP ${response.status}`);
      toast({ title: "Áudio enviado!" });
    } catch {
      toast({ title: "Erro ao enviar áudio", variant: "destructive" });
    }
  };

  const filteredChats = chats
    .filter((c) => {
      const matchSearch = c.whatsapp_numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.nome_contato || "").toLowerCase().includes(searchTerm.toLowerCase());
      // Canal filter: if canal field exists use it, otherwise "resolva_ja" shows all (legacy), "martins_pontes" shows marked ones
      const matchCanal = canal === "resolva_ja"
        ? !c.canal || c.canal === "resolva_ja"
        : c.canal === "martins_pontes";
      const matchArchive = (c.arquivado || false) === showArchived;
      return matchSearch && matchCanal && matchArchive;
    })
    .sort((a, b) => {
      const timeA = a.lastTime ? new Date(a.lastTime).getTime() : 0;
      const timeB = b.lastTime ? new Date(b.lastTime).getTime() : 0;
      return timeB - timeA;
    });

  const formatPhone = (id: string) => {
    if (id.length === 13) return `+${id.slice(0, 2)} (${id.slice(2, 4)}) ${id.slice(4, 5)} ${id.slice(5, 9)}-${id.slice(9)}`;
    if (id.length === 11) return `(${id.slice(0, 2)}) ${id.slice(2, 3)} ${id.slice(3, 7)}-${id.slice(7)}`;
    if (id.length === 10) return `(${id.slice(0, 2)}) ${id.slice(2, 6)}-${id.slice(6)}`;
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

  // ── Canal Selector ──
  const canalSelector = (
    <div className="flex rounded-xl overflow-hidden border border-white/[0.08] shrink-0">
      <button
        onClick={() => setCanal("resolva_ja")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all",
          canal === "resolva_ja"
            ? "bg-violet-500/20 text-violet-300 border-r border-white/[0.06]"
            : "text-muted-foreground hover:text-foreground border-r border-white/[0.06]"
        )}
      >
        <Zap className="h-3 w-3" />
        Resolva Já
      </button>
      <button
        onClick={() => setCanal("martins_pontes")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all",
          canal === "martins_pontes"
            ? "bg-cyan-500/20 text-cyan-300"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Building2 className="h-3 w-3" />
        Martins Pontes
      </button>
    </div>
  );

  // ── Chat list ──
  const chatListContent = (
    <>
      {/* Canal selector inside list and Archive Button */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between gap-2">
        <div className="flex-1 overflow-x-auto">
          {canalSelector}
        </div>
        <Button 
          variant={showArchived ? "secondary" : "default"} 
          size="icon" 
          className={cn("h-8 w-8 shrink-0 relative transition-all", !showArchived && "bg-white/[0.04] text-muted-foreground hover:text-foreground hover:bg-white/[0.08]")}
          onClick={() => setShowArchived(!showArchived)}
          title={showArchived ? "Ver conversas ativas" : "Ver conversas arquivadas"}
        >
          <Archive className="h-4 w-4" />
          {showArchived && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-violet-400" />}
        </Button>
      </div>
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            className="pl-8 h-8 text-sm bg-white/[0.04] border-white/[0.08]"
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
              "group relative w-full flex items-start gap-3 px-3 py-3 text-left transition-all border-b border-white/[0.04] hover:bg-white/[0.05]",
              selectedChat === chat.whatsapp_numero && "bg-violet-500/10 border-l-2 border-l-violet-400"
            )}
          >
            <div className="relative shrink-0 pt-0.5">
              <div className="h-10 w-10 rounded-full bg-violet-500/15 ring-1 ring-violet-400/20 flex items-center justify-center">
                <Phone className="h-4 w-4 text-violet-400" />
              </div>
              {chat.bot_ativo && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-background" />
              )}
            </div>
            
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-semibold text-foreground truncate pr-4">
                  {chat.nome_contato || formatPhone(chat.whatsapp_numero)}
                </span>
                {chat.lastTime && (
                  <span className={cn("text-[10px] shrink-0 font-medium", chat.unread_count ? "text-emerald-400" : "text-muted-foreground")}>
                    {format(new Date(chat.lastTime), "HH:mm")}
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between mt-0.5 gap-4 pr-6">
                <div className="min-w-0 flex-1">
                  <p className="truncate block w-full text-sm text-muted-foreground">
                    {chat.lastMessageType === "audio" ? "🎵 Áudio" : chat.lastMessage}
                  </p>
                </div>
                
                {/* Unread Badge */}
                {chat.unread_count && chat.unread_count > 0 ? (
                  <div className="bg-emerald-500 text-white rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
                    {chat.unread_count}
                  </div>
                ) : null}
              </div>
              
              <div className="flex items-center justify-between gap-1 mt-1.5 opacity-80">
                <div className="flex items-center gap-1">
                  {chat.bot_ativo ? (
                    <Bot className="h-3.5 w-3.5 text-violet-400" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  <span className="text-[11px] text-muted-foreground/90 font-medium tracking-tight">
                    {chat.bot_ativo ? "Bot ativo" : "Humano"}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
        {filteredChats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Search className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        )}
      </ScrollArea>
    </>
  );

  // ── Right info panel ──
  const rightPanelContent = currentChat ? (
    <>
      <div className="text-center">
        <div className="h-14 w-14 rounded-full bg-violet-500/15 ring-2 ring-violet-400/25 flex items-center justify-center mx-auto mb-2">
          <Phone className="h-6 w-6 text-violet-400" />
        </div>
        {editingName ? (
          <div className="flex items-center gap-1 justify-center mt-1">
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Nome do contato"
              className="h-8 text-sm text-center max-w-[160px] bg-white/[0.05] border-white/[0.1]"
              onKeyDown={(e) => e.key === "Enter" && saveContactName()}
              autoFocus
            />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveContactName}>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingName(false); setContactName(currentChat.nome_contato || ""); }}>
              <X className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1 mt-1">
            <p className="font-semibold text-sm text-foreground">
              {currentChat.nome_contato || formatPhone(selectedChat || "")}
            </p>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingName(true)}>
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        )}
        {currentChat.nome_contato && (
          <p className="text-xs text-muted-foreground font-mono">{formatPhone(selectedChat || "")}</p>
        )}
        <Badge
          variant="outline"
          className={cn(
            "mt-2 text-xs",
            currentChat.bot_ativo
              ? "border-violet-400/40 text-violet-300 bg-violet-500/10"
              : "border-amber-400/40 text-amber-300 bg-amber-500/10"
          )}
        >
          {currentChat.bot_ativo ? "🤖 Bot Ativo" : "👤 Humano"}
        </Badge>
      </div>

      <div className="space-y-2">
        <Button
          onClick={toggleBot}
          disabled={loadingBot}
          variant={currentChat.bot_ativo ? "destructive" : "default"}
          className={cn(
            "w-full font-bold text-sm py-5",
            !currentChat.bot_ativo && "bg-violet-600 hover:bg-violet-700"
          )}
        >
          {currentChat.bot_ativo ? (
            <><BotOff className="h-4 w-4 mr-2" /> TRAVAR ROBÔ</>
          ) : (
            <><Bot className="h-4 w-4 mr-2" /> REATIVAR ROBÔ</>
          )}
        </Button>

        <Button
          variant="outline"
          className="w-full border-white/[0.08] hover:bg-white/[0.05] text-muted-foreground hover:text-foreground"
          onClick={async () => {
            const novoStatus = !(currentChat.arquivado || false);
            await supabase.from("controle_bot").update({ arquivado: novoStatus } as any).eq("whatsapp_numero", selectedChat);
            setChats(prev => prev.map(c => c.whatsapp_numero === selectedChat ? { ...c, arquivado: novoStatus } : c));
            if (novoStatus) setSelectedChat(null);
            toast({ title: novoStatus ? "Conversa arquivada" : "Conversa retornada das arquivadas" });
          }}
        >
          {currentChat.arquivado ? (
            <><ArchiveRestore className="h-4 w-4 mr-2" /> Desarquivar Conversa</>
          ) : (
            <><Archive className="h-4 w-4 mr-2" /> Arquivar Conversa</>
          )}
        </Button>
      </div>

      <div className="border-t border-white/[0.06] pt-4 space-y-3">
        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Informações</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Status Bot</span>
            <Badge variant="secondary" className="text-xs">{currentChat.bot_ativo ? "Ativo" : "Pausado"}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Canal</span>
            <Badge variant="outline" className="text-xs capitalize">
              {canal === "resolva_ja" ? "Resolva Já" : "Martins Pontes"}
            </Badge>
          </div>
          {currentChat.last_intercept && (
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Última interação</span>
              <span className="text-foreground text-xs font-mono">
                {format(new Date(currentChat.last_intercept), "dd/MM HH:mm")}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/[0.06] pt-4">
        <Button
          variant="outline"
          className="w-full border-white/[0.08] hover:bg-white/[0.05]"
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
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
      <Phone className="h-8 w-8 opacity-30" />
      <p className="text-sm">Selecione um chat</p>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-full w-full overflow-hidden">
      {/* ── Column 1: Chat list ── */}
      {isMobile ? (
        <Sheet open={leftDrawerOpen} onOpenChange={setLeftDrawerOpen}>
          <SheetContent side="left" className="w-[85vw] max-w-sm p-0 flex flex-col glass-sidebar">
            <SheetHeader className="p-3 border-b border-white/[0.06]">
              <SheetTitle className="text-sm">Conversas</SheetTitle>
            </SheetHeader>
            {chatListContent}
          </SheetContent>
        </Sheet>
      ) : (
        <div className="w-full md:w-[320px] flex-shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-border/50 min-h-0 bg-white/[0.02] backdrop-blur-sm hidden md:flex overflow-hidden">
          {chatListContent}
        </div>
      )}

      {/* ── Column 2: Chat window ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        {selectedChat ? (
          <>
            {/* Chat topbar */}
            <div className="h-13 flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-background z-20">
              <div className="flex items-center gap-2 min-w-0">
                {isMobile && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setLeftDrawerOpen(true)}>
                    <Menu className="h-4 w-4" />
                  </Button>
                )}
                <div className="h-8 w-8 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
                  <Phone className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {currentChat?.nome_contato || formatPhone(selectedChat)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {currentChat?.bot_ativo ? "🤖 Bot ativo" : "👤 Humano atendendo"}
                  </p>
                </div>
              </div>
              {/* Canal badge in chat header */}
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={cn(
                  "text-[10px] hidden sm:flex",
                  canal === "resolva_ja" ? "border-violet-400/30 text-violet-300" : "border-cyan-400/30 text-cyan-300"
                )}>
                  {canal === "resolva_ja" ? "Resolva Já" : "Martins Pontes"}
                </Badge>
                {isMobile && (
                  <Sheet open={rightSheetOpen} onOpenChange={setRightSheetOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Info className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[85vw] max-w-sm flex flex-col gap-4 overflow-y-auto glass-sidebar">
                      <SheetHeader>
                        <SheetTitle>Informações do Lead</SheetTitle>
                      </SheetHeader>
                      {rightPanelContent}
                    </SheetContent>
                  </Sheet>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0 min-w-0 bg-background/30 w-full relative">
              <div className="space-y-3 max-w-3xl mx-auto w-full">
                {mensagens.map((msg) => {
                  const outgoing = isOutgoing(msg);
                  return (
                    <div key={msg.id} className={cn("flex", outgoing ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[85%] sm:max-w-[72%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                          outgoing
                            ? "bg-violet-600/80 text-white rounded-br-sm backdrop-blur-sm"
                            : "bg-white/[0.06] text-foreground rounded-bl-sm border border-white/[0.07] backdrop-blur-sm"
                        )}
                      >
                        {msg.origem && (
                          <p className={cn("text-[9px] font-semibold uppercase mb-0.5 tracking-wide", outgoing ? "text-violet-200/70" : "text-muted-foreground/70")}>
                            {msg.origem}
                          </p>
                        )}
                        {msg.tipo_midia === "audio" ? (
                          <ChatAudioPlayer src={msg.conteudo || ""} outgoing={outgoing} />
                        ) : msg.tipo_midia === "imagem" || msg.tipo_midia === "image" ? (
                          <img src={msg.conteudo || ""} alt="imagem" className="rounded-lg max-w-full max-h-60" />
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.conteudo}</p>
                        )}
                        {msg.created_at && (
                          <p className={cn("text-[10px] mt-1 font-mono", outgoing ? "text-violet-200/50 text-right" : "text-muted-foreground/60")}>
                            {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input bar */}
            <div className="p-3 border-t border-white/[0.06] bg-background z-20">
              <div className="flex items-center gap-2 max-w-3xl mx-auto">
                <AudioRecorder onSend={handleAudioSend} disabled={sending} />
                <Input
                  placeholder="Digite uma mensagem..."
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1 bg-white/[0.04] border-white/[0.08] focus-visible:ring-violet-400/40"
                  disabled={sending}
                />
                <Button
                  onClick={sendMessage}
                  size="icon"
                  className="bg-violet-600 hover:bg-violet-700 shrink-0"
                  disabled={sending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
            {isMobile && (
              <Button variant="outline" onClick={() => setLeftDrawerOpen(true)} className="border-white/[0.08]">
                <Menu className="h-4 w-4 mr-2" /> Abrir Conversas
              </Button>
            )}
            <div className="text-center">
              <Phone className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Selecione uma conversa para começar</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Canal: {canal === "resolva_ja" ? "Resolva Já" : "Martins Pontes"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Column 3: Lead control panel (desktop only) ── */}
      {!isMobile && (
        <div className="hidden xl:flex w-[300px] flex-shrink-0 flex flex-col border-l border-border/50 min-h-0 p-4 gap-4 overflow-y-auto bg-white/[0.02] backdrop-blur-sm">
          {rightPanelContent}
        </div>
      )}
    </div>
  );
}
