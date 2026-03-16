import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SpotlightCard } from "@/components/SpotlightCard";
import { DonutChart } from "@/components/DonutChart";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DollarSign, TrendingUp, Handshake, CheckCircle2, Clock,
  Archive, Briefcase, ExternalLink, Scale, Info, ShieldCheck, Sparkles,
  Megaphone, Users, MousePointerClick, Zap,
} from "lucide-react";
import {
  fmtBRL, calcEscritorio, calcRepasse, isProcessoEncerrado, type ProcessoFinanceiro,
} from "@/lib/financeiro";
import MetricasAvancadas from "@/components/MetricasAvancadas";
import { useTotalCausa } from "@/hooks/useTotalCausa";

interface MetaAdsInsight {
  date: string;
  campaign_id: string;
  campaign_name: string | null;
  adset_name: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  cpc: number | null;
  ctr: number | null;
  cpm: number | null;
  leads: number;
}

export default function Financeiro() {
  const navigate = useNavigate();
  const [processos, setProcessos] = useState<ProcessoFinanceiro[]>([]);
  const [clientes, setClientes] = useState<Record<string, string>>({});
  const [fases, setFases] = useState<Record<string, string>>({});
  const [metaAds, setMetaAds] = useState<MetaAdsInsight[]>([]);
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [showMetaInstructions, setShowMetaInstructions] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: p }, { data: c }, { data: f }, { data: m }] = await Promise.all([
        supabase.from("processos").select("id, numero_cnj, numero_processo, prognostico, fase, fase_id, status_processual, valor_causa, valor_execucao, valor_acordo, valor_sentenca, honorarios_percentual, status_pagamento_honorarios, cliente_id, situacao"),
        supabase.from("clientes").select("id, nome_completo"),
        supabase.from("aux_fases").select("id, nome"),
        supabase.from("meta_ads_insights").select("date, campaign_id, campaign_name, adset_name, spend, impressions, clicks, reach, cpc, ctr, cpm, leads").order("date", { ascending: false }).limit(500),
      ]);
      if (p) setProcessos(p as ProcessoFinanceiro[]);
      if (c) { const map: Record<string, string> = {}; c.forEach((cl: any) => { map[cl.id] = cl.nome_completo; }); setClientes(map); }
      if (f) { const map: Record<string, string> = {}; f.forEach((fa: any) => { map[fa.id] = fa.nome; }); setFases(map); }
      if (m) setMetaAds(m as MetaAdsInsight[]);
      setMetaLoaded(true);
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

  // Meta Ads computed metrics
  const metaTotalSpend = metaAds.reduce((s, r) => s + Number(r.spend || 0), 0);
  const metaTotalLeads = metaAds.reduce((s, r) => s + Number(r.leads || 0), 0);
  const metaCPA = metaTotalLeads > 0 ? metaTotalSpend / metaTotalLeads : null;

  // Group campaigns for table
  const campaignMap: Record<string, { name: string; spend: number; impressions: number; clicks: number; leads: number; cpc: number[]; ctr: number[] }> = {};
  metaAds.forEach(r => {
    const key = r.campaign_id;
    if (!campaignMap[key]) campaignMap[key] = { name: r.campaign_name || r.campaign_id, spend: 0, impressions: 0, clicks: 0, leads: 0, cpc: [], ctr: [] };
    campaignMap[key].spend += Number(r.spend || 0);
    campaignMap[key].impressions += Number(r.impressions || 0);
    campaignMap[key].clicks += Number(r.clicks || 0);
    campaignMap[key].leads += Number(r.leads || 0);
    if (r.cpc) campaignMap[key].cpc.push(Number(r.cpc));
    if (r.ctr) campaignMap[key].ctr.push(Number(r.ctr));
  });
  const campaigns = Object.values(campaignMap).sort((a, b) => b.spend - a.spend);

  return (
    <>
      <h2 className="font-display text-3xl font-bold mb-6">Financeiro</h2>

      {/* Meta Ads Instructions Modal */}
      <Dialog open={showMetaInstructions} onOpenChange={setShowMetaInstructions}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-blue-500" /> Configurar Meta Ads</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">Para conectar o Meta Ads ao sistema, você precisará de:</p>
            <ol className="space-y-3 list-decimal list-inside text-muted-foreground">
              <li><span className="font-medium text-foreground">META_ACCESS_TOKEN</span> — System User Token do Meta Business Manager (Configurações → Usuários do sistema)</li>
              <li><span className="font-medium text-foreground">META_AD_ACCOUNT_ID</span> — Ex: <code className="bg-muted px-1 rounded text-xs">act_123456789</code> (visível na URL do Gerenciador de Anúncios)</li>
              <li>Configurar o workflow n8n de sync diário (já documentado — executar com as credenciais em mãos)</li>
            </ol>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              O workflow n8n sincroniza automaticamente todo dia às 7h os dados de campanhas, gastos, impressões, cliques e leads.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="visao-geral" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="metricas">Métricas Avançadas</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
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
          {metaLoaded && metaAds.length === 0 ? (
            /* Empty state — awaiting Meta integration */
            <div className="space-y-6">
              <SpotlightCard>
                <div className="flex flex-col items-center text-center py-8 gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-500/10">
                    <Megaphone className="h-10 w-10 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Conecte sua conta Meta Ads</h3>
                    <p className="text-muted-foreground max-w-md text-sm">
                      Visualize CAC, CPA e ROI em tempo real — tudo sincronizado automaticamente com suas campanhas do Facebook e Instagram.
                    </p>
                  </div>
                  <Button onClick={() => setShowMetaInstructions(true)} className="gap-2">
                    <Zap className="h-4 w-4" /> Ver instruções de configuração
                  </Button>
                </div>
              </SpotlightCard>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Gasto Meta (mês)", icon: DollarSign, color: "hsl(210, 80%, 55%)" },
                  { label: "Custo por Lead (CPA)", icon: MousePointerClick, color: "hsl(260, 60%, 55%)" },
                  { label: "Leads Gerados", icon: Users, color: "hsl(142, 71%, 45%)" },
                  { label: "CAC Estimado", icon: TrendingUp, color: "hsl(30, 80%, 50%)" },
                ].map(({ label, icon: Icon, color }) => (
                  <SpotlightCard key={label}>
                    <div className="flex items-center gap-4 opacity-40">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl shrink-0" style={{ backgroundColor: `${color}20` }}>
                        <Icon className="h-7 w-7" style={{ color }} />
                      </div>
                      <div>
                        <div className="h-7 w-24 bg-muted rounded animate-pulse mb-1" />
                        <p className="text-sm text-muted-foreground">{label}</p>
                      </div>
                    </div>
                  </SpotlightCard>
                ))}
              </div>
            </div>
          ) : metaLoaded && metaAds.length > 0 ? (
            /* Data available */
            <div className="space-y-6">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <SpotlightCard>
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10 shrink-0"><DollarSign className="h-7 w-7 text-blue-500" /></div>
                    <div><p className="text-2xl font-bold">{fmtBRL(metaTotalSpend)}</p><p className="text-sm text-muted-foreground">Gasto Meta (total)</p></div>
                  </div>
                </SpotlightCard>
                <SpotlightCard>
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10 shrink-0"><MousePointerClick className="h-7 w-7 text-purple-500" /></div>
                    <div><p className="text-2xl font-bold">{metaCPA !== null ? fmtBRL(metaCPA) : "—"}</p><p className="text-sm text-muted-foreground">CPA (Custo por Lead)</p></div>
                  </div>
                </SpotlightCard>
                <SpotlightCard>
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10 shrink-0"><Users className="h-7 w-7 text-emerald-500" /></div>
                    <div><p className="text-2xl font-bold">{metaTotalLeads.toLocaleString("pt-BR")}</p><p className="text-sm text-muted-foreground">Leads Gerados</p></div>
                  </div>
                </SpotlightCard>
              </div>

              <SpotlightCard>
                <h3 className="text-lg font-semibold mb-4">Campanhas</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs">
                        <th className="text-left py-2 pr-4">Campanha</th>
                        <th className="text-right py-2 px-3">Gasto</th>
                        <th className="text-right py-2 px-3">Impressões</th>
                        <th className="text-right py-2 px-3">Cliques</th>
                        <th className="text-right py-2 px-3">CTR</th>
                        <th className="text-right py-2 px-3">Leads</th>
                        <th className="text-right py-2 pl-3">CPA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(c => (
                        <tr key={c.name} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 pr-4 font-medium max-w-[200px] truncate">{c.name}</td>
                          <td className="text-right py-2 px-3 font-mono">{fmtBRL(c.spend)}</td>
                          <td className="text-right py-2 px-3">{c.impressions.toLocaleString("pt-BR")}</td>
                          <td className="text-right py-2 px-3">{c.clicks.toLocaleString("pt-BR")}</td>
                          <td className="text-right py-2 px-3">{c.ctr.length > 0 ? `${(c.ctr.reduce((a, b) => a + b, 0) / c.ctr.length).toFixed(2)}%` : "—"}</td>
                          <td className="text-right py-2 px-3">{c.leads}</td>
                          <td className="text-right py-2 pl-3 font-mono">{c.leads > 0 ? fmtBRL(c.spend / c.leads) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SpotlightCard>
            </div>
          ) : (
            /* Loading */
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Carregando dados de marketing...</div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
