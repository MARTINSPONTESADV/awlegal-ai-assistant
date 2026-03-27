import { useMarketingData } from "@/hooks/useMarketingData";
import { SpotlightCard } from "@/components/SpotlightCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Megaphone, Zap, RefreshCw } from "lucide-react";
import { useState } from "react";
import MarketingDateFilter from "./MarketingDateFilter";
import MarketingKPICards from "./MarketingKPICards";
import MarketingDRE from "./MarketingDRE";
import MarketingFunnel from "./MarketingFunnel";
import MarketingTrendChart from "./MarketingTrendChart";
import MarketingCampaignTable from "./MarketingCampaignTable";

export default function MarketingTab() {
  const mkt = useMarketingData();
  const [showInstructions, setShowInstructions] = useState(false);

  if (mkt.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Carregando dados de marketing...
      </div>
    );
  }

  // Empty state — no meta ads data AND no leads
  if (mkt.metaAdsCount === 0 && mkt.totalLeads === 0) {
    return (
      <>
        <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-blue-500" /> Configurar Meta Ads
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">Para conectar o Meta Ads ao sistema, voce precisara de:</p>
              <ol className="space-y-3 list-decimal list-inside text-muted-foreground">
                <li><span className="font-medium text-foreground">META_ACCESS_TOKEN</span> — System User Token do Meta Business Manager</li>
                <li><span className="font-medium text-foreground">META_AD_ACCOUNT_ID</span> — Ex: <code className="bg-muted px-1 rounded text-xs">act_123456789</code></li>
                <li>Configurar o workflow n8n de sync diario</li>
              </ol>
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                O workflow n8n sincroniza automaticamente todo dia as 8h os dados de campanhas.
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="space-y-6">
          <SpotlightCard>
            <div className="flex flex-col items-center text-center py-8 gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-500/10">
                <Megaphone className="h-10 w-10 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Conecte sua conta Meta Ads</h3>
                <p className="text-muted-foreground max-w-md text-sm">
                  Visualize CAC, CPL, ROI e funil de conversao — tudo sincronizado com suas campanhas do Facebook e Instagram.
                </p>
              </div>
              <Button onClick={() => setShowInstructions(true)} className="gap-2">
                <Zap className="h-4 w-4" /> Ver instrucoes de configuracao
              </Button>
            </div>
          </SpotlightCard>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <MarketingDateFilter
        preset={mkt.preset}
        onPreset={mkt.applyPreset}
        onCustomRange={mkt.applyCustomRange}
      />

      {/* KPI Cards */}
      <MarketingKPICards
        totalSpend={mkt.totalSpend}
        totalLeads={mkt.totalLeads}
        cpl={mkt.cpl}
        cac={mkt.cac}
        roi={mkt.roi}
        conversionRate={mkt.conversionRate}
        ltvEstimado={mkt.ltvEstimado}
      />

      {/* DRE + Funnel side by side */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <MarketingDRE data={mkt.dreData} />
        <MarketingFunnel data={mkt.funnelData} />
      </div>

      {/* Trend Chart */}
      <MarketingTrendChart data={mkt.dailyTrend} />

      {/* Campaign Table */}
      <MarketingCampaignTable
        campaigns={mkt.campaigns}
        avgCtr={mkt.avgCtr}
        bestCampaign={mkt.bestCampaign}
      />
    </div>
  );
}
