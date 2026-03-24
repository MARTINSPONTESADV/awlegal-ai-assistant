import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SpotlightCard } from "@/components/SpotlightCard";
import { fmtBRL, calcEscritorio } from "@/lib/financeiro";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Minus, Clock, DollarSign, Activity,
  Trophy, Ticket, Handshake, Hammer, Timer,
} from "lucide-react";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const COLORS_PROG: Record<string, string> = {
  "Procedente":   "#22c55e",
  "Acordo":       "#3b82f6",
  "Parcial":      "#f59e0b",
  "Improcedente": "#ef4444",
  "Outros":       "#8b5cf6",
};
const PIE_FALLBACK = ["hsl(210,80%,55%)", "hsl(142,71%,45%)", "hsl(45,80%,50%)", "hsl(260,60%,55%)", "hsl(30,80%,50%)"];

const FONTE_CONFIG = {
  Acordo:   { color: "#3b82f6", bg: "bg-blue-500/10",   text: "text-blue-500",   Icon: Handshake },
  Execução: { color: "#a855f7", bg: "bg-purple-500/10", text: "text-purple-500", Icon: Hammer    },
} as const;

type TipoReceita = "Acordo" | "Execução";
const TIPOS_RECEITA: TipoReceita[] = ["Acordo", "Execução"];

interface Processo {
  id: string;
  tipo_processo: string | null;
  area_atuacao: string | null;
  data_distribuicao: string | null;
  data_encerramento: string | null;
  data_execucao: string | null;
  data_pagamento: string | null;
  situacao: string | null;
  prognostico: string | null;
  valor_execucao: number | null;
  valor_acordo: number | null;
  valor_sentenca: number | null;
  status_pagamento_honorarios: string | null;
  honorarios_percentual: number | null;
}

function calcReceita(p: Processo): number {
  const base = Number(p.valor_acordo || 0) || Number(p.valor_execucao || 0) || Number(p.valor_sentenca || 0);
  const pct = Number(p.honorarios_percentual || 0);
  return calcEscritorio(base, pct);
}

/** Fonte de receita determinada pelo campo de valor preenchido */
function getTipoReceita(p: Processo): TipoReceita | null {
  if (Number(p.valor_acordo || 0) > 0) return "Acordo";
  if (Number(p.valor_execucao || 0) > 0) return "Execução";
  return null;
}

/** Data de referência para cálculo de receita: data_pagamento > data_encerramento */
function getDataRef(p: Processo): string | null {
  return p.data_pagamento || p.data_encerramento;
}

