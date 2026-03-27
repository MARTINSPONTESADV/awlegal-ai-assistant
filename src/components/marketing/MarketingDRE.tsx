import { SpotlightCard } from "@/components/SpotlightCard";
import { fmtBRL } from "@/lib/financeiro";
import { Receipt } from "lucide-react";
import type { DREData } from "@/hooks/useMarketingData";

interface Props {
  data: DREData;
}

export default function MarketingDRE({ data }: Props) {
  const { receita, custo, lucro } = data;
  const isPositive = lucro >= 0;

  return (
    <SpotlightCard glowColor={isPositive ? "emerald" : "purple"}>
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
          <Receipt className="h-5 w-5" /> Mini DRE
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Receita (Honorários Recebidos)</span>
            <span className="text-sm font-bold text-emerald-500">{fmtBRL(receita)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Custo (Anúncios Meta)</span>
            <span className="text-sm font-bold text-red-400">- {fmtBRL(custo)}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm font-semibold">Resultado</span>
            <span className={`text-lg font-bold ${isPositive ? "text-emerald-500" : "text-red-400"}`}>
              {isPositive ? "" : "- "}{fmtBRL(Math.abs(lucro))}
            </span>
          </div>
        </div>
        {custo > 0 && (
          <div className="text-[11px] text-muted-foreground/70 border-t border-border/50 pt-2">
            Margem: {((lucro / (receita || 1)) * 100).toFixed(1)}% &nbsp;|&nbsp;
            ROAS: {receita > 0 ? (receita / custo).toFixed(2) : "0.00"}x
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}
