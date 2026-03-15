import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

type Canal = "resolva_ja" | "martins_pontes";

function formatPhone(id: string): string {
  if (!id) return "Desconhecido";
  if (id.length === 13) return `+${id.slice(0, 2)} (${id.slice(2, 4)}) ${id.slice(4, 5)} ${id.slice(5, 9)}-${id.slice(9)}`;
  if (id.length === 11) return `(${id.slice(0, 2)}) ${id.slice(2, 3)} ${id.slice(3, 7)}-${id.slice(7)}`;
  if (id.length === 10) return `(${id.slice(0, 2)}) ${id.slice(2, 6)}-${id.slice(6)}`;
  return id;
}

export function useChats(canal: Canal, searchTerm: string, selectedChat: string | null) {
  const [rawLeads, setRawLeads] = useState<any[]>([]);

  // Carrega todos os contatos e enriquece com última mensagem
  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.from("controle_bot").select("*");
        if (error) {
          console.error("[useChats] Erro ao carregar controle_bot:", error);
          setRawLeads([]);
          return;
        }
        if (!data || data.length === 0) {
          setRawLeads([]);
          return;
        }

        const enriched = await Promise.all(
          data.map(async (lead: any) => {
            try {
              const { data: msgs } = await supabase
                .from("historico_mensagens")
                .select("conteudo, created_at, tipo_midia")
                .eq("whatsapp_id", lead.whatsapp_numero)
                .order("created_at", { ascending: false })
                .limit(1);
              return { ...lead, historico_mensagens: msgs || [] };
            } catch {
              return { ...lead, historico_mensagens: [] };
            }
          })
        );
        setRawLeads(enriched);
      } catch (err) {
        console.error("[useChats] Exceção fatal:", err);
        setRawLeads([]);
      }
    }
    load();
  }, []);

  // Realtime: nova mensagem atualiza lastMessage e unread_count
  useEffect(() => {
    const globalChannel = supabase
      .channel("todas-mensagens-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "historico_mensagens",
      }, (payload) => {
        const nova = payload.new as any;
        const remetente = nova.whatsapp_id;
        if (!remetente) return;

        setRawLeads((prev) =>
          prev.map((c: any) => {
            if (c.whatsapp_numero !== remetente) return c;
            const isIncoming = nova.direcao === "entrada" || nova.origem === "cliente";
            return {
              ...c,
              historico_mensagens: [{ conteudo: nova.conteudo, tipo_midia: nova.tipo_midia, created_at: nova.created_at }],
              unread_count: (isIncoming && selectedChat !== remetente)
                ? (c.unread_count || 0) + 1
                : c.unread_count,
            };
          })
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(globalChannel); };
  }, [selectedChat]);

  // Realtime: atualizações de perfil (nome, bot, arquivado, canal)
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
            return {
              ...c,
              nome: atualizado.nome || atualizado.nome_contato || c.nome,
              nome_contato: atualizado.nome_contato || atualizado.nome || c.nome_contato,
              arquivado: atualizado.arquivado ?? c.arquivado,
              bot_ativo: atualizado.bot_ativo ?? c.bot_ativo,
              canal: atualizado.canal ?? c.canal,
            };
          })
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(controleChannel); };
  }, []);

  // Computed: transforma rawLeads em formato display
  const conversasComputadas = useMemo(() => {
    if (!rawLeads || !Array.isArray(rawLeads)) return [];
    return rawLeads.map((lead: any) => {
      const mensagem = lead.historico_mensagens?.[0]?.conteudo || "Iniciou conversa";
      const tipo = lead.historico_mensagens?.[0]?.tipo_midia || "texto";
      const lastTime = lead.historico_mensagens?.[0]?.created_at || undefined;
      const nomeExibicao = lead.nome || lead.nome_contato || formatPhone(lead.whatsapp_numero || "") || "Desconhecido";

      const ultimaMensagem = tipo === "audio"
        ? "🎵 Áudio"
        : tipo === "image"
          ? "📷 Imagem"
          : tipo === "document"
            ? "📄 Documento"
            : (mensagem && mensagem.length > 35 ? mensagem.substring(0, 35) + "..." : mensagem);

      return {
        ...lead,
        nomeExibicao,
        ultimaMensagem,
        tipoMidia: tipo,
        lastTime,
        whatsapp_numero: lead.whatsapp_numero || "",
        bot_ativo: lead.bot_ativo ?? null,
        arquivado: lead.arquivado || false,
        canal: lead.canal || "resolva_ja",
        unread_count: lead.unread_count || 0,
      };
    });
  }, [rawLeads]);

  // Filtrado por canal, busca e ordenado por data
  const filteredChats = useMemo(() => {
    return conversasComputadas
      .filter((c: any) => {
        const matchSearch =
          (c.whatsapp_numero || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.nomeExibicao || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchCanal = canal === "resolva_ja"
          ? !c.canal || c.canal === "resolva_ja"
          : c.canal === "martins_pontes";
        return matchSearch && matchCanal;
      })
      .sort((a: any, b: any) => {
        const timeA = a.lastTime ? new Date(a.lastTime).getTime() : 0;
        const timeB = b.lastTime ? new Date(b.lastTime).getTime() : 0;
        return timeB - timeA;
      });
  }, [conversasComputadas, searchTerm, canal]);

  const updateLead = (numero: string, patch: Partial<any>) => {
    setRawLeads((prev) =>
      prev.map((c: any) => c.whatsapp_numero === numero ? { ...c, ...patch } : c)
    );
  };

  return { rawLeads, conversasComputadas, filteredChats, updateLead };
}
