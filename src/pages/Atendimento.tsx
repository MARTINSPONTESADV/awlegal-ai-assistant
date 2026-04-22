import { useState, useEffect, useRef, useMemo, Fragment } from "react";
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
import { ChatAvatar } from "@/components/atendimento/ChatAvatar";
import { supabaseMarketing } from "@/integrations/supabase/clientMarketing";
import {
  Bot, BotOff, Send, Phone, User, Circle,
  Search, Briefcase, Menu, Info, Pencil, Check, X, Building2, Zap,
  Archive, ArchiveRestore, MessageSquare, Paperclip, FileText, Settings, UserPlus, Trash2
} from "lucide-react";
import QuickReplyPopover from "@/components/atendimento/QuickReplyPopover";
import AtendimentoSettings from "@/components/atendimento/AtendimentoSettings";
import type { QuickReply } from "@/components/atendimento/QuickReplyPopover";
import { cn } from "@/lib/utils";
import { formatInTimeZone } from "date-fns-tz";
import ChatMediaRenderer from "@/components/atendimento/ChatMediaRenderer";
import AudioRecorder from "@/components/atendimento/AudioRecorder";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAtendimentoLeads } from "@/hooks/useAtendimentoLeads";

const N8N_WEBHOOK_URL = "https://n8n.awlegaltech.com.br/webhook/envio-manual-aw";

type Canal = "resolva_ja" | "martins_pontes";

const RJ_STAGES  = ["Triagem", "Qualificado"] as const;
const MP_STAGES  = ["Documentação", "Assinatura", "Fechado"] as const;
type FunilStage  = "Triagem" | "Qualificado" | "Documentação" | "Assinatura" | "Fechado";

// Retorna os últimos 8 dígitos do número (chave de deduplicação independente de formato)
function phoneKey(num: string): string {
  return num.replace(/\D/g, "").slice(-8);
}

// Remove sufixos JID do WhatsApp (@s.whatsapp.net, @c.us, @lid, @g.us)
function normalizeWaId(id: string): string {
  if (!id) return id;
  return id.replace(/@[^@]+$/i, "");
}

// ── Timezone helpers (America/Manaus = UTC-4) ──
const TZ = "America/Manaus";

function isHoje(dataStr: string): boolean {
  try {
    const hoje = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
    const d = formatInTimeZone(new Date(dataStr), TZ, "yyyy-MM-dd");
    return hoje === d;
  } catch { return false; }
}

function fmtHora(d: string | null | undefined): string {
  if (!d) return "";
  try { 
    if (isHoje(d)) return formatInTimeZone(new Date(d), TZ, "HH:mm");
    return formatInTimeZone(new Date(d), TZ, "dd/MM HH:mm");
  } catch { return ""; }
}

function fmtDataHora(d: string | null | undefined): string {
  if (!d) return "";
  try { return formatInTimeZone(new Date(d), TZ, "dd/MM HH:mm"); } catch { return ""; }
}

function fmtDataLabel(d: string): string {
  try {
    const hoje = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
    const ontem = formatInTimeZone(new Date(Date.now() - 86400000), TZ, "yyyy-MM-dd");
    const dia = formatInTimeZone(new Date(d), TZ, "yyyy-MM-dd");
    if (dia === hoje) return "Hoje";
    if (dia === ontem) return "Ontem";
    return formatInTimeZone(new Date(d), TZ, "dd/MM/yyyy");
  } catch { return ""; }
}

// ── FORA DO COMPONENTE: funções puras sem problema de hoisting ──
function formatPhone(id: string): string {
  if (!id) return "Desconhecido";
  const num = id.replace(/@s\.whatsapp\.net$/, "").replace(/@lid$/, "").replace(/@c\.us$/, "");
  if (num.length === 13) return `+${num.slice(0, 2)} (${num.slice(2, 4)}) ${num.slice(4, 5)} ${num.slice(5, 9)}-${num.slice(9)}`;
  if (num.length === 11) return `(${num.slice(0, 2)}) ${num.slice(2, 3)} ${num.slice(3, 7)}-${num.slice(7)}`;
  if (num.length === 10) return `(${num.slice(0, 2)}) ${num.slice(2, 6)}-${num.slice(6)}`;
  return num;
}

interface Mensagem {
  id: string;
  whatsapp_id: string | null;
  conteudo: string | null;
  direcao: string | null;
  origem: string | null;
  tipo_midia: string | null;
  media_url?: string | null;
  created_at: string | null;
}

