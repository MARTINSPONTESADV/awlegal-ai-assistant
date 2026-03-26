import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Clock, ChevronDown, ChevronUp, History, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatInTimeZone } from "date-fns-tz";

const TZ = "America/Manaus";
const FUNIL_STAGES = ["Triagem", "Qualificado", "Documentação", "Assinatura", "Fechado"];

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

// Retorna badge visual de tempo
function daysSinceBadge(dateStr: string | undefined) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  
  if (diff === 0) return { text: "Novo", color: "bg-emerald-500/20 text-emerald-400 border-emerald-400/30", icon: "☀️" };
  if (diff === 1) return { text: "1 dia", color: "bg-emerald-500/20 text-emerald-400 border-emerald-400/30", icon: "🌤️" };
  if (diff <= 3) return { text: `${diff} dias`, color: "bg-amber-500/20 text-amber-400 border-amber-400/30", icon: "⏳" };
  return { text: `${diff} dias`, color: "bg-rose-500/20 text-rose-400 border-rose-400/30", icon: "⚠️" };
}

function formatDT(d: string) {
  try { return formatInTimeZone(new Date(d), TZ, "dd/MM 'às' HH:mm"); } catch { return d; }
}

export default function CRM() {
  useEffect(() => { document.title = "Funil de Vendas — AW LEGALTECH"; }, []);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [movingId, setMovingId] = useState<string | null>(null);
  
  // Guardamos todo o histórico de transições
  const [historyDocs, setHistoryDocs] = useState<FunilHistory[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

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
    (atend || []).forEach((a) => { atendMap[a.whatsapp_id] = a; });

    const merged: Lead[] = (bots as any[]).map((b) => ({
      numero: b.whatsapp_numero,
      nome_contato: b.nome_contato || "Desconhecido",
      status_funil: atendMap[b.whatsapp_numero]?.status_funil || "Triagem",
      modulo_origem: atendMap[b.whatsapp_numero]?.modulo_origem || null,
      canal: b.canal || null,
    }));
    setLeads(merged);
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const formatPhone = (id: string) => {
    const digits = id.replace(/\D/g, "");
    if (digits.length >= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    return id;
  };

  const moveStage = async (numero: string, newStage: string) => {
    setMovingId(numero);
    const anterior = leads.find(l => l.numero === numero)?.status_funil || null;
    await supabase
      .from("controle_atendimento")
      .upsert({ whatsapp_id: numero, status_funil: newStage }, { onConflict: "whatsapp_id" });
    
    // Registra no historico_funil
    const newEntry = { whatsapp_id: numero, status_anterior: anterior, status_novo: newStage, changed_at: new Date().toISOString() };
    (supabase as any).from("historico_funil").insert(newEntry).then(() => {});
    
    setLeads(prev => prev.map(l => l.numero === numero ? { ...l, status_funil: newStage } : l));
    setHistoryDocs(prev => [newEntry as any, ...prev]);
    setMovingId(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
          <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <span className="text-violet-400">📈</span>
          </div>
          Funil Comercial
        </h1>
      </div>

      <div className="flex-1 flex overflow-x-auto overflow-y-hidden gap-4 pb-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
        {FUNIL_STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.status_funil === stage);
          return (
            <div key={stage} className="w-[320px] min-w-[320px] shrink-0 flex flex-col h-full bg-black/20 border border-white/[0.05] rounded-xl overflow-hidden">
              <div className="p-3 bg-white/[0.02] border-b border-white/[0.05] flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                  <div className={cn("h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", 
                    stage === "Triagem" ? "bg-slate-400 shadow-slate-400/50" :
                    stage === "Qualificado" ? "bg-amber-400 shadow-amber-400/50" :
                    stage === "Documentação" ? "bg-cyan-400 shadow-cyan-400/50" :
                    stage === "Assinatura" ? "bg-violet-400 shadow-violet-400/50" :
                    "bg-emerald-400 shadow-emerald-400/50"
                  )} />
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{stage}</h3>
                </div>
                <Badge variant="secondary" className="bg-white/5 border-white/10 text-xs px-2 h-6">{stageLeads.length}</Badge>
              </div>

              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3 pb-8">
                  {stageLeads.map((lead) => {
                    // Histórico do lead atual
                    const leadHistory = historyDocs.filter(h => h.whatsapp_id === lead.numero);
                    
                    // Encontrar a entrada mais recente que movimenta PARA este estagio
                    const currentEntry = leadHistory.find(h => h.status_novo === lead.status_funil);
                    const timeBadge = daysSinceBadge(currentEntry?.changed_at);
                    const isExpanded = expandedCard === lead.numero;

                    return (
                      <Card key={lead.numero} className="bg-card border-border/40 shadow-sm hover:border-violet-500/30 transition-all duration-200">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                                <User className="h-4 w-4 text-violet-300" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold truncate text-foreground">{lead.nome_contato}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{formatPhone(lead.numero)}</p>
                              </div>
                            </div>
                            
                            {timeBadge && (
                              <Badge variant="outline" className={cn("text-[9px] px-1.5 h-5 shrink-0 whitespace-nowrap gap-1 font-semibold shadow-sm", timeBadge.color)}>
                                <span>{timeBadge.icon}</span> {timeBadge.text}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1.5">
                              <Badge variant="outline" className={cn("text-[9px] px-1.5 h-[18px]", lead.canal === "martins_pontes" ? "bg-cyan-500/10 border-cyan-400/30 text-cyan-300" : "bg-violet-500/10 border-violet-400/30 text-violet-300")}>
                                {lead.canal === "martins_pontes" ? "MP" : "RJ"}
                              </Badge>
                              <button 
                                onClick={() => setExpandedCard(isExpanded ? null : lead.numero)}
                                className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <History className="h-3 w-3" /> Histórico {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
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
                                {FUNIL_STAGES.map(s => (
                                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {isExpanded && leadHistory.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-border/50 text-[10px]">
                              <p className="font-semibold text-muted-foreground mb-2 flex items-center gap-1"><History className="h-3 w-3"/> Linha do Tempo</p>
                              <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-[5px] before:w-[1px] before:bg-white/10 pl-1">
                                {leadHistory.map((h, i) => (
                                  <div key={i} className="relative pl-5">
                                    <div className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full bg-violet-500 ring-2 ring-background z-10" />
                                    <p className="font-medium text-slate-300">{h.status_novo}</p>
                                    <p className="text-muted-foreground/80">{formatDT(h.changed_at)}</p>
                                    {h.status_anterior && (
                                      <p className="text-[9px] text-muted-foreground opacity-60">Movido de: {h.status_anterior}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {stageLeads.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-white/5 rounded-xl">
                      <p className="text-xs font-semibold text-muted-foreground">Vazio</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Nenhum lead nesta etapa</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}
