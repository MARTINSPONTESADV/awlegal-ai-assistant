import { SpotlightCard } from "@/components/SpotlightCard";
import { Filter } from "lucide-react";
import type { FunnelStage } from "@/hooks/useMarketingData";

interface Props {
  data: FunnelStage[];
}

export default function MarketingFunnel({ data }: Props) {
  const max = data[0]?.value || 1;

  return (
    <SpotlightCard glowColor="cyan">
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
          <Filter className="h-5 w-5" /> Funil de Conversão
        </h3>
        <div className="space-y-3">
          {data.map((stage, i) => {
            const pct = max > 0 ? (stage.value / max) * 100 : 0;
            const prevValue = i > 0 ? data[i - 1].value : null;
            const dropOff = prevValue && prevValue > 0
              ? ((1 - stage.value / prevValue) * 100).toFixed(1)
              : null;

            return (
              <div key={stage.label}>
                {i > 0 && dropOff && (
                  <div className="flex items-center gap-2 py-1 pl-4">
                    <div className="h-4 w-px bg-border" />
                    <span className="text-[10px] text-muted-foreground/60">
                      -{dropOff}% drop-off
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{stage.label}</span>
                    <span className="font-bold" style={{ color: stage.color }}>
                      {stage.value.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="h-6 w-full rounded-md bg-muted/30 overflow-hidden">
                    <div
                      className="h-full rounded-md transition-all duration-500"
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        backgroundColor: stage.color,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SpotlightCard>
  );
}
