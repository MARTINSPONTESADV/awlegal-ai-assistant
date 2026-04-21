import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SpotlightCard } from "@/components/SpotlightCard";
import { DonutChart } from "@/components/DonutChart";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DollarSign, TrendingUp, Handshake, CheckCircle2,
  Archive, Briefcase, ExternalLink, Scale, Info, ShieldCheck, Sparkles,
} from "lucide-react";
import {
  fmtBRL, calcEscritorio, isProcessoEncerrado, type ProcessoFinanceiro,
} from "@/lib/financeiro";
import MetricasAvancadas from "@/components/MetricasAvancadas";
import { useTotalCausa } from "@/hooks/useTotalCausa";
import MarketingTab from "@/components/marketing/MarketingTab";
import GastosTab from "@/components/financeiro/GastosTab";

export default function Financeiro() {
  useEffect(() => { document.title = "Financeiro — AW LEGALTECH"; }, []);
  const navigate = useNavigate();
  const [processos, setProcessos] = useState<ProcessoFinanceiro[]>([]);
  const [clientes, setClientes] = useState<Record<string, string>>({});
  const [fases, setFases] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const [{ data: p }, { data: c }, { data: f }] = await Promise.all([
        supabase.from("processos").select("id, numero_cnj, numero_processo, prognostico, fase, fase_id, status_processual, valor_causa, valor_execucao, valor_acordo, valor_sentenca, honorarios_percentual, status_pagamento_honorarios, cliente_id, situacao"),
        supabase.from("clientes").select("id, nome_completo"),
        supabase.from("aux_fases").select("id, nome"),
      ]);
      if (p) setProcessos(p as ProcessoFinanceiro[]);
      if (c) { const map: Record<string, string> = {}; c.forEach((cl: any) => { map[cl.id] = cl.nome_completo; }); setClientes(map); }
      if (f) { const map: Record<string, string> = {}; f.forEach((fa: any) => { map[fa.id] = fa.nome; }); setFases(map); }
    };
    load();
  }, []);

  const getFaseName = (p: ProcessoFinanceiro) => { if (p.fase_id && fases[p.fase_id]) return fases[p.fase_id]; return p.fase || ""; };
  const isEncerrado = (p: ProcessoFinanceiro) => { if (isProcessoEncerrado(p)) return true; const faseName = getFaseName(p).toLowerCase(); if (faseName.includes("arquivamento")) return true; return false; };
  const pct = (p: ProcessoFinanceiro) => Number(p.honorarios_percentual || 0);

  const pagos = processos.filter(p => p.status_pagamento_honorarios === "Pago");
  const totalRecebidoEscritorio = pagos.reduce((s, p) => { const base = Number(p.valor_execucao || 0) || Number(p.valor_acordo || 0); return s + calcEscritorio(base, pct(p)); }, 0);

  const pendentesAcordos = processos.filter(p => p.status_pagamento_honorarios !== "Pago" && Number(p.valor_acordo || 0) > 0);
  const brutoAcordos = pendentesAcordos.reduce((s, p) => s + Number(p.valor_acordo || 0), 0);
  const escritorioAcordos = pendentesAcordos.reduce((s, p) => s + calcEscritorio(Number(p.valor_acordo || 0), pct(p)), 0);
  const repasseAcordos = brutoAcordos - escritorioAcordos;

  const pendentesExecucoes = processos.filter(p => p.status_pagamento_honorarios !== "Pago" && Number(p.valor_execucao || 0) > 0);
  const brutoExecucoes = pendentesExecucoes.reduce((s, p) => s + Number(p.valor_execucao || 0), 0);
  const escritorioExecucoes = pendentesExecucoes.reduce((s, p) => s + calcEscritorio(Number(p.valor_execucao || 0), pct(p)), 0);
  const repasseExecucoes = brutoExecucoes - escritorioExecucoes;

  const sentencasTramitando = processos.filter(p => !isEncerrado(p) && Number(p.valor_sentenca || 0) > 0);
  const brutoSentencas = sentencasTramitando.reduce((s, p) => s + Number(p.valor_sentenca || 0), 0);
  const escritorioSentencas = sentencasTramitando.reduce((s, p) => s + calcEscritorio(Number(p.valor_sentenca || 0), pct(p)), 0);
  const repasseSentencas = brutoSentencas - escritorioSentencas;

  const receitaGarantida = escritorioAcordos + escritorioExecucoes;
  const expectativaReceita = escritorioSentencas;

  const { causaTotal, causaAtivo, causaInativo } = useTotalCausa();

  const drillDown = (filtro: string) => navigate(`/processos?filtroFinanceiro=${filtro}`);

  const statusData = [
    { name: "Recebido", value: totalRecebidoEscritorio },
    { name: "A Receber (Garantido)", value: receitaGarantida },
    { name: "Expectativa (Sentenças)", value: expectativaReceita },
  ].filter(d => d.value > 0);

  const categoriaData = [
    { name: "Acordos (Escritório)", value: escritorioAcordos },
    { name: "Execuções (Escritório)", value: escritorioExecucoes },
    { name: "Sentenças (Escritório)", value: escritorioSentencas },
  ].filter(d => d.value > 0);

  const InfoTooltip = ({ text }: { text: string }) => (
    <Tooltip>
      <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help inline ml-1" /></TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">{text}</TooltipContent>
    </Tooltip>
  );

  const TopCard = ({ label, value, icon: Icon, color, filtro, tooltip }: { label: string; value: number; icon: any; color: string; filtro?: string; tooltip?: string; }) => (
    <SpotlightCard>
      <div className={`flex items-center gap-4 ${filtro ? "cursor-pointer group" : ""}`} onClick={filtro ? () => drillDown(filtro) : undefined}>
        <div className="flex h-14 w-14 items-center justify-center rounded-xl shrink-0" style={{ backgroundColor: `${color}20` }}><Icon className="h-7 w-7" style={{ color }} /></div>
        <div className="flex-1 min-w-0">
          <p className="text-xl lg:text-3xl font-bold tracking-tight truncate">{fmtBRL(value)}</p>
          <p className="text-sm text-muted-foreground flex items-center">{label}{tooltip && <InfoTooltip text={tooltip} />}</p>
        </div>
        {filtro && <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
      </div>
    </SpotlightCard>
  );

  const DetailCard = ({ label, escritorio, bruto, repasse, icon: Icon, color, filtro }: { label: string; escritorio: number; bruto: number; repasse: number; icon: any; color: string; filtro: string; }) => (
    <SpotlightCard>
      <div className="cursor-pointer group space-y-2" onClick={() => drillDown(filtro)}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: `${color}20` }}><Icon className="h-5 w-5" style={{ color }} /></div>
          <div className="flex-1 min-w-0"><p className="text-xl font-bold truncate">{fmtBRL(escritorio)}</p><p className="text-xs text-muted-foreground">{label}</p></div>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
        <div className="text-[11px] text-muted-foreground/70 border-t border-border/50 pt-1.5 flex gap-3 flex-wrap">
          <span>Bruto: {fmtBRL(bruto)}</span><span>•</span><span>Repasse: {fmtBRL(repasse)}</span>
        </div>
      </div>
    </SpotlightCard>
  );

  const StaticCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) => (
    <SpotlightCard>
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: `${color}20` }}><Icon className="h-6 w-6" style={{ color }} /></div>
        <div className="min-w-0"><p className="text-2xl font-bold truncate">{fmtBRL(value)}</p><p className="text-sm text-muted-foreground">{label}</p></div>
      </div>
    </SpotlightCard>
  );

  return (
    <>
      <h2 className="font-display text-3xl font-bold mb-6">Financeiro</h2>

      <Tabs defaultValue="visao-geral" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="metricas">Métricas Avançadas</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="gastos">Gastos</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-4">
            <TopCard label="Receita Garantida (A Receber)" value={receitaGarantida} icon={ShieldCheck} color="hsl(142, 71%, 45%)" filtro="areceber" tooltip="Valores líquidos do escritório já certos: parte dos Acordos + Execuções pendentes." />
            <TopCard label="Expectativa de Receita" value={expectativaReceita} icon={Sparkles} color="hsl(45, 80%, 50%)" filtro="sentencas_tramitando" tooltip="Valores líquidos de sentenças não transitadas em julgado — expectativa de direito." />
            <TopCard label="Total Recebido Histórico" value={totalRecebidoEscritorio} icon={CheckCircle2} color="hsl(210, 80%, 55%)" filtro="recebidos" />
          </div>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-2">
            <DetailCard label="A Receber: Acordos" escritorio={escritorioAcordos} bruto={brutoAcordos} repasse={repasseAcordos} icon={Handshake} color="hsl(260, 60%, 55%)" filtro="acordos_receber" />
            <DetailCard label="A Receber: Execuções" escritorio={escritorioExecucoes} bruto={brutoExecucoes} repasse={repasseExecucoes} icon={TrendingUp} color="hsl(200, 60%, 50%)" filtro="execucoes_receber" />
            <DetailCard label="Expectativa: Sentenças" escritorio={escritorioSentencas} bruto={brutoSentencas} repasse={repasseSentencas} icon={Scale} color="hsl(30, 80%, 50%)" filtro="sentencas_tramitando" />
          </div>
          <p className="text-xs text-muted-foreground mb-6 ml-1">Receita Garantida = Acordos + Execuções (parte do escritório) &nbsp;|&nbsp; Valores exibidos são a parte líquida do escritório.</p>
          <h3 className="font-display text-lg font-semibold mb-3 text-muted-foreground">Raio-X da Carteira — Valor de Causa</h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-8">
            <StaticCard label="Causa Total" value={causaTotal} icon={DollarSign} color="hsl(180, 50%, 45%)" />
            <StaticCard label="Causa Ativo" value={causaAtivo} icon={Briefcase} color="hsl(142, 71%, 45%)" />
            <StaticCard label="Causa Inativo" value={causaInativo} icon={Archive} color="hsl(0, 60%, 50%)" />
          </div>
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mb-8">
            <SpotlightCard><h3 className="font-display text-lg font-semibold mb-4">Receita: Recebido vs Garantido vs Expectativa</h3><DonutChart data={statusData} emptyMessage="Sem dados de pagamento" /></SpotlightCard>
            <SpotlightCard><h3 className="font-display text-lg font-semibold mb-4">Composição por Categoria (Escritório)</h3><DonutChart data={categoriaData} emptyMessage="Sem dados de honorários" /></SpotlightCard>
          </div>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <SpotlightCard>
              <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[hsl(142,71%,45%)]" />Honorários Pagos</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {pagos.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Nenhum pagamento registrado</p>}
                {pagos.map(p => { const base = Number(p.valor_execucao || 0) || Number(p.valor_acordo || 0); const escrit = calcEscritorio(base, pct(p)); return (
                  <div key={p.id} className="rounded-lg border border-border p-3 space-y-1">
                    <div className="flex justify-between items-center"><span className="text-sm font-medium truncate">{p.numero_cnj || p.numero_processo || "Sem número"}</span><Badge variant="default" className="shrink-0 text-xs">Pago</Badge></div>
                    <div className="flex justify-between text-xs text-muted-foreground"><span>{clientes[p.cliente_id] || "—"}</span><span className="font-medium text-foreground">{fmtBRL(escrit)}</span></div>
                  </div>
                ); })}
              </div>
            </SpotlightCard>
            <SpotlightCard>
              <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-[hsl(200,60%,50%)]" />A Receber: Execuções</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {pendentesExecucoes.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Nenhuma execução pendente</p>}
                {pendentesExecucoes.map(p => { const escrit = calcEscritorio(Number(p.valor_execucao || 0), pct(p)); return (
                  <div key={p.id} className="rounded-lg border border-border p-3 space-y-1">
                    <div className="flex justify-between items-center"><span className="text-sm font-medium truncate">{p.numero_cnj || p.numero_processo || "Sem número"}</span><Badge variant="secondary" className="shrink-0 text-xs">{p.honorarios_percentual ? `${p.honorarios_percentual}%` : "—"}</Badge></div>
                    <div className="flex justify-between text-xs text-muted-foreground"><span>{clientes[p.cliente_id] || "—"}</span><span className="font-medium text-foreground">{fmtBRL(escrit)}</span></div>
                  </div>
                ); })}
              </div>
            </SpotlightCard>
            <SpotlightCard>
              <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2"><Scale className="h-5 w-5 text-[hsl(30,80%,50%)]" />Expectativa: Sentenças</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {sentencasTramitando.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Nenhuma sentença tramitando</p>}
                {sentencasTramitando.map(p => { const escrit = calcEscritorio(Number(p.valor_sentenca || 0), pct(p)); return (
                  <div key={p.id} className="rounded-lg border border-border p-3 space-y-1">
                    <div className="flex justify-between items-center"><span className="text-sm font-medium truncate">{p.numero_cnj || p.numero_processo || "Sem número"}</span><Badge variant="outline" className="shrink-0 text-xs">Tramitando</Badge></div>
                    <div className="flex justify-between text-xs text-muted-foreground"><span>{clientes[p.cliente_id] || "—"}</span><span className="font-medium text-foreground">{fmtBRL(escrit)}</span></div>
                  </div>
                ); })}
              </div>
            </SpotlightCard>
          </div>
        </TabsContent>

        <TabsContent value="metricas">
          <MetricasAvancadas />
        </TabsContent>

        <TabsContent value="marketing">
          <MarketingTab />
        </TabsContent>

        <TabsContent value="gastos">
          <GastosTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
