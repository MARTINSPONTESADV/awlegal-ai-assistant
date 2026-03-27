import { SpotlightCard } from "@/components/SpotlightCard";
import { TrendingUp } from "lucide-react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { fmtBRL } from "@/lib/financeiro";
import type { DailyTrend } from "@/hooks/useMarketingData";

interface Props {
  data: DailyTrend[];
}

function formatDate(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export default function MarketingTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <SpotlightCard>
        <div className="flex flex-col items-center text-center py-8 gap-2">
          <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Aguardando dados diários para gerar o gráfico de tendência.
          </p>
          <p className="text-xs text-muted-foreground/60">
            O workflow n8n sincroniza os dados diariamente.
          </p>
        </div>
      </SpotlightCard>
    );
  }

  return (
    <SpotlightCard>
      <h3 className="text-base font-semibold mb-4 text-muted-foreground flex items-center gap-2">
        <TrendingUp className="h-5 w-5" /> Tendência: Investimento vs Leads
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="spend"
            orientation="left"
            tickFormatter={(v: number) => `R$${(v / 1).toFixed(0)}`}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            width={65}
          />
          <YAxis
            yAxisId="leads"
            orientation="right"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            width={35}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => {
              if (name === "spend") return [fmtBRL(value), "Investimento"];
              return [value, "Leads"];
            }}
            labelFormatter={formatDate}
          />
          <Legend
            formatter={(value: string) => (value === "spend" ? "Investimento" : "Leads")}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Area
            yAxisId="spend"
            type="monotone"
            dataKey="spend"
            stroke="hsl(260, 60%, 55%)"
            fill="hsl(260, 60%, 55%)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Line
            yAxisId="leads"
            type="monotone"
            dataKey="leads"
            stroke="hsl(142, 71%, 45%)"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(142, 71%, 45%)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </SpotlightCard>
  );
}
