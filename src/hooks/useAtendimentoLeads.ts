import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Helpers locais (cópia das funções de Atendimento.tsx; podem ser extraídas
//    para `src/lib/whatsapp.ts` futuramente se houver mais reuso) ──
function phoneKey(num: string): string {
  return num.replace(/\D/g, "").slice(-8);
}

function normalizeWaId(id: string): string {
  if (!id) return id;
  return id.replace(/@[^@]+$/i, "");
}

export type AtendimentoLead = {
  whatsapp_numero: string;
  canal: string | null;
  bot_ativo: boolean | null;
  arquivado: boolean;
  nome_contato?: string | null;
  nome?: string | null;
  status_funil?: string;
  unread_count?: number;
  foto_perfil_url?: string | null;
  foto_perfil_atualizada_em?: string | null;
  historico_mensagens: Array<{
    whatsapp_id?: string;
    conteudo?: string | null;
    tipo_midia?: string | null;
    created_at?: string | null;
    canal?: string | null;
  }>;
  arquivado_mp?: boolean;
  [k: string]: unknown;
};

async function fetchAtendimentoLeads(): Promise<AtendimentoLead[]> {
  // Fase 1 — queries paralelas independentes.
  // IMPORTANTE: usamos a view `historico_mensagens_preview` em vez da tabela
  // direta porque o campo `conteudo` contém data URIs base64 pra audio/image/
  // document (até 20MB/row). A view trunca conteudo em 200 chars e retorna
  // NULL pra mídia — reduz payload de dezenas de MB pra centenas de KB.
  const [controleBotRes, mpRawRes, rjRawRes, stagesRes] = await Promise.all([
    (supabase as any).from("controle_bot").select("*"),
    (supabase as any)
      .from("historico_mensagens_preview")
      .select("whatsapp_id, conteudo, tipo_midia, created_at")
      .eq("canal", "martins_pontes")
      .order("created_at", { ascending: false })
      .limit(500),
    (supabase as any)
      .from("historico_mensagens_preview")
      .select("whatsapp_id, conteudo, tipo_midia, created_at")
      .eq("canal", "resolva_ja")
      .order("created_at", { ascending: false })
      .limit(500),
    (supabase as any).from("controle_atendimento").select("whatsapp_id, status_funil"),
  ]);

  if (controleBotRes.error) throw controleBotRes.error;

  const allBot = controleBotRes.data || [];
  const data = allBot.filter((l: any) => !l.excluido);
  const excludedKeys = new Set(
    allBot
      .filter((l: any) => l.excluido)
      .map((l: any) => phoneKey(normalizeWaId(l.whatsapp_numero || "")))
  );

  if (data.length === 0) return [];

  // Fase 2 — preview batch (depende da lista de telefones)
  const phoneNumbers = data.map((l: any) => normalizeWaId(l.whatsapp_numero)).filter(Boolean);
  const batchLimit = Math.min(phoneNumbers.length * 3, 600);
  const { data: previewMsgs } = phoneNumbers.length > 0
    ? await (supabase as any)
        .from("historico_mensagens_preview")
        .select("whatsapp_id, conteudo, created_at, tipo_midia, canal")
        .in("whatsapp_id", phoneNumbers)
        .order("created_at", { ascending: false })
        .limit(batchLimit)
    : { data: [] };

  const previewMap = new Map<string, any>();
  for (const msg of previewMsgs || []) {
    const pk = phoneKey(msg.whatsapp_id || "");
    const mc = msg.canal ?? "null";
    const key = `${pk}||${mc}`;
    if (!previewMap.has(key)) previewMap.set(key, msg);
  }

  const enriched = data.map((lead: any) => {
    const normalNum = normalizeWaId(lead.whatsapp_numero || "");
    const pk = phoneKey(normalNum);
    // Lead do controle_bot = canal RJ por padrão. Se vier null (legacy) ou
    // 'resolva_ja', prioriza msg RJ; mp só se explicitamente marcado.
    // Fallback 'null' só se não houver nada tagueado (compat com histórico antigo).
    const isMP = lead.canal === "martins_pontes";
    const preview = isMP
      ? previewMap.get(`${pk}||martins_pontes`) ?? previewMap.get(`${pk}||null`) ?? null
      : previewMap.get(`${pk}||resolva_ja`) ?? previewMap.get(`${pk}||null`) ?? null;
    return { ...lead, whatsapp_numero: normalNum, historico_mensagens: preview ? [preview] : [] };
  });

  // MP leads derivados do histórico
  const mpMap = new Map<string, any>();
  for (const msg of mpRawRes.data || []) {
    if (!msg.whatsapp_id) continue;
    const norm = normalizeWaId(msg.whatsapp_id);
    const pk = phoneKey(norm);
    if (mpMap.has(pk)) continue;
    mpMap.set(pk, { ...msg, whatsapp_id: norm });
  }
  const mpLeads = Array.from(mpMap.entries())
    .filter(([pk]) => !excludedKeys.has(pk))
    .map(([pk, lastMsg]) => {
      const cb = enriched.find((l: any) => phoneKey(l.whatsapp_numero) === pk);
      return {
        ...(cb || {}),
        whatsapp_numero: lastMsg.whatsapp_id,
        canal: "martins_pontes",
        bot_ativo: cb?.bot_ativo ?? false,
        arquivado: cb?.arquivado_mp ?? false,
        historico_mensagens: [lastMsg],
      };
    });

  // RJ leads derivados do histórico
  const rjMap = new Map<string, any>();
  for (const msg of rjRawRes.data || []) {
    if (!msg.whatsapp_id) continue;
    const norm = normalizeWaId(msg.whatsapp_id);
    const pk = phoneKey(norm);
    if (rjMap.has(pk)) continue;
    rjMap.set(pk, { ...msg, whatsapp_id: norm });
  }
  const rjLeads = Array.from(rjMap.entries())
    .filter(([pk]) => !excludedKeys.has(pk))
    .map(([pk, lastMsg]) => {
      const cb = enriched.find((l: any) => phoneKey(l.whatsapp_numero) === pk);
      return {
        ...(cb || {}),
        whatsapp_numero: lastMsg.whatsapp_id,
        canal: "resolva_ja",
        bot_ativo: cb?.bot_ativo ?? false,
        arquivado: cb?.arquivado ?? false,
        historico_mensagens: [lastMsg],
      };
    });

  // Merge por phoneKey + canal normalizado
  const mergeMap = new Map<string, any>();
  for (const lead of [...enriched, ...mpLeads, ...rjLeads]) {
    const pk = phoneKey(lead.whatsapp_numero || "");
    if (!pk) continue;
    const nc = !lead.canal || lead.canal === "resolva_ja" ? "rj" : lead.canal;
    const key = `${pk}||${nc}`;
    if (!mergeMap.has(key)) {
      mergeMap.set(key, lead);
    } else {
      const prev = mergeMap.get(key)!;
      const hasNewMsgs = lead.historico_mensagens?.length && !prev.historico_mensagens?.length;
      mergeMap.set(key, {
        ...prev,
        whatsapp_numero: hasNewMsgs ? lead.whatsapp_numero : prev.whatsapp_numero,
        nome_contato: prev.nome_contato || lead.nome_contato,
        nome: prev.nome || lead.nome,
        bot_ativo: prev.bot_ativo ?? lead.bot_ativo,
        foto_perfil_url: prev.foto_perfil_url ?? lead.foto_perfil_url,
        historico_mensagens: hasNewMsgs ? lead.historico_mensagens : prev.historico_mensagens,
      });
    }
  }

  const combined = Array.from(mergeMap.values());
  const stagesMap: Record<string, string> = {};
  (stagesRes.data || []).forEach((s: any) => {
    if (s.whatsapp_id) stagesMap[s.whatsapp_id] = s.status_funil;
  });

  return combined.map((lead: any) => ({
    ...lead,
    status_funil: stagesMap[lead.whatsapp_numero] || "Triagem",
  })) as AtendimentoLead[];
}

export function useAtendimentoLeads(): UseQueryResult<AtendimentoLead[], Error> {
  return useQuery({
    queryKey: ["atendimento", "leads"],
    queryFn: fetchAtendimentoLeads,
    staleTime: 30_000,
    gcTime: 24 * 60 * 60 * 1000, // 24h em memória + persist
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
