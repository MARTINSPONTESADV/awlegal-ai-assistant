import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, History, BarChart2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatInTimeZone } from "date-fns-tz";

const TZ = "America/Manaus";
const FUNIL_STAGES = ["Triagem", "Qualificado", "Documentação", "Assinatura", "Fechado"];

const STAGE_CONFIG: Record<string, { dot: string; bar: string; text: string; ring: string; bg: string }> = {
  "Triagem":      { dot: "bg-slate-400",   bar: "bg-slate-400",   text: "text-slate-400",   ring: "ring-slate-400/30",   bg: "bg-slate-500/10"   },
  "Qualificado":  { dot: "bg-amber-400",   bar: "bg-amber-400",   text: "text-amber-400",   ring: "ring-amber-400/30",   bg: "bg-amber-500/10"   },
  "Documentação": { dot: "bg-cyan-400",    bar: "bg-cyan-400",    text: "text-cyan-400",    ring: "ring-cyan-400/30",    bg: "bg-cyan-500/10"    },
  "Assinatura":   { dot: "bg-violet-400",  bar: "bg-violet-400",  text: "text-violet-400",  ring: "ring-violet-400/30",  bg: "bg-violet-500/10"  },
  "Fechado":      { dot: "bg-emerald-400", bar: "bg-emerald-400", text: "text-emerald-400", ring: "ring-emerald-400/30", bg: "bg-emerald-500/10" },
};

interface FunilHistory {
  whatsapp_id: string;
  status_novo: string;
  status_anterior: string | null;
  changed_at: string;
}

interface Lead {
  numero: string;
  nome_contato: string | null;
  status_funil: string;
  modulo_origem: string | null;
  canal: string | null;
}

function daysSinceBadge(dateStr: string | undefined) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return { text: "Novo",         color: "bg-emerald-500/20 text-emerald-400 border-emerald-400/30", icon: "☀️" };
  if (diff === 1) return { text: "1 dia",        color: "bg-emerald-500/20 text-emerald-400 border-emerald-400/30", icon: "🌤️" };
  if (diff <= 3)  return { text: `${diff} dias`, color: "bg-amber-500/20 text-amber-400 border-amber-400/30",       icon: "⏳" };
  return               { text: `${diff} dias`, color: "bg-rose-500/20 text-rose-400 border-rose-400/30",           icon: "⚠️" };
}

function formatDT(d: string) {
  try { return formatInTimeZone(new Date(d), TZ, "dd/MM 'às' HH:mm"); } catch { return d; }
}

