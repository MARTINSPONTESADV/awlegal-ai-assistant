import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SpotlightCard } from "@/components/SpotlightCard";
import { fmtBRL, calcEscritorio } from "@/lib/financeiro";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Clock, DollarSign, Activity, Trophy, Ticket } from "lucide-react";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const PIE_COLORS = [
  "hsl(210, 80%, 55%)", "hsl(142, 71%, 45%)", "hsl(45, 80%, 50%)",
  "hsl(260, 60%, 55%)", "hsl(30, 80%, 50%)", "hsl(0, 60%, 50%)",
];

interface Processo {
  id: string;
  tipo_processo: string | null;
  area_atuacao: string | null;
  data_distribuicao: string | null;
  data_encerramento: string | null;
  data_execucao: string | null;
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

export default function MetricasAvancadas() {
  const [processos, setProcessos] = useState<Processo[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: p } = await supabase
        .from("processos")
        .select("id, tipo_processo, area_atuacao, data_distribuicao, data_encerramento, data_execucao, situacao, prognostico, valor_execucao, valor_acordo, valor_sentenca, honorarios_percentual, status_pagamento_honorarios");
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

  // KPI: Receita deste mês (processos pagos com data_encerramento neste mês)
  const receitaMesAtual = useMemo(() => {
    return processosPagos
      .filter(p => {
        if (!p.data_encerramento) return false;
        const d = new Date(p.data_encerramento);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((s, p) => s + calcReceita(p), 0);
  }, [processosPagos, currentMonth, currentYear]);

  const receitaMesAnterior = useMemo(() => {
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return processosPagos
      .filter(p => {
        if (!p.data_encerramento) return false;
        const d = new Date(p.data_encerramento);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      })
      .reduce((s, p) => s + calcReceita(p), 0);
  }, [processosPagos, currentMonth, currentYear]);

  const variacaoMes = receitaMesAnterior > 0
    ? ((receitaMesAtual - receitaMesAnterior) / receitaMesAnterior) * 100
    : receitaMesAtual > 0 ? 100 : 0;

  // KPI: Tempo médio de duração (somente processos com data_encerramento)
  const tempoMedioDuracao = useMemo(() => {
    const finalizados = processos.filter(p => p.data_distribuicao && p.data_encerramento);
    if (!finalizados.length) return null;
    const totalDias = finalizados.reduce((s, p) => {
      const diff = new Date(p.data_encerramento!).getTime() - new Date(p.data_distribuicao!).getTime();
      return s + Math.max(0, diff / 86400000);
    }, 0);
    return totalDias / finalizados.length;
  }, [processos]);

  // KPI: Tempo médio em execução — apenas encerrados (exclui ativos para não inflar)
  const tempoMedioExecucao = useMemo(() => {
    const encerrados = processos.filter(p => p.data_execucao && p.data_encerramento);
    if (!encerrados.length) return null;
    const totalDias = encerrados.reduce((s, p) => {
      const diff = new Date(p.data_encerramento!).getTime() - new Date(p.data_execucao!).getTime();
      return s + Math.max(0, diff / 86400000);
    }, 0);
    return totalDias / encerrados.length;
  }, [processos]);

  // KPI: Taxa de Êxito
  const taxaExito = useMemo(() => {
    const fechados = processos.filter(p => p.data_encerramento);
    if (!fechados.length) return null;
    const procedentes = fechados.filter(p => p.prognostico === "Procedente").length;
    return (procedentes / fechados.length) * 100;
  }, [processos]);

  // KPI: Ticket Médio
  const ticketMedio = useMemo(() => {
    if (!processosPagos.length) return null;
    const total = processosPagos.reduce((s, p) => s + calcReceita(p), 0);
    return total / processosPagos.length;
  }, [processosPagos]);

  const formatDias = (dias: number | null) => {
    if (dias === null) return "—";
    const meses = Math.floor(dias / 30);
    const d = Math.round(dias % 30);
    return meses > 0 ? `${meses} meses / ${d} dias` : `${d} dias`;
  };

  // Gráfico: Receita mensal (processos pagos agrupados por data_encerramento)
  const receitaMensal = useMemo(() => {
    const data = MONTHS.map((m) => ({ name: m, valor: 0 }));
    processosPagos
      .filter(p => p.data_encerramento)
      .forEach(p => {
        const d = new Date(p.data_encerramento!);
        if (d.getFullYear() === currentYear) {
          data[d.getMonth()].valor += calcReceita(p);
        }
      });
    return data;
  }, [processosPagos, currentYear]);

  // Donut: Composição da receita por prognóstico
  const composicaoReceita = useMemo(() => {
    const map: Record<string, number> = {};
    processosPagos
      .filter(p => p.data_encerramento)
      .filter(p => {
        const d = new Date(p.data_encerramento!);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .forEach(p => {
        const tipo = p.prognostico || "Outros";
        map[tipo] = (map[tipo] || 0) + calcReceita(p);
      });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [processosPagos, currentMonth, currentYear]);

  // Matriz de desempenho — tempo médio somente encerrados; receita potencial = pendentes
  const matrizData = useMemo(() => {
    const map: Record<string, {
      volume: number;
      tempoTotal: number;
      tempoCount: number;
      receitaRealizada: number;
      receitaPotencial: number;
    }> = {};
    processos.forEach(p => {
      const key = p.tipo_processo || p.area_atuacao || "Não informado";
      if (!map[key]) map[key] = { volume: 0, tempoTotal: 0, tempoCount: 0, receitaRealizada: 0, receitaPotencial: 0 };
      map[key].volume++;
      // Tempo médio: apenas processos encerrados (data_execucao + data_encerramento)
      if (p.data_execucao && p.data_encerramento) {
        const diff = Math.max(0, (new Date(p.data_encerramento).getTime() - new Date(p.data_execucao).getTime()) / 86400000);
        map[key].tempoTotal += diff;
        map[key].tempoCount++;
      }
      if (p.status_pagamento_honorarios === "Pago") {
        map[key].receitaRealizada += calcReceita(p);
      } else {
        // Potencial: processos não pagos
        map[key].receitaPotencial += calcReceita(p);
      }
    });
    return Object.entries(map)
      .map(([tipo, d]) => ({
        tipo,
        volume: d.volume,
        tempoMedio: d.tempoCount > 0 ? d.tempoTotal / d.tempoCount : null,
        receitaRealizada: d.receitaRealizada,
        receitaPotencial: d.receitaPotencial,
      }))
      .sort((a, b) => b.volume - a.volume);
  }, [processos]);

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
    const color = getSlaColor(dias);
    return <span className={`inline-block h-3 w-3 rounded-full ${colorMap[color]}`} style={{ backgroundColor: "currentColor" }} />;
  };

  return (
    <div className="space-y-6">
      {/* KPIs row 1 */}
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
              <p className="text-xs text-muted-foreground/70 mt-0.5">Procedentes / encerrados</p>
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

      {/* KPI: Tempo médio execução (encerrados apenas) */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <SpotlightCard>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10 shrink-0">
              <Activity className="h-7 w-7 text-purple-500" />
            </div>
            <div>
              <p className="kpi-value text-2xl font-bold text-foreground">{formatDias(tempoMedioExecucao)}</p>
              <p className="text-sm text-muted-foreground">Tempo Médio em Execução</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Data Execução → Encerramento (somente encerrados)</p>
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

      {/* Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <SpotlightCard>
          <h3 className="text-lg font-semibold mb-4">Receita Mensal — {currentYear}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={receitaMensal}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
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
                    {composicaoReceita.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip
                    formatter={(value: number) => [fmtBRL(value)]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {composicaoReceita.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SpotlightCard>
      </div>

      {/* Matriz de Desempenho */}
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
                  <TableCell className="text-center">
                    <Badge variant="secondary">{row.volume}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <SlaIcon dias={row.tempoMedio} />
                      <span className="text-sm">{formatDias(row.tempoMedio)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmtBRL(row.receitaRealizada)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">{fmtBRL(row.receitaPotencial)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> ≤ 6 meses</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> 6–12 meses</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> &gt; 12 meses</span>
          <span className="ml-auto text-muted-foreground/60">Receita Potencial = processos pendentes de pagamento</span>
        </div>
      </SpotlightCard>
    </div>
  );
}
