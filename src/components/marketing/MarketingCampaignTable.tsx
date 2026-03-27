import { useState } from "react";
import { SpotlightCard } from "@/components/SpotlightCard";
import { fmtBRL } from "@/lib/financeiro";
import { ArrowUpDown } from "lucide-react";
import type { CampaignAgg } from "@/hooks/useMarketingData";

interface Props {
  campaigns: CampaignAgg[];
  avgCtr: number | null;
  bestCampaign: CampaignAgg | null;
}

type SortKey = "name" | "spend" | "reach" | "impressions" | "clicks" | "ctr" | "cpm" | "cpc";

function getCtr(c: CampaignAgg) {
  return c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
}

export default function MarketingCampaignTable({ campaigns, avgCtr, bestCampaign }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortAsc, setSortAsc] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...campaigns].sort((a, b) => {
    let va: number, vb: number;
    switch (sortKey) {
      case "name": return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      case "ctr": va = getCtr(a); vb = getCtr(b); break;
      case "cpm": va = a.impressions > 0 ? (a.spend / a.impressions) * 1000 : 0; vb = b.impressions > 0 ? (b.spend / b.impressions) * 1000 : 0; break;
      case "cpc": va = a.clicks > 0 ? a.spend / a.clicks : 0; vb = b.clicks > 0 ? b.spend / b.clicks : 0; break;
      default: va = a[sortKey] as number; vb = b[sortKey] as number;
    }
    return sortAsc ? va - vb : vb - va;
  });

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="text-right py-2 px-3 cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => toggleSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k && <ArrowUpDown className="h-3 w-3" />}
      </span>
    </th>
  );

  return (
    <div className="space-y-3">
      {bestCampaign && (() => {
        const ctr = getCtr(bestCampaign);
        return (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm">
            <span className="text-base">&#127942;</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Melhor CTR:</span>
            <span className="text-foreground truncate">"{bestCampaign.name}"</span>
            <span className="text-muted-foreground ml-auto shrink-0">{ctr.toFixed(2)}%</span>
          </div>
        );
      })()}

      <SpotlightCard>
        <h3 className="text-base font-semibold mb-4 text-muted-foreground">Detalhamento por Campanha</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="text-left py-2 pr-4 cursor-pointer select-none hover:text-foreground"
                  onClick={() => toggleSort("name")}>
                  Campanha {sortKey === "name" && <ArrowUpDown className="h-3 w-3 inline" />}
                </th>
                <SortHeader label="Gasto" k="spend" />
                <SortHeader label="Alcance" k="reach" />
                <SortHeader label="Impressões" k="impressions" />
                <SortHeader label="Cliques" k="clicks" />
                <SortHeader label="CTR" k="ctr" />
                <SortHeader label="CPM" k="cpm" />
                <SortHeader label="CPC" k="cpc" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const ctr = getCtr(c);
                const cpc = c.clicks > 0 ? c.spend / c.clicks : null;
                const cpm = c.impressions > 0 ? (c.spend / c.impressions) * 1000 : null;
                const aboveAvg = avgCtr !== null && ctr > avgCtr;
                const belowAvg = avgCtr !== null && c.impressions > 0 && ctr < avgCtr;
                return (
                  <tr key={c.name} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 pr-4 font-medium max-w-[200px] truncate">{c.name}</td>
                    <td className="text-right py-2 px-3 font-mono text-xs">{fmtBRL(c.spend)}</td>
                    <td className="text-right py-2 px-3 text-xs">{c.reach.toLocaleString("pt-BR")}</td>
                    <td className="text-right py-2 px-3 text-xs">{c.impressions.toLocaleString("pt-BR")}</td>
                    <td className="text-right py-2 px-3 text-xs">{c.clicks.toLocaleString("pt-BR")}</td>
                    <td className={`text-right py-2 px-3 text-xs font-medium ${aboveAvg ? "text-emerald-500" : belowAvg ? "text-red-400" : ""}`}>
                      {c.impressions > 0 ? `${ctr.toFixed(2)}%` : "—"}
                    </td>
                    <td className="text-right py-2 px-3 font-mono text-xs">{cpm !== null ? fmtBRL(cpm) : "—"}</td>
                    <td className="text-right py-2 px-3 font-mono text-xs">{cpc !== null ? fmtBRL(cpc) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SpotlightCard>
    </div>
  );
}