function formatPhone(id: string) {
  const digits = id.replace(/\D/g, "");
  if (digits.length >= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  return id;
}

function calcStageMetrics(history: FunilHistory[]): Record<string, number | null> {
  const byLead: Record<string, FunilHistory[]> = {};
  history.forEach((h) => {
    if (!byLead[h.whatsapp_id]) byLead[h.whatsapp_id] = [];
    byLead[h.whatsapp_id].push(h);
  });

  const durationsPerStage: Record<string, number[]> = {};
  Object.values(byLead).forEach((transitions) => {
    const sorted = [...transitions].sort(
      (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    );
    for (let i = 1; i < sorted.length; i++) {
      const days = (new Date(sorted[i].changed_at).getTime() - new Date(sorted[i - 1].changed_at).getTime()) / 86400000;
      const stage = sorted[i - 1].status_novo;
      if (!durationsPerStage[stage]) durationsPerStage[stage] = [];
      durationsPerStage[stage].push(days);
    }
  });

  const result: Record<string, number | null> = {};
  FUNIL_STAGES.forEach((stage) => {
    const arr = durationsPerStage[stage];
    result[stage] = arr?.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  });
  return result;
}

export default function CRM() {
  useEffect(() => { document.title = "Funil de Vendas — AW ECO"; }, []);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [historyDocs, setHistoryDocs] = useState<FunilHistory[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<string>(FUNIL_STAGES[0]);
  const [showMetrics, setShowMetrics] = useState(false);

  const loadLeads = useCallback(async () => {
    const [{ data: bots }, { data: atend }, { data: funil }] = await Promise.all([
      supabase.from("controle_bot").select("whatsapp_numero, nome_contato, canal"),
      supabase.from("controle_atendimento").select("whatsapp_id, status_funil, modulo_origem"),
      (supabase as any).from("historico_funil").select("whatsapp_id, status_anterior, status_novo, changed_at")
        .order("changed_at", { ascending: false }).limit(2000),
    ]);
    if (!bots) return;
    if (funil) setHistoryDocs(funil);

    const atendMap: Record<string, { status_funil: string | null; modulo_origem: string | null }> = {};
    (atend || []).forEach((a: any) => { atendMap[a.whatsapp_id] = a; });

    setLeads((bots as any[]).map((b) => ({
      numero: b.whatsapp_numero,
      nome_contato: b.nome_contato || "Desconhecido",
      status_funil: atendMap[b.whatsapp_numero]?.status_funil || "Triagem",
      modulo_origem: atendMap[b.whatsapp_numero]?.modulo_origem || null,
      canal: b.canal || null,
    })));
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const moveStage = async (numero: string, newStage: string) => {
    setMovingId(numero);
    const anterior = leads.find((l) => l.numero === numero)?.status_funil || null;
    await supabase
      .from("controle_atendimento")
      .upsert({ whatsapp_id: numero, status_funil: newStage }, { onConflict: "whatsapp_id" });

    const newEntry: FunilHistory = { whatsapp_id: numero, status_anterior: anterior, status_novo: newStage, changed_at: new Date().toISOString() };
    (supabase as any).from("historico_funil").insert(newEntry).then(() => {});

    setLeads((prev) => prev.map((l) => l.numero === numero ? { ...l, status_funil: newStage } : l));
    setHistoryDocs((prev) => [newEntry, ...prev]);
    setMovingId(null);
    setActiveStage(newStage);
  };

  const stageMetrics = useMemo(() => calcStageMetrics(historyDocs), [historyDocs]);
  const maxCount = useMemo(
    () => Math.max(...FUNIL_STAGES.map((s) => leads.filter((l) => l.status_funil === s).length), 1),
    [leads]
  );
  const stageLeads = leads.filter((l) => l.status_funil === activeStage);

  // ── Painel de Métricas ──────────────────────────────────────────────────────
  const MetricsPanel = (
    <div className="bg-black/20 border border-white/[0.05] rounded-xl p-4 space-y-3">
      <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <BarChart2 className="h-3.5 w-3.5" />
        Métricas do Funil
      </h2>

      <div className="space-y-3.5">
        {FUNIL_STAGES.map((stage) => {
          const count = leads.filter((l) => l.status_funil === stage).length;
          const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
          const avgDays = stageMetrics[stage];
          const cfg = STAGE_CONFIG[stage];
          return (
            <div key={stage} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
                  <span className="text-slate-300 font-medium">{stage}</span>
                </span>
                <span className="flex items-center gap-2 text-[10px] tabular-nums">
                  <span className="font-bold text-foreground">{count}</span>
                  <span className={cn(
                    "px-1 py-px rounded text-[9px] font-medium",
                    avgDays != null ? `${cfg.bg} ${cfg.text}` : "text-muted-foreground/40"
                  )}>
                    {avgDays != null ? `${avgDays.toFixed(1)}d` : "—"}
                  </span>
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", cfg.bar)}
                  style={{ width: `${pct}%`, opacity: count > 0 ? 0.65 : 0.12 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/[0.05] pt-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Total de leads</span>
          <span className="font-bold tabular-nums">{leads.length}</span>
        </div>
        {(() => {
          const allAvgs = FUNIL_STAGES.map((s) => stageMetrics[s]).filter((v): v is number => v != null);
          const globalAvg = allAvgs.length ? allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length : null;
          return globalAvg != null ? (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Tempo médio/etapa</span>
              <span className="font-bold tabular-nums text-violet-400">{globalAvg.toFixed(1)}d</span>
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    /* overflow-x-hidden bloqueia qualquer vazamento horizontal; w-full preenche o parent */
    <div className="w-full overflow-x-hidden">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <div className="h-7 w-7 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 text-violet-400" />
          </div>
          Funil Comercial
        </h1>
        {/* Toggle métricas — mobile only */}
        <button
          onClick={() => setShowMetrics((v) => !v)}
          className={cn(
            "md:hidden flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-200",
            showMetrics
              ? "bg-violet-500/20 border-violet-400/40 text-violet-300"
              : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
          )}
        >
          <BarChart2 className="h-3.5 w-3.5" />
          Métricas
        </button>
      </div>

      {/* ── PILL TABS ── (apenas esta barra rola horizontalmente) */}
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mb-4">
        {FUNIL_STAGES.map((stage) => {
          const count = leads.filter((l) => l.status_funil === stage).length;
          const isActive = stage === activeStage;
          const cfg = STAGE_CONFIG[stage];
          return (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 border",
                isActive
                  ? `${cfg.bg} ${cfg.text} border-current/30 ring-1 ${cfg.ring}`
                  : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:text-slate-300 hover:bg-white/[0.06]"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full shrink-0", isActive ? cfg.dot : "bg-white/20")} />
              {stage}
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                isActive ? "bg-white/20" : "bg-white/5"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── GRID: leads | métricas ──
           grid-cols-[1fr_224px]: 1fr nunca excede o espaço disponível → sem overflow
           items-start: colunas não esticam para preencher altura
      */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_224px] gap-4 items-start">

        {/* COLUNA DE LEADS — fluxo normal de documento, sem ScrollArea */}
        <div className="space-y-3 min-w-0">
          {stageLeads.map((lead) => {
            const leadHistory = historyDocs.filter((h) => h.whatsapp_id === lead.numero);
            const currentEntry = leadHistory.find((h) => h.status_novo === lead.status_funil);
            const timeBadge = daysSinceBadge(currentEntry?.changed_at);
            const isExpanded = expandedCard === lead.numero;
            const cfg = STAGE_CONFIG[lead.status_funil] || STAGE_CONFIG["Triagem"];
            const inicial = ((lead.nome_contato || "?").trim()[0] || "?").toUpperCase();

            return (
              <div
                key={lead.numero}
                className="bg-card border border-border/40 rounded-xl p-3 hover:border-white/15 transition-all duration-200 w-full"
              >
                {/* Linha 1: Avatar + Nome + Badge tempo */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ring-1",
                      cfg.bg, cfg.text, cfg.ring
                    )}>
                      {inicial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground leading-tight">
                        {lead.nome_contato}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {formatPhone(lead.numero)}
                      </p>
                    </div>
                  </div>

                  {timeBadge && (
                    <Badge
                      variant="outline"
                      className={cn("text-[9px] px-1.5 h-5 shrink-0 whitespace-nowrap gap-0.5 font-semibold", timeBadge.color)}
                    >
                      {timeBadge.icon} {timeBadge.text}
                    </Badge>
                  )}
                </div>

                {/* Linha 2: Canal + Histórico + Select */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] px-1.5 h-[18px] font-bold",
                        lead.canal === "martins_pontes"
                          ? "bg-cyan-500/10 border-cyan-400/30 text-cyan-300"
                          : "bg-violet-500/10 border-violet-400/30 text-violet-300"
                      )}
                    >
                      {lead.canal === "martins_pontes" ? "MP" : "RJ"}
                    </Badge>

                    <button
                      onClick={() => setExpandedCard(isExpanded ? null : lead.numero)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <History className="h-3 w-3" />
                      <span>Histórico</span>
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>

                  <Select
                    value={lead.status_funil}
                    onValueChange={(v) => moveStage(lead.numero, v)}
                    disabled={movingId === lead.numero}
                  >
                    <SelectTrigger className="h-[22px] w-[110px] text-[10px] px-2 bg-black/20 border-white/5 focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FUNIL_STAGES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Timeline expandível */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border/50 text-[10px]">
                    {leadHistory.length > 0 ? (
                      <>
                        <p className="font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                          <History className="h-3 w-3" /> Linha do Tempo
                        </p>
                        <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-[5px] before:w-[1px] before:bg-white/10 pl-1">
                          {leadHistory.map((h, i) => (
                            <div key={i} className="relative pl-5">
                              <div className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full bg-violet-500 ring-2 ring-background z-10" />
                              <p className="font-medium text-slate-300">{h.status_novo}</p>
                              <p className="text-muted-foreground/80">{formatDT(h.changed_at)}</p>
                              {h.status_anterior && (
                                <p className="text-[9px] text-muted-foreground opacity-60">
                                  Movido de: {h.status_anterior}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-center text-muted-foreground/60">Sem histórico registrado</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {stageLeads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-white/5 rounded-xl">
              <p className="text-sm font-semibold text-muted-foreground">Vazio</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Nenhum lead em {activeStage}</p>
            </div>
          )}
        </div>

        {/* PAINEL MÉTRICAS
            Desktop: sempre visível, sticky ao rolar
            Mobile: toggle via botão no header
        */}
        <div className={cn(
          "md:sticky md:top-4",
          showMetrics ? "block" : "hidden md:block"
        )}>
          {MetricsPanel}
        </div>
      </div>
    </div>
  );
}