export default function MetricasAvancadas() {
  const [processos, setProcessos] = useState<Processo[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: p } = await supabase
        .from("processos")
        .select("id, tipo_processo, area_atuacao, data_distribuicao, data_encerramento, data_execucao, data_pagamento, situacao, prognostico, valor_execucao, valor_acordo, valor_sentenca, honorarios_percentual, status_pagamento_honorarios");
      if (p) setProcessos(p as Processo[]);
    };
    load();
  }, []);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const processosPagos = useMemo(
    () => processos.filter(p => p.status_pagamento_honorarios === "Pago"),
    [processos]
  );

  // ── KPI: Receita deste mês ─────────────────────────────────────────────────
  const receitaMesAtual = useMemo(() => {
    return processosPagos
      .filter(p => {
        const ref = getDataRef(p);
        if (!ref) return false;
        const d = new Date(ref + "T00:00:00");
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((s, p) => s + calcReceita(p), 0);
  }, [processosPagos, currentMonth, currentYear]);

  const receitaMesAnterior = useMemo(() => {
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return processosPagos
      .filter(p => {
        const ref = getDataRef(p);
        if (!ref) return false;
        const d = new Date(ref + "T00:00:00");
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      })
      .reduce((s, p) => s + calcReceita(p), 0);
  }, [processosPagos, currentMonth, currentYear]);

  const variacaoMes = receitaMesAnterior > 0
    ? ((receitaMesAtual - receitaMesAnterior) / receitaMesAnterior) * 100
    : receitaMesAtual > 0 ? 100 : 0;

  // ── KPI: Tempo médio de duração ────────────────────────────────────────────
  const tempoMedioDuracao = useMemo(() => {
    const finalizados = processos.filter(p => p.data_distribuicao && p.data_encerramento);
    if (!finalizados.length) return null;
    const totalDias = finalizados.reduce((s, p) => {
      const diff = new Date(p.data_encerramento!).getTime() - new Date(p.data_distribuicao!).getTime();
      return s + Math.max(0, diff / 86400000);
    }, 0);
    return totalDias / finalizados.length;
  }, [processos]);

  // ── KPI: Tempo médio em execução (inclui ativos) ───────────────────────────
  const tempoMedioExecucao = useMemo(() => {
    const emExecucao = processos.filter(p => p.data_execucao);
    if (!emExecucao.length) return null;
    const today = new Date();
    const totalDias = emExecucao.reduce((s, p) => {
      const start = new Date(p.data_execucao! + "T00:00:00");
      const end = p.data_encerramento ? new Date(p.data_encerramento + "T00:00:00") : today;
      return s + Math.max(0, (end.getTime() - start.getTime()) / 86400000);
    }, 0);
    return totalDias / emExecucao.length;
  }, [processos]);

  // ── KPI: Taxa de Êxito = (Procedentes + Acordos) / Julgados ───────────────
  const { taxaExito, totalJulgados, totalExitosos } = useMemo(() => {
    const julgados = processos.filter(p => p.prognostico && p.prognostico !== "");
    const exitosos = julgados.filter(p => p.prognostico === "Procedente" || p.prognostico === "Acordo");
    return {
      taxaExito: julgados.length > 0 ? (exitosos.length / julgados.length) * 100 : null,
      totalJulgados: julgados.length,
      totalExitosos: exitosos.length,
    };
  }, [processos]);

  // ── KPI: Ticket Médio ──────────────────────────────────────────────────────
  const ticketMedio = useMemo(() => {
    if (!processosPagos.length) return null;
    const total = processosPagos.reduce((s, p) => s + calcReceita(p), 0);
    return total / processosPagos.length;
  }, [processosPagos]);

  // ── KPI: Tempo médio até pagamento (data_encerramento → data_pagamento) ────
  const tempoMedioAtePagamento = useMemo(() => {
    const comAmbas = processosPagos.filter(p => p.data_encerramento && p.data_pagamento);
    if (!comAmbas.length) return null;
    const total = comAmbas.reduce((s, p) => {
      const enc = new Date(p.data_encerramento! + "T00:00:00");
      const pag = new Date(p.data_pagamento! + "T00:00:00");
      return s + Math.max(0, (pag.getTime() - enc.getTime()) / 86400000);
    }, 0);
    return total / comAmbas.length;
  }, [processosPagos]);

  // ── Análise por fonte de receita ───────────────────────────────────────────
  const receitaPorFonte = useMemo(() => {
    return TIPOS_RECEITA.map(tipo => {
      const todos = processos.filter(p => getTipoReceita(p) === tipo);
      const pagos = todos.filter(p => p.status_pagamento_honorarios === "Pago");
      const pendentes = todos.filter(p => p.status_pagamento_honorarios !== "Pago");
      const totalRecebido = pagos.reduce((s, p) => s + calcReceita(p), 0);
      const totalPendente = pendentes.reduce((s, p) => s + calcReceita(p), 0);
      return {
        tipo,
        total: todos.length,
        qtdPagos: pagos.length,
        qtdPendentes: pendentes.length,
        totalRecebido,
        totalPendente,
        taxaRecebimento: todos.length > 0 ? (pagos.length / todos.length) * 100 : 0,
        ticketMedio: pagos.length > 0 ? totalRecebido / pagos.length : null,
      };
    });
  }, [processos]);

  // ── Gráfico: Receita mensal por fonte (stacked bar) ───────────────────────
  const receitaMensalPorTipo = useMemo(() => {
    const data = MONTHS.map(m => ({ name: m, Acordo: 0, Execução: 0 }));
    processosPagos
      .filter(p => getDataRef(p))
      .forEach(p => {
        const ref = getDataRef(p)!;
        const d = new Date(ref + "T00:00:00");
        if (d.getFullYear() === currentYear) {
          const tipo = getTipoReceita(p);
          if (tipo) (data[d.getMonth()] as any)[tipo] += calcReceita(p);
        }
      });
    return data;
  }, [processosPagos, currentYear]);

  // ── Gráfico: Receita mensal total (bar simples) ────────────────────────────
  const receitaMensal = useMemo(() => {
    const data = MONTHS.map((m) => ({ name: m, valor: 0 }));
    processosPagos
      .filter(p => getDataRef(p))
      .forEach(p => {
        const ref = getDataRef(p)!;
        const d = new Date(ref + "T00:00:00");
        if (d.getFullYear() === currentYear) data[d.getMonth()].valor += calcReceita(p);
      });
    return data;
  }, [processosPagos, currentYear]);

  // ── Gráfico: Composição receita mês atual por prognóstico ─────────────────
  const composicaoReceita = useMemo(() => {
    const map: Record<string, number> = {};
    processosPagos
      .filter(p => {
        const ref = getDataRef(p);
        if (!ref) return false;
        const d = new Date(ref + "T00:00:00");
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .forEach(p => {
        const tipo = p.prognostico || "Outros";
        map[tipo] = (map[tipo] || 0) + calcReceita(p);
      });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [processosPagos, currentMonth, currentYear]);

  // ── Matriz de desempenho ───────────────────────────────────────────────────
  const matrizData = useMemo(() => {
    const map: Record<string, {
      volume: number; tempoTotal: number; tempoCount: number;
      receitaRealizada: number; receitaPotencial: number;
    }> = {};
    const today = new Date();
    processos.forEach(p => {
      const key = p.tipo_processo || p.area_atuacao || "Não informado";
      if (!map[key]) map[key] = { volume: 0, tempoTotal: 0, tempoCount: 0, receitaRealizada: 0, receitaPotencial: 0 };
      map[key].volume++;
      if (p.data_execucao) {
        const start = new Date(p.data_execucao + "T00:00:00");
        const end = p.data_encerramento ? new Date(p.data_encerramento + "T00:00:00") : today;
        map[key].tempoTotal += Math.max(0, (end.getTime() - start.getTime()) / 86400000);
        map[key].tempoCount++;
      }
      if (p.status_pagamento_honorarios === "Pago") map[key].receitaRealizada += calcReceita(p);
      else map[key].receitaPotencial += calcReceita(p);
    });
    return Object.entries(map)
      .map(([tipo, d]) => ({
        tipo, volume: d.volume,
        tempoMedio: d.tempoCount > 0 ? d.tempoTotal / d.tempoCount : null,
        receitaRealizada: d.receitaRealizada,
        receitaPotencial: d.receitaPotencial,
      }))
      .sort((a, b) => b.volume - a.volume);
  }, [processos]);

  // ── Helpers de formatação ──────────────────────────────────────────────────
  const formatDias = (dias: number | null) => {
    if (dias === null) return "—";
    const meses = Math.floor(dias / 30);
    const d = Math.round(dias % 30);
    return meses > 0 ? `${meses} meses / ${d} dias` : `${d} dias`;
  };

  const getSlaColor = (dias: number | null) => {
    if (dias === null) return "muted";
    if (dias <= 180) return "green";
    if (dias <= 365) return "yellow";
    return "red";
  };

  const SlaIcon = ({ dias }: { dias: number | null }) => {
    const colorMap: Record<string, string> = {
      green: "text-emerald-500", yellow: "text-yellow-500", red: "text-red-500", muted: "text-muted-foreground",
    };
    return <span className={`inline-block h-3 w-3 rounded-full ${colorMap[getSlaColor(dias)]}`} style={{ backgroundColor: "currentColor" }} />;
  };

  const yAxisFormatter = (v: number) => {
    if (v === 0) return "R$0";
    if (v >= 1000000) return `R$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `R$${(v / 1000).toFixed(0)}k`;
    return `R$${v.toFixed(0)}`;
  };

  const taxaBadgeVariant = (pct: number) =>
    pct >= 70 ? "default" : pct >= 30 ? "secondary" : "destructive";

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── KPIs principais ── */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <SpotlightCard>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10 shrink-0">
              <DollarSign className="h-7 w-7 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="kpi-value text-2xl font-bold text-foreground truncate">{fmtBRL(receitaMesAtual)}</p>
              <p className="text-sm text-muted-foreground">Receita deste Mês</p>
              <div className="flex items-center gap-1 text-xs mt-0.5">
                {variacaoMes > 0 ? (
                  <><TrendingUp className="h-3 w-3 text-emerald-500" /><span className="text-emerald-500">+{variacaoMes.toFixed(0)}% vs anterior</span></>
                ) : variacaoMes < 0 ? (
                  <><TrendingDown className="h-3 w-3 text-red-500" /><span className="text-red-500">{variacaoMes.toFixed(0)}% vs anterior</span></>
                ) : (
                  <><Minus className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">Sem variação</span></>
                )}
              </div>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10 shrink-0">
              <Clock className="h-7 w-7 text-blue-500" />
            </div>
            <div>
              <p className="kpi-value text-2xl font-bold text-foreground">{formatDias(tempoMedioDuracao)}</p>
              <p className="text-sm text-muted-foreground">Tempo Médio de Duração</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Distribuição → Encerramento</p>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 shrink-0">
              <Trophy className="h-7 w-7 text-amber-500" />
            </div>
            <div>
              <p className="kpi-value text-2xl font-bold text-foreground">
                {taxaExito !== null ? `${taxaExito.toFixed(1)}%` : "—"}
              </p>
              <p className="text-sm text-muted-foreground">Taxa de Êxito</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {totalJulgados > 0 ? `${totalExitosos} êxito / ${totalJulgados} julgados` : "Procedentes + Acordos / julgados"}
              </p>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10 shrink-0">
              <Ticket className="h-7 w-7 text-purple-500" />
            </div>
            <div className="min-w-0">
              <p className="kpi-value text-2xl font-bold text-foreground truncate">
                {ticketMedio !== null ? fmtBRL(ticketMedio) : "—"}
              </p>
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Receita / processos pagos</p>
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* ── KPIs secundários ── */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <SpotlightCard>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10 shrink-0">
              <Activity className="h-7 w-7 text-purple-500" />
            </div>
            <div>
              <p className="kpi-value text-2xl font-bold text-foreground">{formatDias(tempoMedioExecucao)}</p>
              <p className="text-sm text-muted-foreground">Tempo Médio em Execução</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Data Execução → Encerramento (ou hoje)</p>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/10 shrink-0">
              <Timer className="h-7 w-7 text-orange-500" />
            </div>
            <div>
              <p className="kpi-value text-2xl font-bold text-foreground">{formatDias(tempoMedioAtePagamento)}</p>
              <p className="text-sm text-muted-foreground">Tempo Médio até Pagamento</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Do encerramento ao recebimento</p>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="flex flex-col justify-center h-full gap-2 px-2">
            <p className="text-sm font-semibold text-muted-foreground">Total Processos</p>
            <div className="flex gap-4 text-sm">
              <span className="text-muted-foreground">Ativos: <span className="font-bold text-foreground">{processos.filter(p => !p.data_encerramento).length}</span></span>
              <span className="text-muted-foreground">Encerrados: <span className="font-bold text-foreground">{processos.filter(p => p.data_encerramento).length}</span></span>
              <span className="text-muted-foreground">Total: <span className="font-bold text-foreground">{processos.length}</span></span>
            </div>
            <p className="text-xs text-muted-foreground/70">Processos pagos: {processosPagos.length}</p>
          </div>
        </SpotlightCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SEÇÃO: Receita por Fonte de Pagamento
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Receita por Fonte de Pagamento</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Acordo · Execução</span>
        </div>

        {/* KPI cards por fonte */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {receitaPorFonte.map(({ tipo, total, qtdPagos, totalRecebido, totalPendente, taxaRecebimento }) => {
            const cfg = FONTE_CONFIG[tipo];
            const { Icon } = cfg;
            return (
              <SpotlightCard key={tipo}>
                <div className="flex items-start gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${cfg.bg} shrink-0`}>
                    <Icon className={`h-7 w-7 ${cfg.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-muted-foreground">{tipo}</p>
                      <Badge
                        variant={taxaBadgeVariant(taxaRecebimento)}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {taxaRecebimento.toFixed(0)}% recebido
                      </Badge>
                    </div>
                    <p className="kpi-value text-2xl font-bold text-foreground truncate">{fmtBRL(totalRecebido)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {qtdPagos} de {total} processos pagos
                    </p>
                    {totalPendente > 0 && (
                      <p className="text-xs text-amber-500 mt-0.5">
                        + {fmtBRL(totalPendente)} pendente
                      </p>
                    )}
                  </div>
                </div>
              </SpotlightCard>
            );
          })}
        </div>

        {/* Stacked bar + tabela de análise */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Stacked bar: evolução mensal por fonte */}
          <SpotlightCard>
            <h3 className="text-lg font-semibold mb-4">Evolução Mensal por Fonte — {currentYear}</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={receitaMensalPorTipo} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tickFormatter={yAxisFormatter} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={60} />
                  <ReTooltip
                    formatter={(value: number, name: string) => [fmtBRL(value), name]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }} />
                  {TIPOS_RECEITA.map(tipo => (
                    <Bar key={tipo} dataKey={tipo} stackId="a" fill={FONTE_CONFIG[tipo].color} radius={tipo === "Execução" ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SpotlightCard>

          {/* Tabela de análise por fonte */}
          <SpotlightCard>
            <h3 className="text-lg font-semibold mb-4">Análise por Fonte de Receita</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fonte</TableHead>
                    <TableHead className="text-center">Processos</TableHead>
                    <TableHead className="text-right">Recebido</TableHead>
                    <TableHead className="text-right">Pendente</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receitaPorFonte.map(({ tipo, total, qtdPagos, qtdPendentes, totalRecebido, totalPendente, taxaRecebimento, ticketMedio: tm }) => {
                    const cfg = FONTE_CONFIG[tipo];
                    const { Icon } = cfg;
                    return (
                      <TableRow key={tipo}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${cfg.text}`} />
                            <span className="font-medium">{tipo}</span>
                          </div>
                          <div className="mt-1">
                            <Badge variant={taxaBadgeVariant(taxaRecebimento)} className="text-[10px] px-1.5 py-0">
                              {taxaRecebimento.toFixed(0)}%
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-1">{qtdPagos}/{total} pagos</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{total}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-emerald-500">
                          {totalRecebido > 0 ? fmtBRL(totalRecebido) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-amber-500">
                          {totalPendente > 0 ? fmtBRL(totalPendente) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {tm !== null ? fmtBRL(tm) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Linha de totais */}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-center">
                      <Badge>{processos.filter(p => getTipoReceita(p) !== null).length}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-500">
                      {fmtBRL(receitaPorFonte.reduce((s, f) => s + f.totalRecebido, 0))}
                    </TableCell>
                    <TableCell className="text-right font-mono text-amber-500">
                      {fmtBRL(receitaPorFonte.reduce((s, f) => s + f.totalPendente, 0))}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </SpotlightCard>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SEÇÃO: Gráficos — Receita Total e Composição
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Receita Mensal e Composição</h2>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <SpotlightCard>
            <h3 className="text-lg font-semibold mb-4">Receita Total Mensal — {currentYear}</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={receitaMensal} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tickFormatter={yAxisFormatter} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={60} />
                  <ReTooltip
                    formatter={(value: number) => [fmtBRL(value), "Receita"]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                    {receitaMensal.map((_, i) => (
                      <Cell key={i} fill={i === currentMonth ? "hsl(210, 80%, 55%)" : "hsl(210, 40%, 70%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SpotlightCard>

          <SpotlightCard>
            <h3 className="text-lg font-semibold mb-4">Composição da Receita — {MONTHS[currentMonth]}</h3>
            {composicaoReceita.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">Sem dados de receita neste mês</p>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={composicaoReceita} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}>
                      {composicaoReceita.map((entry, i) => (
                        <Cell key={i} fill={COLORS_PROG[entry.name] ?? PIE_FALLBACK[i % PIE_FALLBACK.length]} />
                      ))}
                    </Pie>
                    <ReTooltip
                      formatter={(value: number, name: string) => [fmtBRL(value), name]}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {composicaoReceita.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS_PROG[d.name] ?? PIE_FALLBACK[i % PIE_FALLBACK.length] }} />
                      <span className="text-muted-foreground">{d.name} — {fmtBRL(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SpotlightCard>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SEÇÃO: Matriz de Desempenho
      ════════════════════════════════════════════════════════════════════════ */}
      <SpotlightCard>
        <h3 className="text-lg font-semibold mb-4">Matriz de Desempenho por Tipo de Processo</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo / Matéria</TableHead>
                <TableHead className="text-center">Volume</TableHead>
                <TableHead className="text-center">Tempo Médio Execução</TableHead>
                <TableHead className="text-right">Receita Realizada</TableHead>
                <TableHead className="text-right">Receita Potencial</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrizData.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sem dados suficientes</TableCell></TableRow>
              )}
              {matrizData.map(row => (
                <TableRow key={row.tipo}>
                  <TableCell className="font-medium">{row.tipo}</TableCell>
                  <TableCell className="text-center"><Badge variant="secondary">{row.volume}</Badge></TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <SlaIcon dias={row.tempoMedio} />
                      <span className="text-sm">{formatDias(row.tempoMedio)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-emerald-500">{fmtBRL(row.receitaRealizada)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-amber-500">{fmtBRL(row.receitaPotencial)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> ≤ 6 meses</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> 6–12 meses</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> &gt; 12 meses</span>
          <span className="ml-auto text-muted-foreground/60">Receita Potencial = honorários ainda não recebidos</span>
        </div>
      </SpotlightCard>
    </div>
  );
}
