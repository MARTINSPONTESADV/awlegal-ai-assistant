import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SpotlightCard } from "@/components/SpotlightCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDownUp, AlertTriangle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProcessoDiligencia {
  id: string;
  numero_cnj: string | null;
  numero_processo: string | null;
  cliente_nome: string;
  data_ultima_movimentacao: string | null;
  fase: string | null;
  comarca: string | null;
  dias_sem_movimentacao: number;
}

function getTrafficLight(dias: number): { color: string; label: string; badgeClass: string } {
  if (dias > 60) return { color: "hsl(0, 72%, 51%)", label: "Crítico", badgeClass: "bg-[hsl(0,72%,51%)]/15 text-[hsl(0,72%,51%)] border-[hsl(0,72%,51%)]/30" };
  if (dias >= 30) return { color: "hsl(45, 93%, 47%)", label: "Atenção", badgeClass: "bg-[hsl(45,93%,47%)]/15 text-[hsl(45,93%,47%)] border-[hsl(45,93%,47%)]/30" };
  return { color: "hsl(142, 71%, 45%)", label: "Normal", badgeClass: "bg-[hsl(142,71%,45%)]/15 text-[hsl(142,71%,45%)] border-[hsl(142,71%,45%)]/30" };
}

export default function Diligencias() {
  useEffect(() => { document.title = "Diligências — AW LEGALTECH"; }, []);
  const [processos, setProcessos] = useState<ProcessoDiligencia[]>([]);
  const [sortDesc, setSortDesc] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("processos")
        .select("id, numero_cnj, numero_processo, data_ultima_movimentacao, fase, comarca, situacao, cliente_id, clientes(nome_completo)")
        .eq("situacao", "Ativo");

      if (data) {
        const now = Date.now();
        const mapped: ProcessoDiligencia[] = data.map((p: any) => {
          const lastDate = p.data_ultima_movimentacao ? new Date(p.data_ultima_movimentacao).getTime() : new Date(p.created_at || Date.now()).getTime();
          const dias = Math.floor((now - lastDate) / 86400000);
          return {
            id: p.id, numero_cnj: p.numero_cnj, numero_processo: p.numero_processo,
            cliente_nome: p.clientes?.nome_completo || "—",
            data_ultima_movimentacao: p.data_ultima_movimentacao,
            fase: p.fase, comarca: p.comarca,
            dias_sem_movimentacao: dias < 0 ? 0 : dias,
          };
        });
        setProcessos(mapped);
      }
    };
    load();
  }, []);

  const sorted = [...processos].sort((a, b) => sortDesc ? b.dias_sem_movimentacao - a.dias_sem_movimentacao : a.dias_sem_movimentacao - b.dias_sem_movimentacao);
  const criticos = processos.filter(p => p.dias_sem_movimentacao > 60).length;
  const atencao = processos.filter(p => p.dias_sem_movimentacao >= 30 && p.dias_sem_movimentacao <= 60).length;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-3xl font-bold">Diligências</h2>
          <p className="text-sm text-muted-foreground mt-1">Controle de estagnação dos processos ativos</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSortDesc(!sortDesc)} className="gap-2">
          <ArrowDownUp className="h-4 w-4" />
          {sortDesc ? "Mais estagnados primeiro" : "Menos estagnados primeiro"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <SpotlightCard>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[hsl(0,72%,51%)]/15 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-[hsl(0,72%,51%)]" />
            </div>
            <div><p className="text-2xl font-bold">{criticos}</p><p className="text-xs text-muted-foreground">Críticos (&gt;60 dias)</p></div>
          </div>
        </SpotlightCard>
        <SpotlightCard>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[hsl(45,93%,47%)]/15 flex items-center justify-center">
              <Clock className="h-5 w-5 text-[hsl(45,93%,47%)]" />
            </div>
            <div><p className="text-2xl font-bold">{atencao}</p><p className="text-xs text-muted-foreground">Atenção (30-60 dias)</p></div>
          </div>
        </SpotlightCard>
        <SpotlightCard>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[hsl(142,71%,45%)]/15 flex items-center justify-center">
              <Clock className="h-5 w-5 text-[hsl(142,71%,45%)]" />
            </div>
            <div><p className="text-2xl font-bold">{processos.length - criticos - atencao}</p><p className="text-xs text-muted-foreground">Normal (&lt;30 dias)</p></div>
          </div>
        </SpotlightCard>
      </div>

      <div className="space-y-3">
        {sorted.length === 0 && (<p className="text-center text-muted-foreground py-12">Nenhum processo ativo encontrado</p>)}
        {sorted.map((p) => {
          const tl = getTrafficLight(p.dias_sem_movimentacao);
          return (
            <SpotlightCard key={p.id} onClick={() => navigate(`/processos/${p.id}`)} className="!p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-3 w-3 rounded-full shrink-0 shadow-[0_0_8px_currentColor]" style={{ backgroundColor: tl.color, color: tl.color }} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{p.numero_cnj || p.numero_processo || "Sem número"}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.cliente_nome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {p.fase && <span className="text-xs text-muted-foreground hidden sm:inline">{p.fase}</span>}
                  {p.comarca && <span className="text-xs text-muted-foreground hidden md:inline">{p.comarca}</span>}
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: tl.color }}>{p.dias_sem_movimentacao}d</p>
                    <p className="text-[10px] text-muted-foreground">sem mov.</p>
                  </div>
                  <Badge className={tl.badgeClass}>{tl.label}</Badge>
                </div>
              </div>
            </SpotlightCard>
          );
        })}
      </div>
    </>
  );
}
