import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SpotlightCard } from "@/components/SpotlightCard";
import { fmtBRL } from "@/lib/financeiro";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Clock, DollarSign, Activity } from "lucide-react";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const PIE_COLORS = [
  "hsl(210, 80%, 55%)", "hsl(142, 71%, 45%)", "hsl(45, 80%, 50%)",
  "hsl(260, 60%, 55%)", "hsl(30, 80%, 50%)", "hsl(0, 60%, 50%)",
];

interface Honorario {
  valor: number;
  data_pagamento: string | null;
  tipo_honorario: string;
  status: string;
}

interface Processo {
  id: string;
  tipo_processo: string | null;
  area_atuacao: string | null;
  data_distribuicao: string | null;
  data_encerramento: string | null;
  data_execucao: string | null;
  situacao: string | null;
  valor_execucao: number | null;
  valor_acordo: number | null;
  status_pagamento_honorarios: string | null;
  honorarios_percentual: number | null;
}

export default function MetricasAvancadas() {
  const [honorarios, setHonorarios] = useState<Honorario[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);

  useEffect(() => {
    const load = async () => {
      const [{ data: h }, { data: p }] = await Promise.all([
        supabase.from("honorarios").select("valor, data_pagamento, tipo_honorario, status"),
        supabase.from("processos").select("id, tipo_processo, area_atuacao, data_distribuicao, data_encerramento, data_execucao, situacao, valor_execucao, valor_acordo, status_pagamento_honorarios, honorarios_percentual"),
      ]);
      if (h) setHonorarios(h as Honorario[]);
      if (p) setProcessos(p as Processo[]);
    };
    load();
  }, []);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // KPI: Receita deste mês (honorários pagos)
  const receitaMesAtual = useMemo(() => {
    return honorarios
      .filter(h => h.status === "pago" && h.data_pagamento)
      .filter(h => {
        const d = new Date(h.data_pagamento!);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((s, h) => s + Number(h.valor || 0), 0);
  }, [honorarios, currentMonth, currentYear]);

  const receitaMesAnterior = useMemo(() => {
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return honorarios
      .filter(h => h.status === "pago" && h.data_pagamento)
      .filter(h => {
        const d = new Date(h.data_pagamento!);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      })
      .reduce((s, h) => s + Number(h.valor || 0), 0);
  }, [honorarios, currentMonth, currentYear]);

  const variacaoMes = receitaMesAnterior > 0
    ? ((receitaMesAtual - receitaMesAnterior) / receitaMesAnterior) * 100
    : receitaMesAtual > 0 ? 100 : 0;

  // KPI: Tempo médio de duração
  const tempoMedioDuracao = useMemo(() => {
    const finalizados = processos.filter(p => p.data_distribuicao && p.data_encerramento);
    if (!finalizados.length) return null;
    const totalDias = finalizados.reduce((s, p) => {
      const diff = new Date(p.data_encerramento!).getTime() - new Date(p.data_distribuicao!).getTime();
      return s + Math.max(0, diff / 86400000);
    }, 0);
    return totalDias / finalizados.length;
  }, [processos]);

  // KPI: Tempo médio em execução
  const tempoMedioExecucao = useMemo(() => {
    const emExec = processos.filter(p => p.data_execucao);
    if (!emExec.length) return null;
    const totalDias = emExec.reduce((s, p) => {
      const fim = p.data_encerramento ? new Date(p.data_encerramento) : now;
      const diff = fim.getTime() - new Date(p.data_execucao!).getTime();
      return s + Math.max(0, diff / 86400000);
    }, 0);
    return totalDias / emExec.length;
  }, [processos]);

  const formatDias = (dias: number | null) => {
    if (dias === null) return "—";
    const meses = Math.floor(dias / 30);
    const d = Math.round(dias % 30);
    return meses > 0 ? `${meses} meses / ${d} dias` : `${d} dias`;
  };

  // Gráfico: Receita mensal (honorários pagos no ano)
  const receitaMensal = useMemo(() => {
    const data = MONTHS.map((m, i) => ({ name: m, valor: 0 }));
    honorarios
      .filter(h => h.status === "pago" && h.data_pagamento)
      .forEach(h => {
        const d = new Date(h.data_pagamento!);
        if (d.getFullYear() === currentYear) {
          data[d.getMonth()].valor += Number(h.valor || 0);
        }
      });
    return data;
  }, [honorarios, currentYear]);

  // Donut: Composição da receita do mês
  const composicaoReceita = useMemo(() => {
    const map: Record<string, number> = {};
    honorarios
      .filter(h => h.status === "pago" && h.data_pagamento)
      .filter(h => {
        const d = new Date(h.data_pagamento!);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .forEach(h => {
        const tipo = h.tipo_honorario || "Outros";
        map[tipo] = (map[tipo] || 0) + Number(h.valor || 0);
      });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [honorarios, currentMonth, currentYear]);

  // Matriz de desempenho
  const matrizData = useMemo(() => {
    const map: Record<string, { volume: number; tempoTotal: number; tempoCount: number; receita: number }> = {};
    processos.forEach(p => {
      const key = p.tipo_processo || p.area_atuacao || "Não informado";
      if (!map[key]) map[key] = { volume: 0, tempoTotal: 0, tempoCount: 0, receita: 0 };
      map[key].volume++;
      if (p.data_execucao) {
        const fim = p.data_encerramento ? new Date(p.data_encerramento) : now;
        const diff = Math.max(0, (fim.getTime() - new Date(p.data_execucao).getTime()) / 86400000);
        map[key].tempoTotal += diff;
        map[key].tempoCount++;
      }
      if (p.status_pagamento_honorarios === "Pago") {
        const base = Number(p.valor_execucao || 0) || Number(p.valor_acordo || 0);
        const pct = Number(p.honorarios_percentual || 0);
        map[key].receita += base * (pct / 100);
      }
    });
    return Object.entries(map)
      .map(([tipo, d]) => ({
        tipo,
        volume: d.volume,
        tempoMedio: d.tempoCount > 0 ? d.tempoTotal / d.tempoCount : null,
        receita: d.receita,
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
    const color = getSlaColor(dias);
    const colorMap: Record<string, string> = {
      green: "text-emerald-500", yellow: "text-yellow-500", red: "text-red-500", muted: "text-muted-foreground",
    };
    return <span className={`inline-block h-3 w-3 rounded-full ${colorMap[color]}`} style={{ backgroundColor: "currentColor" }} />;
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <SpotlightCard>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10">
              <DollarSign className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
              <p className="kpi-value text-2xl font-bold text-foreground">{fmtBRL(receitaMesAtual)}</p>
              <p className="text-sm text-muted-foreground">Receita deste Mês</p>
              <div className="flex items-center gap-1 text-xs mt-0.5">
                {variacaoMes > 0 ? (
                  <><TrendingUp className="h-3 w-3 text-emerald-500" /><span className="text-emerald-500">+{variacaoMes.toFixed(0)}% vs mês anterior</span></>
                ) : variacaoMes < 0 ? (
                  <><TrendingDown className="h-3 w-3 text-red-500" /><span className="text-red-500">{variacaoMes.toFixed(0)}% vs mês anterior</span></>
                ) : (
                  <><Minus className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">Sem variação</span></>
                )}
              </div>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10">
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
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10">
              <Activity className="h-7 w-7 text-purple-500" />
            </div>
            <div>
              <p className="kpi-value text-2xl font-bold text-foreground">{formatDias(tempoMedioExecucao)}</p>
              <p className="text-sm text-muted-foreground">Tempo Médio em Execução</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Data de Execução → Encerramento/Hoje</p>
            </div>
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
                <TableHead className="text-right">Receita Gerada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrizData.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sem dados suficientes</TableCell></TableRow>
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
                  <TableCell className="text-right font-mono text-sm">{fmtBRL(row.receita)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> ≤ 6 meses</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> 6–12 meses</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> &gt; 12 meses</span>
        </div>
      </SpotlightCard>
    </div>
  );
}
