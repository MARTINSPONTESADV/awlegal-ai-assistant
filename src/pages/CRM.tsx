import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, ArrowRight } from "lucide-react";

const FUNIL_STAGES = ["Triagem", "Qualificação", "Proposta", "Fechamento"];

interface Lead {
  whatsapp_id: string;
  status_funil: string | null;
  bot_ativo: boolean | null;
  modulo_origem: string | null;
}

export default function CRM() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    supabase.from("controle_atendimento").select("*").then(({ data }) => {
      if (data) setLeads(data);
    });
  }, []);

  const formatPhone = (id: string) => {
    if (id.length >= 11) return `(${id.slice(0, 2)}) ${id.slice(2, 7)}-${id.slice(7)}`;
    return id;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-foreground">📈 Funil Comercial</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {FUNIL_STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => (l.status_funil || "Triagem") === stage);
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
                    {stageLeads.map((lead) => (
                      <Card key={lead.whatsapp_id} className="bg-background/50 border-border/50 p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                            <Phone className="h-3.5 w-3.5 text-purple-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{formatPhone(lead.whatsapp_id)}</p>
                            <p className="text-[10px] text-muted-foreground">{lead.modulo_origem || "Resolva Já"}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
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
