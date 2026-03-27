import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseMarketing } from "@/integrations/supabase/clientMarketing";
import { calcEscritorio } from "@/lib/financeiro";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface MetaAdsRow {
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

interface LeadRow {
  whatsapp_numero: string;
  canal: string | null;
  created_at: string | null;
  excluido: boolean | null;
}

interface ProcessoRow {
  id: string;
  created_at: string | null;
  data_distribuicao: string | null;
  situacao: string | null;
  valor_causa: number | null;
  valor_acordo: number | null;
  valor_execucao: number | null;
  valor_sentenca: number | null;
  honorarios_percentual: number | null;
  status_pagamento_honorarios: string | null;
}

export interface CampaignAgg {
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  reach: number;
  cpc: number[];
  ctr: number[];
}

export interface DREData {
  receita: number;
  custo: number;
  lucro: number;
}

export interface FunnelStage {
  label: string;
  value: number;
  color: string;
}

export interface DailyTrend {
  date: string;
  spend: number;
  leads: number;
}

const PRESETS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: 3650,
} as const;

export type PresetKey = keyof typeof PRESETS;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function useMarketingData() {
  const [metaAds, setMetaAds] = useState<MetaAdsRow[]>([]);
  const [allLeads, setAllLeads] = useState<LeadRow[]>([]);
  const [allProcessos, setAllProcessos] = useState<ProcessoRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preset, setPreset] = useState<PresetKey>("all");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: daysAgo(PRESETS.all),
    to: new Date(),
  });

  const applyPreset = (key: PresetKey) => {
    setPreset(key);
    setDateRange({ from: daysAgo(PRESETS[key]), to: new Date() });
  };

  const applyCustomRange = (from: Date, to: Date) => {
    setPreset("all");
    setDateRange({ from, to });
  };

  useEffect(() => {
    const load = async () => {
      const [{ data: m }, { data: l }, { data: p }] = await Promise.all([
        supabaseMarketing
          .from("meta_ads_insights")
          .select("date, campaign_id, campaign_name, adset_name, spend, impressions, clicks, reach, cpc, ctr, cpm, leads")
          .order("date", { ascending: false })
          .limit(5000),
        supabase
          .from("controle_bot")
          .select("whatsapp_numero, canal, created_at, excluido") as any,
        supabase
          .from("processos")
          .select("id, created_at, data_distribuicao, situacao, valor_causa, valor_acordo, valor_execucao, valor_sentenca, honorarios_percentual, status_pagamento_honorarios"),
      ]);
      if (m) setMetaAds(m as MetaAdsRow[]);
      if (l) setAllLeads(l as LeadRow[]);
      if (p) setAllProcessos(p as ProcessoRow[]);
      setIsLoading(false);
    };
    load();
  }, []);

  // Filtered data by date range
  const fromStr = toDateStr(dateRange.from);
  const toStr = toDateStr(dateRange.to);

  const filteredAds = useMemo(
    () => metaAds.filter((r) => r.date >= fromStr && r.date <= toStr),
    [metaAds, fromStr, toStr]
  );

  const filteredLeads = useMemo(
    () =>
      allLeads.filter((l) => {
        if (l.excluido) return false;
        if (!l.created_at) return true; // legacy rows always included
        const d = l.created_at.slice(0, 10);
        return d >= fromStr && d <= toStr;
      }),
    [allLeads, fromStr, toStr]
  );

  const filteredProcessos = useMemo(
    () =>
      allProcessos.filter((p) => {
        const d = (p.data_distribuicao || p.created_at || "").slice(0, 10);
        if (!d) return true;
        return d >= fromStr && d <= toStr;
      }),
    [allProcessos, fromStr, toStr]
  );

  // KPIs
  const totalSpend = useMemo(
    () => filteredAds.reduce((s, r) => s + Number(r.spend || 0), 0),
    [filteredAds]
  );
  const totalLeads = filteredLeads.length;
  const totalProcessos = filteredProcessos.length;
  const totalImpressions = useMemo(
    () => filteredAds.reduce((s, r) => s + Number(r.impressions || 0), 0),
    [filteredAds]
  );
  const totalClicks = useMemo(
    () => filteredAds.reduce((s, r) => s + Number(r.clicks || 0), 0),
    [filteredAds]
  );
  const totalReach = useMemo(
    () => filteredAds.reduce((s, r) => s + Number(r.reach || 0), 0),
    [filteredAds]
  );

  const cpl = totalLeads > 0 ? totalSpend / totalLeads : null;
  const cac = totalProcessos > 0 ? totalSpend / totalProcessos : null;

  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null;
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : null;

  // Revenue for ROI and DRE
  const receitaHonorarios = useMemo(() => {
    return filteredProcessos
      .filter((p) => p.status_pagamento_honorarios === "Pago")
      .reduce((s, p) => {
        const base = Number(p.valor_execucao || 0) || Number(p.valor_acordo || 0);
        return s + calcEscritorio(base, Number(p.honorarios_percentual || 0));
      }, 0);
  }, [filteredProcessos]);

  const roi = totalSpend > 0 ? ((receitaHonorarios - totalSpend) / totalSpend) * 100 : null;
  const conversionRate = totalLeads > 0 ? (totalProcessos / totalLeads) * 100 : null;

  const ltvEstimado = useMemo(() => {
    const processosComValor = filteredProcessos.filter(
      (p) => Number(p.valor_causa || 0) > 0 && Number(p.honorarios_percentual || 0) > 0
    );
    if (processosComValor.length === 0) return null;
    const avgCausa =
      processosComValor.reduce((s, p) => s + Number(p.valor_causa || 0), 0) /
      processosComValor.length;
    const avgPct =
      processosComValor.reduce((s, p) => s + Number(p.honorarios_percentual || 0), 0) /
      processosComValor.length;
    return avgCausa * (avgPct / 100);
  }, [filteredProcessos]);

  // DRE
  const dreData: DREData = {
    receita: receitaHonorarios,
    custo: totalSpend,
    lucro: receitaHonorarios - totalSpend,
  };

  // Funnel
  const funnelData: FunnelStage[] = [
    { label: "Impressões", value: totalImpressions, color: "hsl(210, 80%, 55%)" },
    { label: "Cliques", value: totalClicks, color: "hsl(260, 60%, 55%)" },
    { label: "Leads", value: totalLeads, color: "hsl(142, 71%, 45%)" },
    { label: "Processos", value: totalProcessos, color: "hsl(30, 80%, 50%)" },
  ];

  // Daily trend
  const dailyTrend: DailyTrend[] = useMemo(() => {
    const map: Record<string, { spend: number; leads: number }> = {};
    filteredAds.forEach((r) => {
      if (!map[r.date]) map[r.date] = { spend: 0, leads: 0 };
      map[r.date].spend += Number(r.spend || 0);
    });
    // Count leads by date (excluding backfilled sentinel dates)
    filteredLeads.forEach((l) => {
      if (!l.created_at) return;
      const d = l.created_at.slice(0, 10);
      if (d === "2026-01-01") return; // skip backfilled sentinel
      if (!map[d]) map[d] = { spend: 0, leads: 0 };
      map[d].leads += 1;
    });
    return Object.entries(map)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredAds, filteredLeads]);

  // Campaign aggregation
  const campaigns: CampaignAgg[] = useMemo(() => {
    const cmap: Record<string, CampaignAgg> = {};
    filteredAds.forEach((r) => {
      const key = r.campaign_id;
      if (!cmap[key])
        cmap[key] = { name: r.campaign_name || r.campaign_id, spend: 0, impressions: 0, clicks: 0, leads: 0, reach: 0, cpc: [], ctr: [] };
      cmap[key].spend += Number(r.spend || 0);
      cmap[key].impressions += Number(r.impressions || 0);
      cmap[key].clicks += Number(r.clicks || 0);
      cmap[key].leads += Number(r.leads || 0);
      cmap[key].reach += Number(r.reach || 0);
      if (r.cpc) cmap[key].cpc.push(Number(r.cpc));
      if (r.ctr) cmap[key].ctr.push(Number(r.ctr));
    });
    return Object.values(cmap).sort((a, b) => b.spend - a.spend);
  }, [filteredAds]);

  const bestCampaign = useMemo(() => {
    if (campaigns.length < 2) return null;
    return campaigns.reduce((best, c) => {
      const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
      const bestCtr = best.impressions > 0 ? (best.clicks / best.impressions) * 100 : 0;
      return ctr > bestCtr ? c : best;
    });
  }, [campaigns]);

  return {
    // State
    isLoading,
    dateRange,
    preset,
    applyPreset,
    applyCustomRange,
    // Raw counts
    metaAdsCount: metaAds.length,
    totalSpend,
    totalLeads,
    totalProcessos,
    totalImpressions,
    totalClicks,
    totalReach,
    // Computed KPIs
    cpl,
    cac,
    roi,
    conversionRate,
    ltvEstimado,
    avgCtr,
    avgCpc,
    receitaHonorarios,
    // Sections
    dreData,
    funnelData,
    dailyTrend,
    campaigns,
    bestCampaign,
  };
}
