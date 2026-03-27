import { SpotlightCard } from "@/components/SpotlightCard";
import { fmtBRL } from "@/lib/financeiro";
import {
  DollarSign, Users, MousePointerClick, TrendingUp,
  Percent, Target, Sparkles,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface Props {
  totalSpend: number;
  totalLeads: number;
  cpl: number | null;
  cac: number | null;
  roi: number | null;
  conversionRate: number | null;
  ltvEstimado: number | null;
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-3 w-3 text-muted-foreground/60 cursor-help inline ml-1" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

function KPICard({
  label, value, icon: Icon, color, tooltip, glowColor,
}: {
  label: string; value: string; icon: any; color: string;
  tooltip?: string; glowColor?: "purple" | "cyan" | "emerald";
}) {
  return (
    <SpotlightCard glowColor={glowColor}>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl shrink-0"
          style={{ backgroundColor: `${color}20` }}>
          <Icon className="h-7 w-7" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold tracking-tight truncate">{value}</p>
          <p className="text-xs text-muted-foreground flex items-center">
            {label}{tooltip && <InfoTip text={tooltip} />}
          </p>
        </div>
      </div>
    </SpotlightCard>
  );
}

export default function MarketingKPICards(props: Props) {
  const { totalSpend, totalLeads, cpl, cac, roi, conversionRate, ltvEstimado } = props;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Investimento Total" value={fmtBRL(totalSpend)}
          icon={DollarSign} color="hsl(210, 80%, 55%)" glowColor="purple"
          tooltip="Total gasto em anúncios Meta no período selecionado"
        />
        <KPICard
          label="Leads Gerados" value={totalLeads.toLocaleString("pt-BR")}
          icon={Users} color="hsl(142, 71%, 45%)" glowColor="emerald"
          tooltip="Contatos via WhatsApp gerados pelos anúncios (controle_bot)"
        />
        <KPICard
          label="CPL (Custo/Lead)" value={cpl !== null ? fmtBRL(cpl) : "—"}
          icon={MousePointerClick} color="hsl(260, 60%, 55%)" glowColor="purple"
          tooltip="Custo por Lead = Investimento / Leads"
        />
        <KPICard
          label="CAC (Custo/Cliente)" value={cac !== null ? fmtBRL(cac) : "—"}
          icon={TrendingUp} color="hsl(30, 80%, 50%)" glowColor="cyan"
          tooltip="Custo de Aquisição de Cliente = Investimento / Processos abertos"
        />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <KPICard
          label="ROI" value={roi !== null ? `${roi.toFixed(1)}%` : "—"}
          icon={Target} color={roi !== null && roi >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 60%, 50%)"}
          glowColor={roi !== null && roi >= 0 ? "emerald" : "purple"}
          tooltip="Retorno sobre Investimento = (Honorários Recebidos - Investimento) / Investimento × 100"
        />
        <KPICard
          label="Taxa de Conversão" value={conversionRate !== null ? `${conversionRate.toFixed(1)}%` : "—"}
          icon={Percent} color="hsl(200, 60%, 50%)" glowColor="cyan"
          tooltip="Percentual de leads que viraram processos = Processos / Leads × 100"
        />
        <KPICard
          label="LTV Estimado" value={ltvEstimado !== null ? fmtBRL(ltvEstimado) : "—"}
          icon={Sparkles} color="hsl(45, 80%, 50%)" glowColor="purple"
          tooltip="Lifetime Value = Média do valor de causa × Média do percentual de honorários"
        />
      </div>
    </div>
  );
}
