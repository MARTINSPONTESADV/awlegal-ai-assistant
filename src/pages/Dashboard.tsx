import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SpotlightCard } from "@/components/SpotlightCard";
import { DonutChart } from "@/components/DonutChart";
import { Users, Briefcase, CalendarDays, DollarSign, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fmtBRL, isProcessoEncerrado } from "@/lib/financeiro";

interface Stats {
  clientes: number;
  processosAtivos: number;
  prazosSemana: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ clientes: 0, processosAtivos: 0, prazosSemana: 0 });
  const [prognosticoData, setPrognosticoData] = useState<{ name: string; value: number }[]>([]);
  const [faseData, setFaseData] = useState<{ name: string; value: number }[]>([]);
  const [conversaoData, setConversaoData] = useState<{ name: string; value: number }[]>([]);
  const [tipoProcessoData, setTipoProcessoData] = useState<{ name: string; value: number }[]>([]);
  const [instanciaData, setInstanciaData] = useState<{ name: string; value: number }[]>([]);
  const [valorCausaTotal, setValorCausaTotal] = useState(0);
  const [proximosPrazos, setProximosPrazos] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0];
      const today = now.toISOString().split("T")[0];

      const [cRes, pRes, aRes] = await Promise.all([
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("processos").select("id", { count: "exact", head: true }).eq("situacao", "Ativo"),
        supabase.from("agenda").select("id", { count: "exact", head: true }).eq("status", "pendente").gte("data_prazo", today).lte("data_prazo", weekFromNow),
      ]);

      setStats({ clientes: cRes.count ?? 0, processosAtivos: pRes.count ?? 0, prazosSemana: aRes.count ?? 0 });

      const { data: allProc } = await supabase.from("processos").select("prognostico, tipo_processo, valor_causa, situacao, localizador, status_pagamento_honorarios");
      if (allProc) {
        const progCounts: Record<string, number> = {};
        const tipoCounts: Record<string, number> = {};
        const instanciaCounts: Record<string, number> = {};
        let somaValorCausa = 0;
        allProc.forEach((p: any) => {
          if (p.prognostico) progCounts[p.prognostico] = (progCounts[p.prognostico] || 0) + 1;
          if (p.tipo_processo) tipoCounts[p.tipo_processo] = (tipoCounts[p.tipo_processo] || 0) + 1;
          if (!isProcessoEncerrado(p) && p.valor_causa) somaValorCausa += Number(p.valor_causa);
          if (!isProcessoEncerrado(p)) {
            const inst = p.localizador || "Não informado";
            instanciaCounts[inst] = (instanciaCounts[inst] || 0) + 1;
          }
        });
        setPrognosticoData(Object.entries(progCounts).map(([name, value]) => ({ name, value })));
        setTipoProcessoData(Object.entries(tipoCounts).map(([name, value]) => ({ name, value })));
        setInstanciaData(Object.entries(instanciaCounts).map(([name, value]) => ({ name, value })));
        setValorCausaTotal(somaValorCausa);
      }

      const { data: allFases } = await supabase.from("processos").select("fase_id, aux_fases(nome)").not("fase_id", "is", null);
      if (allFases) {
        const counts: Record<string, number> = {};
        allFases.forEach((p: any) => { const k = p.aux_fases?.nome || "Sem fase"; counts[k] = (counts[k] || 0) + 1; });
        setFaseData(Object.entries(counts).map(([name, value]) => ({ name, value })));
      }

      const { data: allClients } = await supabase.from("clientes").select("status_cliente");
      if (allClients) {
        const counts: Record<string, number> = {};
        allClients.forEach((c: any) => { const k = c.status_cliente || "Assinatura Pendente"; counts[k] = (counts[k] || 0) + 1; });
        setConversaoData(Object.entries(counts).map(([name, value]) => ({ name, value })));
      }

      const { data: prazos } = await supabase
        .from("agenda").select("id, titulo, data_prazo, status")
        .eq("status", "pendente").order("data_prazo", { ascending: true }).limit(5);
      if (prazos) setProximosPrazos(prazos);
    };
    load();
  }, []);

  const cards = [
    { label: "Total de Clientes", value: stats.clientes, icon: Users, route: "/clientes" },
    { label: "Processos Ativos", value: stats.processosAtivos, icon: Briefcase, route: "/processos" },
    { label: "Prazos da Semana", value: stats.prazosSemana, icon: CalendarDays, route: "/agenda" },
    { label: "Valor de Causa Ajuizado", value: fmtBRL(valorCausaTotal), icon: DollarSign, route: "/financeiro" },
  ];

  return (
    <>
      <h2 className="text-3xl font-bold mb-2 text-foreground">Dashboard</h2>
      <p className="text-muted-foreground mb-8">Visão geral do escritório</p>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        {cards.map((c) => (
          <SpotlightCard key={c.label} onClick={() => navigate(c.route)}>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <c.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground truncate">{c.value}</p>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </div>
            </div>
          </SpotlightCard>
        ))}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mb-8">
        <SpotlightCard>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Prognóstico dos Processos</h3>
          </div>
          <DonutChart data={prognosticoData} emptyMessage="Sem dados de prognóstico" onSliceClick={(name) => navigate(`/processos?filtroPrognostico=${encodeURIComponent(name)}`)} />
        </SpotlightCard>

        <SpotlightCard>
          <h3 className="text-lg font-semibold mb-4 text-foreground">Distribuição por Fase</h3>
          <DonutChart data={faseData} emptyMessage="Sem dados de fase" onSliceClick={(name) => navigate(`/processos?filtroFase=${encodeURIComponent(name)}`)} />
        </SpotlightCard>

        <SpotlightCard>
          <h3 className="text-lg font-semibold mb-4 text-foreground">Taxa de Conversão de Clientes</h3>
          <DonutChart data={conversaoData} emptyMessage="Sem dados de clientes" />
        </SpotlightCard>

        <SpotlightCard>
          <h3 className="text-lg font-semibold mb-4 text-foreground">Tipo de Processo</h3>
          <DonutChart data={tipoProcessoData} emptyMessage="Sem dados de tipo" onSliceClick={(name) => navigate(`/processos?filtroTipo=${encodeURIComponent(name)}`)} />
        </SpotlightCard>

        <SpotlightCard>
          <h3 className="text-lg font-semibold mb-4 text-foreground">Processos por Instância</h3>
          <DonutChart data={instanciaData} emptyMessage="Sem dados de instância" />
        </SpotlightCard>
      </div>

      {proximosPrazos.length > 0 && (
        <SpotlightCard>
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Próximos Prazos</h3>
          </div>
          <div className="space-y-3">
            {proximosPrazos.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
                <span className="font-medium text-sm text-foreground">{p.titulo}</span>
                <span className="text-sm text-primary font-mono">
                  {new Date(p.data_prazo + "T00:00:00").toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </SpotlightCard>
      )}
    </>
  );
}