export default function Atendimento() {
  useEffect(() => { document.title = "Atendimento — AW ECO"; }, []);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // ── Estado Base: rawLeads armazena dados (hidratado do cache React Query + sincronizado via realtime) ──
  const { data: cachedLeads, isLoading: isLoadingInitial } = useAtendimentoLeads();
  const [rawLeads, setRawLeads] = useState<any[]>([]);
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
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplyFilter, setQuickReplyFilter] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactMsg, setNewContactMsg] = useState("Olá! Entrando em contato pela Martins Pontes Advocacia. 👋");
  const [creatingContact, setCreatingContact] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [atendenteName, setAtendenteName] = useState(() => localStorage.getItem("mp_atendente") || "João Winícius");
  const [transferMsgs, setTransferMsgs] = useState<{ text: string; enabled: boolean }[]>([]);
  const [transferring, setTransferring] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedChatRef = useRef<string | null>(null);

  // ── Sincroniza state local rawLeads com o cache do React Query ──
  // rawLeads é mutado pelo realtime (INSERT/UPDATE). Quando o hook revalida,
  // re-sincroniza e os updates subsequentes em rawLeads refletem o estado atual.
  useEffect(() => {
    if (cachedLeads) setRawLeads(cachedLeads);
  }, [cachedLeads]);

  // ── useMemo: Computed State SEGURO para renderização ──
  const conversasComputadas = useMemo(() => {
    if (!rawLeads || !Array.isArray(rawLeads)) return [];
    return rawLeads.map((lead: any) => {
      const mensagem = lead.historico_mensagens?.[0]?.conteudo || "Iniciou conversa";
      const tipo = lead.historico_mensagens?.[0]?.tipo_midia || "texto";
      const lastTime = lead.historico_mensagens?.[0]?.created_at || undefined;
      // nome_contato = nome curado (GPT + edição manual) tem prioridade sobre nome (pushName bruto do WA)
      const nomeExibicao = lead.nome_contato || lead.nome || formatPhone(lead.whatsapp_numero || "") || "Desconhecido";

      // Prévia da mensagem (aceita tipos em PT e EN)
      const tipoLower = (tipo || "").toLowerCase();
      const ultimaMensagem = tipoLower === "audio" || tipoLower === "ptt"
        ? "🎵 Áudio"
        : tipoLower === "image" || tipoLower === "imagem"
          ? "📷 Imagem"
          : tipoLower === "document" || tipoLower === "documento"
            ? "📄 Documento"
            : (mensagem && mensagem.length > 35
                ? mensagem.substring(0, 35) + "..."
                : mensagem);

      return {
        ...lead,
        nomeExibicao,
        ultimaMensagem,
        tipoMidia: tipo,
        lastTime,
        // Normalização de campos seguros
        whatsapp_numero: lead.whatsapp_numero || "",
        bot_ativo: lead.bot_ativo ?? null,
        arquivado: lead.arquivado || false,
        canal: lead.canal || null,
        unread_count: lead.unread_count || 0,
      };
    });
  }, [rawLeads]);

  // ── filteredChats: filtragem e ordenação sobre o computed ──
  const filteredChats = useMemo(() => {
    return conversasComputadas
      .filter((c: any) => {
        const matchSearch = (c.whatsapp_numero || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.nomeExibicao || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchCanal = canal === "resolva_ja"
          ? !c.canal || c.canal === "resolva_ja"
          : c.canal === "martins_pontes";
        const matchArchived = showArchived ? c.arquivado === true : !c.arquivado;
        const isLid = (c.whatsapp_numero || "").endsWith("@lid");
        const matchStage = !stageFilter || (c.status_funil || "Triagem") === stageFilter;
        return matchSearch && matchCanal && matchArchived && matchStage && !isLid;
      })
      .sort((a: any, b: any) => {
        const timeA = a.lastTime ? new Date(a.lastTime).getTime() : 0;
        const timeB = b.lastTime ? new Date(b.lastTime).getTime() : 0;
        return timeB - timeA;
      });
  }, [conversasComputadas, searchTerm, canal, showArchived, stageFilter]);

  // ── Carrega respostas rápidas do banco ──
  useEffect(() => {
    (supabase as any)
      .from("mensagens_rapidas")
      .select("*")
      .order("ordem", { ascending: true })
      .then(({ data }: { data: QuickReply[] | null }) => {
        if (data) setQuickReplies(data);
      });
  }, []);

  // ── Carrega mensagens do chat selecionado ──
  useEffect(() => {
    if (!selectedChat) return;
    async function loadMsgs() {
      const normalizedChat = normalizeWaId(selectedChat!);
      // OR abrange formato limpo ("559...") E com sufixo JID ("559...@s.whatsapp.net")
      // para ser resiliente a workflows n8n que ainda não foram corrigidos
      let msgQuery: any = supabase
        .from("historico_mensagens")
        .select("*")
        .or(`whatsapp_id.eq.${normalizedChat},whatsapp_id.like.${normalizedChat}@%`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (canal === "martins_pontes") {
        msgQuery = msgQuery.eq("canal", "martins_pontes");
      } else {
        msgQuery = msgQuery.or("canal.is.null,canal.eq.resolva_ja");
      }
      const { data } = await msgQuery;
      if (data) setMensagens([...data].reverse());
    }
    loadMsgs();

    const normalizedChatId = normalizeWaId(selectedChat!);
    // Handler compartilhado pelos dois filtros
    const handleMsgChange = (payload: any) => {
      if (payload.eventType === "INSERT") {
        setMensagens((prev) => [...prev, payload.new as Mensagem]);
      } else if (payload.eventType === "UPDATE") {
        setMensagens((prev) => prev.map(m => m.id === payload.new.id ? (payload.new as Mensagem) : m));
      } else if (payload.eventType === "DELETE") {
        setMensagens((prev) => prev.filter(m => m.id !== payload.old.id));
      }
    };
    // Dois filtros: formato limpo + formato com @s.whatsapp.net
    // (workflows n8n podem salvar com ou sem sufixo JID)
    const channel = supabase
      .channel(`chat-${normalizedChatId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "historico_mensagens",
        filter: `whatsapp_id=eq.${normalizedChatId}`,
      }, handleMsgChange)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "historico_mensagens",
        filter: `whatsapp_id=eq.${normalizedChatId}@s.whatsapp.net`,
      }, handleMsgChange)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedChat, canal]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [mensagens]);

  // ── Realtime GLOBAL: atualiza lastMessage de QUALQUER contato ──
  useEffect(() => {
    const globalChannel = supabase
      .channel("todas-mensagens-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "historico_mensagens",
      }, (payload) => {
        const nova = payload.new as any;
        const remetente = normalizeWaId(nova.whatsapp_id);
        if (!remetente) return;

        setRawLeads((prev) => {
          const isIncoming = nova.direcao === "entrada" || nova.origem === "cliente";
          const novaCanal = nova.canal || null;

          // Verifica se já existe entrada para esse contato+canal (null e "resolva_ja" são equivalentes)
          const jaExisteNoCanal = prev.some(
            (c: any) => c.whatsapp_numero === remetente
              && (c.canal || "resolva_ja") === (novaCanal || "resolva_ja")
          );

          // Se é nova mensagem MP de contato que ainda não está na lista, adiciona
          if (!jaExisteNoCanal && novaCanal === "martins_pontes") {
            const cbEntry = prev.find((c: any) => c.whatsapp_numero === remetente);
            return [...prev, {
              ...(cbEntry || {}),
              whatsapp_numero: remetente,
              canal: "martins_pontes",
              bot_ativo: cbEntry?.bot_ativo ?? false,
              arquivado: cbEntry?.arquivado ?? false,
              historico_mensagens: [{ conteudo: nova.conteudo, tipo_midia: nova.tipo_midia, created_at: nova.created_at }],
              unread_count: isIncoming ? 1 : 0,
            }];
          }

          // Caso normal: atualiza preview do contato existente (mesma lógica original)
          return prev.map((c: any) => {
            if (c.whatsapp_numero !== remetente) return c;
            // Bug 4: null e "resolva_ja" são equivalentes no canal
            if ((c.canal || "resolva_ja") !== (novaCanal || "resolva_ja")) return c;
            // Bug 1: desarquiva usando campo correto por canal
            const deveDesarquivar = isIncoming && c.arquivado;
            if (deveDesarquivar) {
              if (c.canal === "martins_pontes") {
                supabase.from("controle_bot").update({ arquivado_mp: false } as any)
                  .eq("whatsapp_numero", remetente);
              } else {
                supabase.from("controle_bot").update({ arquivado: false } as any)
                  .eq("whatsapp_numero", remetente);
              }
            }
            return {
              ...c,
              arquivado: deveDesarquivar ? false : c.arquivado,
              historico_mensagens: [{ conteudo: nova.conteudo, tipo_midia: nova.tipo_midia, created_at: nova.created_at }],
              unread_count: (isIncoming && selectedChatRef.current !== remetente)
                ? (c.unread_count || 0) + 1
                : c.unread_count,
            };
          });
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(globalChannel); };
  }, []);

  // ── Realtime CONTROLE_BOT: escuta atualizações de perfil ──
  useEffect(() => {
    const controleChannel = supabase
      .channel("controle-bot-realtime")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "controle_bot",
      }, (payload) => {
        const atualizado = payload.new as any;

        setRawLeads((prev) =>
          prev.map((c: any) => {
            if (c.whatsapp_numero !== atualizado.whatsapp_numero) return c;

            // Bug 3: validar nome antes de aplicar — rejeita frases genéricas do bot
            const newNome = atualizado.nome_contato || atualizado.nome;
            const FRASES_GENERICAS = ["olá", "ola!", "como posso", "parece que", "buscando", "entendido", "posso ajudar", "claro,", "entendo"];
            const isNomeValido = newNome
              && newNome.trim().length >= 2
              && newNome.trim().length <= 50
              && !FRASES_GENERICAS.some((f: string) => newNome.toLowerCase().includes(f));

            // Bug 1: sincronizar arquivado por canal (MP usa arquivado_mp mapeado como arquivado)
            const isMP = c.canal === "martins_pontes";
            const novoArquivado = isMP
              ? (atualizado.arquivado_mp ?? c.arquivado)
              : (atualizado.arquivado ?? c.arquivado);

            return {
              ...c,
              nome: isNomeValido ? newNome : c.nome,
              nome_contato: isNomeValido ? newNome : c.nome_contato,
              arquivado: novoArquivado,
              bot_ativo: atualizado.bot_ativo ?? c.bot_ativo,
              foto_perfil_url: atualizado.foto_perfil_url ?? c.foto_perfil_url,
            };
          })
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(controleChannel); };
  }, []);

  // Mantém ref sincronizada sem recriar o channel global
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

  // currentChat busca em filteredChats (já filtrado pela aba/canal atual)
  // para que o canal do contato corresponda à aba que o usuário está vendo
  const currentChat = filteredChats.find((c: any) => c.whatsapp_numero === selectedChat)
    || conversasComputadas.find((c: any) => c.whatsapp_numero === selectedChat);

  useEffect(() => {
    if (currentChat) {
      setContactName(currentChat.nomeExibicao || "");
      setEditingName(false);
    }
  }, [selectedChat]);

  const saveContactName = async () => {
    if (!selectedChat) return;
    const trimmed = contactName.trim();
    await supabase
      .from("controle_bot")
      .update({ nome_contato: trimmed || null })
      .eq("whatsapp_numero", selectedChat);
    setRawLeads((prev) =>
      prev.map((c: any) =>
        c.whatsapp_numero === selectedChat ? { ...c, nome_contato: trimmed || null } : c
      )
    );
    setEditingName(false);
    toast({ title: trimmed ? `Contato renomeado para "${trimmed}"` : "Nome removido" });
  };

  // leadStage derivado do currentChat (status_funil carregado em batch no load)
  const leadStage = (currentChat as any)?.status_funil || "Triagem";

  // Bot só opera no canal Resolva Já — na aba MP não existe toggle
  const isBotChannel = canal !== "martins_pontes";

  const toggleBot = async () => {
    if (!currentChat || !selectedChat || !isBotChannel) return;
    setLoadingBot(true);
    const previousVal = currentChat.bot_ativo;
    const newVal = !previousVal;

    // Optimistic update
    setRawLeads((prev) =>
      prev.map((c: any) =>
        c.whatsapp_numero === selectedChat ? { ...c, bot_ativo: newVal } : c
      )
    );

    try {
      console.log("[toggleBot] Atualizando bot_ativo:", { selectedChat, previousVal, newVal });

      const { data: rpcData, error: updateError } = await (supabase as any)
        .rpc('set_bot_status', { p_numero: selectedChat, p_ativo: newVal });

      console.log("[toggleBot] RPC response:", { rows: rpcData?.length, data: rpcData, error: updateError });

      if (updateError) {
        throw new Error(`Supabase error: ${updateError.message}`);
      }
      const restData = rpcData;

      if (!Array.isArray(restData) || restData.length === 0) {
        throw new Error("UPDATE retornou 0 linhas — verifique as RLS policies da tabela controle_bot");
      }

      // Verifica que o valor realmente mudou na resposta
      const dbVal = restData[0]?.out_bot_ativo ?? restData[0]?.bot_ativo;
      if (dbVal !== newVal) {
        console.error("[toggleBot] DB retornou bot_ativo =", dbVal, "esperado:", newVal);
        throw new Error("Valor não persistiu no banco");
      }

      console.log("[toggleBot] ✅ Persistido com sucesso! bot_ativo =", newVal);

      // Sincroniza com followup_clientes (Bot/CRM): humano_na_conversa = !bot_ativo
      // Se bot OFF → atendente assumiu → pausa follow-up automático.
      // Se bot ON → libera follow-up automático (respeita hard guards do workflow).
      // Atualiza ambos formatos de remoteid (com e sem @s.whatsapp.net) pra cobrir legados.
      try {
        const num = selectedChat.replace(/@s\.whatsapp\.net$/, "");
        await (supabaseMarketing as any)
          .from("followup_clientes")
          .update({ humano_na_conversa: !newVal })
          .or(`remoteid.eq.${num},remoteid.eq.${num}@s.whatsapp.net`);
      } catch (fuErr) {
        console.warn("[toggleBot] Falha ao sincronizar followup_clientes (não crítico):", fuErr);
      }

      // Quando reativar o bot, limpar também o Redis block
      if (newVal) {
        fetch("https://n8n.awlegaltech.com.br/webhook/reativar-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numero: selectedChat }),
        }).catch(() => {});
      }

      toast({
        title: newVal ? "Robô Ativado ✅" : "Robô Pausado — Humano Assumiu ✅",
        description: newVal ? "O bot voltou a responder." : "Você assumiu o atendimento.",
      });
    } catch (err: any) {
      console.error("[toggleBot] ERRO:", err);
      // Reverte o optimistic update
      setRawLeads((prev) =>
        prev.map((c: any) =>
          c.whatsapp_numero === selectedChat ? { ...c, bot_ativo: previousVal } : c
        )
      );
      toast({
        title: "Erro ao alterar status do robô",
        description: err?.message || "Verifique as permissões RLS da tabela controle_bot",
        variant: "destructive",
      });
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
        body: JSON.stringify({ tipo: "text", numero: selectedChat, mensagem: newMsg, canal }),
      });
      if (!response.ok) throw new Error("Webhook error");
      setNewMsg("");
      toast({ title: "Mensagem enviada!" });
    } catch {
      toast({ title: "Erro ao enviar mensagem — verifique se o servidor n8n está online", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleAudioSend = async (blob: Blob, extension: string = ".webm") => {
    if (!selectedChat) return;
    const contentType = "audio/webm";
    const ext = extension.startsWith(".") ? extension : `.${extension}`;
    const filename = `${selectedChat}/${Date.now()}${ext}`;

    const { error: uploadError } = await supabase.storage
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
        body: JSON.stringify({ tipo: "audio", numero: selectedChat, audioUrl: publicUrl, canal, options: { ptt: true } }),
      });
      if (!response.ok) throw new Error(`Webhook HTTP ${response.status}`);
      toast({ title: "Áudio enviado!" });
    } catch {
      toast({ title: "Erro ao enviar áudio", variant: "destructive" });
    }
  };

  const handleFileSend = async () => {
    if (!attachedFile || !selectedChat) return;
    setUploadingFile(true);
    try {
      const tipo = attachedFile.type.startsWith("image/") ? "image" : "document";
      const safeName = attachedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const safeFolder = selectedChat.replace(/[^a-zA-Z0-9-]/g, "_");
      const filename = `${safeFolder}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-media")
        .upload(filename, attachedFile, { contentType: attachedFile.type, cacheControl: "3600", upsert: false });
      if (uploadError) {
        toast({ title: "Erro ao fazer upload do arquivo", variant: "destructive" });
        return;
      }
      const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(filename);
      const mediaUrl = urlData.publicUrl;
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, numero: selectedChat, mediaUrl, fileName: attachedFile.name, canal }),
      });
      if (!response.ok) throw new Error(`Webhook HTTP ${response.status}`);
      setAttachedFile(null);
      toast({ title: tipo === "image" ? "Imagem enviada!" : "Documento enviado!" });
    } catch {
      toast({ title: "Erro ao enviar arquivo", variant: "destructive" });
    } finally {
      setUploadingFile(false);
    }
  };

  // ── Quick replies ──
  const handleMsgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMsg(val);
    if (val) setAttachedFile(null);
    if (val.startsWith("/")) {
      setQuickReplyFilter(val.slice(1));
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
      setQuickReplyFilter("");
    }
  };

  const selectQuickReply = (conteudo: string) => {
    setNewMsg(conteudo);
    setShowQuickReplies(false);
    setQuickReplyFilter("");
  };

  // ── Etapa do funil ──
  const handleStageChange = async (stage: string) => {
    if (!selectedChat) return;
    const anterior = (currentChat as any)?.status_funil || null;
    // Optimistic update no rawLeads para refletir imediatamente
    setRawLeads((prev) =>
      prev.map((c: any) =>
        c.whatsapp_numero === selectedChat ? { ...c, status_funil: stage } : c
      )
    );
    await (supabase as any)
      .from("controle_atendimento")
      .upsert({ whatsapp_id: selectedChat, status_funil: stage }, { onConflict: "whatsapp_id" });
    // Registra histórico de mudança para métricas de tempo por estágio
    (supabase as any)
      .from("historico_funil")
      .insert({ whatsapp_id: selectedChat, canal, status_anterior: anterior, status_novo: stage })
      .then(() => {});
  };

  // ── Excluir contato permanentemente ──
  const deleteContact = async () => {
    if (!selectedChat || !currentChat) return;
    const confirmar = window.confirm(
      `Excluir "${currentChat.nomeExibicao}"? O contato será removido permanentemente da lista.`
    );
    if (!confirmar) return;
    try {
      const { error } = await (supabase as any)
        .from("controle_bot")
        .upsert({ whatsapp_numero: selectedChat, excluido: true } as any,
                 { onConflict: "whatsapp_numero" });
      if (error) throw error;
      setRawLeads((prev) => prev.filter((l: any) => l.whatsapp_numero !== selectedChat));
      setSelectedChat(null);
      toast({ title: "Contato excluído" });
    } catch (err) {
      console.error("[deleteContact] Erro:", err);
      toast({ title: "Erro ao excluir contato", variant: "destructive" });
    }
  };

  // ── Criar contato no canal MP ──
  const createMPContact = async () => {
    const digits = newContactPhone.replace(/\D/g, "");
    if (digits.length < 10) {
      toast({ title: "Número inválido — mínimo 10 dígitos", variant: "destructive" });
      return;
    }
    const numero = digits.startsWith("55") ? digits : `55${digits}`;
    const msg = newContactMsg.trim() || "Olá! Entrando em contato pela Martins Pontes Advocacia. 👋";
    setCreatingContact(true);
    try {
      // Dedup: verifica se já existe contato MP com os mesmos últimos 8 dígitos
      const existing = rawLeads.find((l: any) =>
        l.canal === "martins_pontes" && phoneKey(l.whatsapp_numero) === phoneKey(numero)
      );
      if (existing) {
        // Envia pelo número real (já conhecido pelo Evolution API), sem criar duplicata
        await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: "text", numero: existing.whatsapp_numero, mensagem: msg, canal: "martins_pontes" }),
        });
        setNewContactOpen(false);
        setNewContactPhone("");
        setNewContactMsg("Olá! Entrando em contato pela Martins Pontes Advocacia. 👋");
        setSelectedChat(existing.whatsapp_numero);
        toast({ title: "Mensagem enviada para contato existente!" });
        return;
      }

      await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "text", numero, mensagem: msg, canal: "martins_pontes" }),
      });
      await (supabase as any)
        .from("controle_atendimento")
        .upsert({ whatsapp_id: numero, status_funil: "Documentação", modulo_origem: "martins_pontes" },
                 { onConflict: "whatsapp_id" });
      setRawLeads((prev) => [...prev, {
        whatsapp_numero: numero,
        canal: "martins_pontes",
        bot_ativo: false,
        arquivado: false,
        status_funil: "Documentação",
        historico_mensagens: [{ conteudo: msg, tipo_midia: "texto", created_at: new Date().toISOString() }],
      }]);
      setNewContactOpen(false);
      setNewContactPhone("");
      setNewContactMsg("Olá! Entrando em contato pela Martins Pontes Advocacia. 👋");
      setSelectedChat(numero);
      toast({ title: "Contato criado e mensagem enviada!" });
    } catch {
      toast({ title: "Erro ao criar contato", variant: "destructive" });
    } finally {
      setCreatingContact(false);
    }
  };

  const isOutgoing = (msg: Mensagem) => {
    if (msg.direcao === "saida") return true;
    if (msg.direcao === "entrada") return false;
    const origem = msg.origem?.toLowerCase();
    return origem === "bot" || origem === "advogado";
  };

  const markAsRead = async (numero: string) => {
    supabase
      .from("controle_bot")
      .update({ unread_count: 0 } as any)
      .eq("whatsapp_numero", numero)
      .then(() => {});

    setRawLeads((prev) =>
      prev.map((c: any) =>
        c.whatsapp_numero === numero ? { ...c, unread_count: 0 } : c
      )
    );
  };

  const handleSelectChat = (numero: string) => {
    setSelectedChat(numero);
    markAsRead(numero);
    if (isMobile) setLeftDrawerOpen(false);
  };

  // ── Transferir lead RJ → MP ──
  const openTransfer = () => {
    const nome = (currentChat as any)?.nomeExibicao || "cliente";
    const atd = atendenteName;
    setTransferMsgs([
      { text: `Bom dia, ${nome}! Bem-vindo ao escritório Martins Pontes, me chamo ${atd}, vou dar continuidade ao seu atendimento!`, enabled: true },
      { text: `Esse é o nosso perfil do Instagram caso queira conhecer mais sobre o escritório!\nhttps://instagram.com/martinspontes.adv\nSomos um escritório com mais de 100 clientes por todo o Brasil, com processos no Amazonas, Pará e até Santa Catarina. Lutamos pelos consumidores do Brasil todo!`, enabled: true },
      { text: `Esses são os documentos necessários para que possamos entrar com a ação:\n\n1- RG ou CPF\n2- Comprovante de residência no seu nome\n\nAssim que me enviar esses documentos irei gerar um contrato e uma procuração para você assinar. Fico no aguardo! 😄👍`, enabled: true },
    ]);
    setTransferOpen(true);
  };

  const transferToMP = async () => {
    if (!selectedChat) return;
    setTransferring(true);
    localStorage.setItem("mp_atendente", atendenteName);
    try {
      const msgsParaEnviar = transferMsgs.filter((m) => m.enabled && m.text.trim());

      // ① Envia mensagens via n8n — falha silenciosa se n8n estiver indisponível
      let webhookOk = true;
      try {
        for (const m of msgsParaEnviar) {
          await fetch(N8N_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tipo: "text", numero: selectedChat, mensagem: m.text, canal: "martins_pontes" }),
          });
        }
      } catch (webhookErr) {
        console.error("[transferToMP] Webhook n8n falhou:", webhookErr);
        webhookOk = false;
      }

      // ② Atualiza Supabase independentemente do n8n
      await (supabase as any)
        .from("controle_atendimento")
        .upsert({ whatsapp_id: selectedChat, status_funil: "Documentação", modulo_origem: "martins_pontes" },
                 { onConflict: "whatsapp_id" });
      (supabase as any)
        .from("historico_funil")
        .insert({ whatsapp_id: selectedChat, canal: "martins_pontes", status_anterior: leadStage, status_novo: "Documentação" })
        .then(() => {});

      // ③ Garante entrada MP em rawLeads (sem duplicata por phoneKey)
      const numReal = selectedChat;
      setRawLeads((prev) => {
        const jaExiste = prev.some((l: any) => l.canal === "martins_pontes" && phoneKey(l.whatsapp_numero) === phoneKey(numReal));
        if (jaExiste) {
          return prev.map((l: any) =>
            l.canal === "martins_pontes" && phoneKey(l.whatsapp_numero) === phoneKey(numReal)
              ? { ...l, status_funil: "Documentação" } : l
          );
        }
        return [...prev, {
          whatsapp_numero: numReal,
          canal: "martins_pontes",
          bot_ativo: false,
          arquivado: false,
          status_funil: "Documentação",
          historico_mensagens: msgsParaEnviar.length > 0
            ? [{ conteudo: msgsParaEnviar[0].text, tipo_midia: "texto", created_at: new Date().toISOString() }]
            : [],
        }];
      });
      setTransferOpen(false);
      setCanal("martins_pontes");
      setSelectedChat(null);
      setTimeout(() => setSelectedChat(numReal), 120);

      // ④ Toast diferenciado conforme estado do n8n
      if (webhookOk) {
        toast({ title: "Lead transferido para o canal Martins Pontes! ✅" });
      } else {
        toast({ title: "Lead transferido ✅ — mensagens WhatsApp pendentes (servidor n8n indisponível)" });
      }
    } catch (err) {
      console.error("[transferToMP] Erro Supabase:", err);
      toast({ title: "Erro ao transferir lead", variant: "destructive" });
    } finally {
      setTransferring(false);
    }
  };

  // ── Canal Selector ──
  const canalSelector = (
    <div className="flex rounded-xl overflow-hidden border border-white/[0.08] shrink-0">
      <button
        onClick={() => { setCanal("resolva_ja"); setSelectedChat(null); setStageFilter(null); }}
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
        onClick={() => { setCanal("martins_pontes"); setSelectedChat(null); setStageFilter(null); }}
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

  // ── Chat list: itera APENAS sobre filteredChats (derivado de conversasComputadas) ──
  const chatListContent = (
    <>
      <div className="px-3 pt-3 pb-2 flex items-center justify-between gap-2">
        <div className="flex-1 overflow-x-auto">
          {canalSelector}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/[0.08]"
          onClick={() => setSettingsOpen(true)}
          title="Respostas rápidas"
        >
          <Settings className="h-4 w-4" />
        </Button>
        {canal === "martins_pontes" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-cyan-400 hover:bg-cyan-500/10"
            onClick={() => setNewContactOpen(true)}
            title="Novo contato MP"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        )}
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
      {/* Stage filter chips */}
      <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {(["Todos", ...(canal === "martins_pontes" ? [...MP_STAGES] : [...RJ_STAGES])] as string[]).map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s === "Todos" ? null : s)}
            className={cn(
              "shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all whitespace-nowrap",
              (s === "Todos" ? stageFilter === null : stageFilter === s)
                ? canal === "martins_pontes"
                  ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300"
                  : "bg-violet-500/20 border-violet-400/40 text-violet-300"
                : "bg-white/[0.03] border-white/[0.07] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <ScrollArea className="flex-1">
        {isLoadingInitial ? (
          <div>
            <div className="flex items-center gap-2 px-4 py-3 text-xs font-medium text-violet-300/90 border-b border-white/[0.04]">
              <div className="h-3 w-3 rounded-full border-2 border-violet-400/40 border-t-violet-400 animate-spin" />
              <span>Carregando conversas…</span>
            </div>
            <div className="space-y-0">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-3 border-b border-white/[0.04]">
                  <div className="h-10 w-10 rounded-full bg-violet-500/10 ring-1 ring-violet-400/10 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 rounded bg-white/10 animate-pulse" style={{ width: `${55 + (i * 7) % 30}%` }} />
                    <div className="h-2.5 rounded bg-white/5 animate-pulse" style={{ width: `${70 + (i * 11) % 20}%` }} />
                    <div className="h-2 rounded bg-white/5 animate-pulse w-12" />
                  </div>
                  <div className="h-2 rounded bg-white/10 animate-pulse w-8 mt-2" />
                </div>
              ))}
            </div>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Search className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          filteredChats.map((chat: any) => (
            <button
              key={chat.whatsapp_numero}
              onClick={() => handleSelectChat(chat.whatsapp_numero)}
              className={cn(
                "group relative w-full flex items-start gap-3 px-3 py-3 text-left transition-all border-b border-white/[0.04] hover:bg-white/[0.05]",
                selectedChat === chat.whatsapp_numero && "bg-violet-500/10 border-l-2 border-l-violet-400"
              )}
            >
              <div className="relative shrink-0 pt-0.5">
                <ChatAvatar fotoUrl={chat.foto_perfil_url} size="md" />
                {chat.bot_ativo && canal !== "martins_pontes" && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-background" />
                )}
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-foreground truncate pr-4">
                    {chat.nomeExibicao}
                  </span>
                  {chat.lastTime && chat.canal !== "martins_pontes" && (
                    <span className={cn("text-[10px] shrink-0 font-medium", chat.unread_count ? "text-emerald-400" : "text-muted-foreground")}>
                      {fmtHora(chat.lastTime)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-0.5 gap-2 pr-4">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      {chat.ultimaMensagem}
                    </p>
                  </div>
                  
                  {chat.unread_count && chat.unread_count > 0 && chat.canal !== "martins_pontes" ? (
                    <div className="bg-emerald-500 text-white rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
                      {chat.unread_count}
                    </div>
                  ) : null}
                </div>
                
                {canal !== "martins_pontes" && (
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
                )}
              </div>
            </button>
          ))
        )}
      </ScrollArea>
    </>
  );

  // ── Right info panel ──
  const rightPanelContent = currentChat ? (
    <>
      <div className="text-center">
        <ChatAvatar
          fotoUrl={(currentChat as any)?.foto_perfil_url}
          size="lg"
          className="mx-auto mb-2 ring-2 ring-violet-400/25"
        />
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
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingName(false); setContactName(currentChat.nomeExibicao || ""); }}>
              <X className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1 mt-1">
            <p className="font-semibold text-sm text-foreground">
              {currentChat.nomeExibicao}
            </p>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingName(true)}>
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        )}
        {(currentChat.nome || currentChat.nome_contato) && (
          <p className="text-xs text-muted-foreground font-mono">{formatPhone(selectedChat || "")}</p>
        )}
        {isBotChannel && (
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
        )}
      </div>

      {/* ── Etapa no funil ── */}
      <div className="w-full">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Etapa no Funil</p>
        {(() => {
          const visibleStages: FunilStage[] = canal === "martins_pontes"
            ? [...MP_STAGES]
            : [...RJ_STAGES];
          const currentIdx = visibleStages.indexOf((leadStage || visibleStages[0]) as FunilStage);
          return (
            <>
              {/* Barra de progresso */}
              <div className="flex gap-0.5 mb-2">
                {visibleStages.map((stage, stageIdx) => (
                  <div
                    key={stage}
                    className={cn(
                      "flex-1 h-1 rounded-full transition-all duration-300",
                      stageIdx <= currentIdx
                        ? canal === "martins_pontes" ? "bg-cyan-500" : "bg-violet-500"
                        : "bg-white/[0.08]"
                    )}
                  />
                ))}
              </div>
              {/* Botões de etapa */}
              <div className={cn("grid gap-1", visibleStages.length === 2 ? "grid-cols-2" : "grid-cols-2")}>
                {visibleStages.map((stage, stageIdx) => {
                  const isActive = leadStage === stage;
                  const isPast = stageIdx < currentIdx;
                  return (
                    <button
                      key={stage}
                      onClick={() => handleStageChange(stage)}
                      className={cn(
                        "text-[10px] px-2 py-1.5 rounded-lg font-medium transition-all border text-center",
                        isActive
                          ? canal === "martins_pontes"
                            ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300"
                            : "bg-violet-500/20 border-violet-400/40 text-violet-300"
                          : isPast
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400/70 hover:bg-emerald-500/15"
                            : "bg-white/[0.03] border-white/[0.07] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                      )}
                    >
                      {isPast ? "✓ " : ""}{stage}
                    </button>
                  );
                })}
              </div>
            </>
          );
        })()}
      </div>

      <div className="space-y-2">
        {isBotChannel && (
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
        )}

        <Button
          variant="outline"
          className="w-full border-white/[0.08] hover:bg-white/[0.05] text-muted-foreground hover:text-foreground"
          onClick={async () => {
            const novoStatus = !(currentChat.arquivado || false);
            const isMP = canal === "martins_pontes";
            try {
              let error;
              if (isMP) {
                // Bug 1: MP usa campo separado (upsert pois o contato pode não ter row em controle_bot)
                const res = await supabase.from("controle_bot")
                  .upsert({ whatsapp_numero: selectedChat, arquivado_mp: novoStatus } as any,
                           { onConflict: "whatsapp_numero" });
                error = res.error;
              } else {
                const res = await supabase.from("controle_bot")
                  .update({ arquivado: novoStatus } as any)
                  .eq("whatsapp_numero", selectedChat);
                error = res.error;
              }
              if (error) throw error;
              // Atualiza apenas a entrada do canal correto no rawLeads
              const canalAtual = canal;
              setRawLeads(prev => prev.map((c: any) =>
                c.whatsapp_numero === selectedChat && c.canal === canalAtual
                  ? { ...c, arquivado: novoStatus }
                  : c
              ));
              if (novoStatus) setSelectedChat(null);
              toast({ title: novoStatus ? "Conversa arquivada" : "Conversa retornada das arquivadas" });
            } catch (err) {
              console.error(err);
              toast({ title: "Erro ao atualizar status de arquivamento", variant: "destructive" });
            }
          }}
        >
          {currentChat.arquivado ? (
            <><ArchiveRestore className="h-4 w-4 mr-2" /> Desarquivar Conversa</>
          ) : (
            <><Archive className="h-4 w-4 mr-2" /> Arquivar Conversa</>
          )}
        </Button>
        <Button
          variant="ghost"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border border-destructive/20"
          onClick={deleteContact}
        >
          <Trash2 className="h-4 w-4 mr-2" /> Excluir Contato
        </Button>
      </div>

      <div className="border-t border-white/[0.06] pt-4 space-y-3">
        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Informações</h4>
        <div className="space-y-2 text-sm">
          {canal !== "martins_pontes" && (
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Status Bot</span>
              <Badge variant="secondary" className="text-xs">{currentChat.bot_ativo ? "Ativo" : "Pausado"}</Badge>
            </div>
          )}
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
                {fmtDataHora(currentChat.last_intercept)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/[0.06] pt-4 space-y-2">
        {canal !== "martins_pontes" && (
          <Button
            variant="outline"
            className="w-full border-cyan-400/20 text-cyan-300 hover:bg-cyan-500/10"
            onClick={openTransfer}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Transferir para MP
          </Button>
        )}
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
    <div className="h-full w-full overflow-hidden flex flex-col md:flex-row min-w-0 min-h-0">
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
                <ChatAvatar fotoUrl={(currentChat as any)?.foto_perfil_url} size="sm" className="shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {currentChat?.nomeExibicao || formatPhone(selectedChat)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {canal === "martins_pontes" ? "Canal Martins Pontes" : (currentChat?.bot_ativo ? "🤖 Bot ativo" : "👤 Humano atendendo")}
                  </p>
                </div>
              </div>
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
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0 min-w-0 bg-background/30 w-full relative">
              <div className="space-y-3 max-w-3xl mx-auto w-full">
                {mensagens.map((msg, idx) => {
                  const outgoing = isOutgoing(msg);
                  const dataLabel = msg.created_at ? fmtDataLabel(msg.created_at) : null;
                  const prevDataLabel = idx > 0 && mensagens[idx - 1].created_at
                    ? fmtDataLabel(mensagens[idx - 1].created_at!)
                    : null;
                  const showDateSep = dataLabel && dataLabel !== prevDataLabel;
                  return (
                    <Fragment key={msg.id}>
                      {showDateSep && (
                        <div className="flex items-center gap-2 my-4">
                          <div className="flex-1 h-px bg-white/[0.07]" />
                          <span className="text-[11px] text-muted-foreground/60 font-medium px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                            {dataLabel}
                          </span>
                          <div className="flex-1 h-px bg-white/[0.07]" />
                        </div>
                      )}
                      <div className={cn("flex", outgoing ? "justify-end" : "justify-start")}>
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
                          <ChatMediaRenderer conteudo={msg.conteudo || ""} tipo_midia={msg.tipo_midia} media_url={msg.media_url} outgoing={outgoing} />
                          {msg.created_at && (
                            <p className={cn("text-[10px] mt-1 font-mono", outgoing ? "text-violet-200/50 text-right" : "text-muted-foreground/60")}>
                              {fmtHora(msg.created_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    </Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input bar */}
            <div className="px-3 pt-3 pb-6 md:pb-4 border-t border-white/[0.06] bg-background z-20">
              {/* File preview */}
              {attachedFile && (
                <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                  {attachedFile.type.startsWith("image/") ? (
                    <img src={URL.createObjectURL(attachedFile)} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                  ) : (
                    <FileText className="h-8 w-8 text-violet-400 shrink-0" />
                  )}
                  <span className="text-sm text-foreground/80 truncate flex-1">{attachedFile.name}</span>
                  <button onClick={() => setAttachedFile(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 sm:gap-3 max-w-3xl mx-auto">
                {/* Hidden file input — opened via <label> below (works em mobile sem duplo clique) */}
                <input
                  id="file-attach-input"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setAttachedFile(f); setNewMsg(""); } e.target.value = ""; }}
                />

                {/* Paperclip — visível apenas fora da gravação */}
                {!isRecordingAudio && (
                  <label
                    htmlFor="file-attach-input"
                    className={cn(
                      "shrink-0 h-11 w-11 flex items-center justify-center rounded-md cursor-pointer text-muted-foreground hover:text-foreground transition-colors",
                      (sending || uploadingFile) && "pointer-events-none opacity-40"
                    )}
                    title="Anexar arquivo"
                  >
                    <Paperclip className="h-5 w-5" />
                  </label>
                )}

                <AudioRecorder
                  onSend={handleAudioSend}
                  disabled={sending || uploadingFile}
                  onRecordingChange={setIsRecordingAudio}
                />

                {/* Input e botão Send — ocultos durante gravação */}
                {!isRecordingAudio && (
                  <>
                    <div className="flex-1 relative">
                      {showQuickReplies && (
                        <QuickReplyPopover
                          templates={quickReplies}
                          filter={quickReplyFilter}
                          onSelect={selectQuickReply}
                          onClose={() => setShowQuickReplies(false)}
                        />
                      )}
                      <Input
                        placeholder="Digite / para respostas rápidas..."
                        value={newMsg}
                        onChange={handleMsgChange}
                        onKeyDown={(e) => {
                          if (e.key === "Escape" && showQuickReplies) {
                            setShowQuickReplies(false);
                            return;
                          }
                          if (e.key === "Enter" && !showQuickReplies) {
                            attachedFile ? handleFileSend() : sendMessage();
                          }
                        }}
                        onBlur={() => setTimeout(() => setShowQuickReplies(false), 150)}
                        className="w-full bg-white/[0.04] border-white/[0.08] focus-visible:ring-violet-400/40 h-11"
                        disabled={sending || uploadingFile}
                      />
                    </div>
                    <Button
                      onClick={attachedFile ? handleFileSend : sendMessage}
                      size="icon"
                      className="bg-violet-600 hover:bg-violet-700 shrink-0 h-11 w-11"
                      disabled={sending || uploadingFile || (!newMsg.trim() && !attachedFile)}
                    >
                      {uploadingFile ? (
                        <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                )}
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
              <div className="h-20 w-20 rounded-full bg-violet-500/10 ring-1 ring-violet-400/20 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-10 w-10 text-violet-400/40" />
              </div>
              <p className="text-base font-semibold text-foreground/70">Selecione um atendimento</p>
              <p className="text-sm text-muted-foreground/60 mt-1 max-w-[260px] text-center leading-relaxed">
                Escolha uma conversa na lista lateral para iniciar o atendimento
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground/40">
                <Circle className="h-2 w-2 fill-current" />
                Canal: {canal === "resolva_ja" ? "Resolva Já" : "Martins Pontes"}
              </div>
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

      {/* ── Sheet: Transferir RJ → MP ── */}
      <Sheet open={transferOpen} onOpenChange={setTransferOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-w-2xl mx-auto max-h-[88vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-cyan-400" /> Transferir para Martins Pontes
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome do atendente</label>
              <Input
                value={atendenteName}
                onChange={(e) => setAtendenteName(e.target.value)}
                placeholder="Ex: Tiago Beckman"
                className="text-base"
              />
            </div>
            {transferMsgs.map((msg, i) => (
              <div key={i} className="border border-white/[0.08] rounded-xl p-3 space-y-2 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={msg.enabled}
                    onChange={(e) => setTransferMsgs((prev) => prev.map((m, j) => j === i ? { ...m, enabled: e.target.checked } : m))}
                    className="accent-cyan-400 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">
                    {["Apresentação", "Instagram do escritório", "Documentos necessários"][i]}
                  </span>
                </div>
                <textarea
                  value={msg.text}
                  onChange={(e) => setTransferMsgs((prev) => prev.map((m, j) => j === i ? { ...m, text: e.target.value } : m))}
                  rows={4}
                  disabled={!msg.enabled}
                  className="w-full resize-none rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-400/40 disabled:opacity-40"
                />
              </div>
            ))}
            <Button
              onClick={transferToMP}
              disabled={transferring || transferMsgs.filter((m) => m.enabled).length === 0}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {transferring ? "Enviando..." : `Transferir e Enviar ${transferMsgs.filter((m) => m.enabled).length} mensagem(ns)`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Novo Contato MP ── */}
      <Sheet open={newContactOpen} onOpenChange={setNewContactOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-w-lg mx-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-cyan-400" /> Novo Contato — Martins Pontes
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Número do WhatsApp</label>
              <Input
                placeholder="(92) 9 1234-5678"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                className="text-base"
                inputMode="tel"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Primeira mensagem</label>
              <textarea
                value={newContactMsg}
                onChange={(e) => setNewContactMsg(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
              />
            </div>
            <Button
              onClick={createMPContact}
              disabled={creatingContact}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {creatingContact ? "Enviando..." : "Criar Contato e Enviar Mensagem"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Settings: respostas rápidas ── */}
      <AtendimentoSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onTemplatesChange={setQuickReplies}
      />
    </div>
  );
}
