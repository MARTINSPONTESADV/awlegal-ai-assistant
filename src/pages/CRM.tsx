import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const FUNIL_STAGES = ["Triagem", "Qualificado", "Assinatura", "Fechado"];

interface Lead {
  numero: string;
  nome_contato: string | null;
  status_funil: string;
  modulo_origem: string | null;
  canal: string | null;
}

// Retorna "X dias" ou "hoje" desde uma data
function daysSince(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return "hoje";
  if (diff === 1) return "1 dia";
  return `${diff} dias`;
}

export default function CRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [funilMap, setFunilMap] = useState<Record<string, { status_novo: string; changed_at: string }>>({});

  const loadLeads = useCallback(async () => {
    const [{ data: bots }, { data: atend }, { data: funil }] = await Promise.all([
      supabase.from("controle_bot").select("whatsapp_numero, nome_contato, canal"),
      supabase.from("controle_atendimento").select("whatsapp_id, status_funil, modulo_origem"),
      (supabase as any).from("historico_funil").select("whatsapp_id, status_novo, changed_at")
        .order("changed_at", { ascending: false }).limit(1000),
    ]);
    if (!bots) return;

    const atendMap: Record<string, { status_funil: string | null; modulo_origem: string | null }> = {};
    (atend || []).forEach((a) => { atendMap[a.whatsapp_id] = a; });

    const merged: Lead[] = bots.map((b) => ({
      numero: b.whatsapp_numero,
      nome_contato: b.nome_contato,
      status_funil: atendMap[b.whatsapp_numero]?.status_funil || "Triagem",
      modulo_origem: atendMap[b.whatsapp_numero]?.modulo_origem || null,
      canal: b.canal || null,
    }));
    setLeads(merged);

    // Monta funilMap: para cada whatsapp_id, guarda o registro mais recente cujo
    // status_novo coincide com o stage atual do lead
    const fMap: Record<string, { status_novo: string; changed_at: string }> = {};
    for (const row of (funil || [])) {
      if (!fMap[row.whatsapp_id]) fMap[row.whatsapp_id] = row;
    }
    setFunilMap(fMap);
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
    (supabase as any)
      .from("historico_funil")
      .insert({ whatsapp_id: numero, status_anterior: anterior, status_novo: newStage })
      .then(() => {});
    const now = new Date().toISOString();
    setLeads(prev =>
      prev.map(l => l.numero === numero ? { ...l, status_funil: newStage } : l)
    );
    setFunilMap(prev => ({ ...prev, [numero]: { status_novo: newStage, changed_at: now } }));
    setMovingId(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-foreground">📈 Funil Comercial</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {FUNIL_STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.status_funil === stage);
          return (
            <Card key={stage} className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-purple-400">{stage}</CardTitle>
                  <Badge variant="secondary" className="text-xs">{stageLeads.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-2">
                    {stageLeads.map((lead) => {
                      const funilEntry = funilMap[lead.numero];
                      const timeStr = funilEntry && funilEntry.status_novo === lead.status_funil
                        ? daysSince(funilEntry.changed_at)
                        : null;
                      return (
                        <Card key={lead.numero} className="bg-background/50 border-border/50 p-3">
                          <div className="flex items-start gap-2">
                            <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                              <Phone className="h-3.5 w-3.5 text-purple-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {lead.nome_contato || formatPhone(lead.numero)}
                              </p>
                              {lead.nome_contato && (
                                <p className="text-[10px] text-muted-foreground">{formatPhone(lead.numero)}</p>
                              )}
                              <div className="flex items-center gap-1 mt-0.5">
                                <p className="text-[10px] text-muted-foreground">{lead.modulo_origem || "Resolva Já"}</p>
                                <Badge variant="outline" className={cn("text-[9px] px-1 py-0 h-4", lead.canal === "martins_pontes" ? "border-cyan-400/30 text-cyan-300" : "border-violet-400/30 text-violet-300")}>
                                  {lead.canal === "martins_pontes" ? "MP" : "RJ"}
                                </Badge>
                              </div>
                              {timeStr && (
                                <div className="flex items-center gap-0.5 mt-0.5">
                                  <Clock className="h-2.5 w-2.5 text-muted-foreground/50" />
                                  <span className="text-[9px] text-muted-foreground/60">{timeStr} em {lead.status_funil}</span>
                                </div>
                              )}
                              <Select
                                value={lead.status_funil}
                                onValueChange={(v) => moveStage(lead.numero, v)}
                                disabled={movingId === lead.numero}
                              >
                                <SelectTrigger className="h-6 text-[10px] mt-1.5 px-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FUNIL_STAGES.map(s => (
                                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                    {stageLeads.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">Nenhum lead</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
