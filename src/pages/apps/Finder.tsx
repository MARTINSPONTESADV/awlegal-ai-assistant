import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Link2 } from "lucide-react";
import { LinkClienteDialog, type FinderAnalysisPayload } from "@/components/finder/LinkClienteDialog";
// @ts-expect-error - Finder é JSX sem types, integração direta
import FinderApp from "@/apps/finder/App.jsx";

interface RubricaItem {
  data: string;
  dataISO: string | null;
  valor: number;
  descricao: string;
}

interface RubricaDetalhada {
  id: string;
  label: string;
  total: number;
  dataInicioISO: string | null;
  dataFimISO: string | null;
  items: RubricaItem[];
}

interface FinderAnalysisEventDetail {
  meta?: {
    banco?: string;
    agencia?: string;
    conta?: string;
    periodo?: string;
  };
  grouped?: Record<string, unknown>;
  rubricas?: string[];
  rubricasDetalhadas?: RubricaDetalhada[];
  totalDescontos?: number;
  fileName?: string;
  buildXlsxBlob?: () => Promise<Blob | null>;
  periodoISO?: { inicio?: string | null; fim?: string | null };
}

function isoToBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

export default function FinderPage() {
  useEffect(() => { document.title = "AW Finder — AW ECO"; }, []);
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<FinderAnalysisEventDetail | null>(null);
  const [payload, setPayload] = useState<FinderAnalysisPayload | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preparingPayload, setPreparingPayload] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<FinderAnalysisEventDetail>).detail;
      setAnalysis(detail || null);
    };
    const resetHandler = () => setAnalysis(null);
    window.addEventListener("aw-finder:analysis-ready", handler as EventListener);
    window.addEventListener("aw-finder:reset", resetHandler);
    return () => {
      window.removeEventListener("aw-finder:analysis-ready", handler as EventListener);
      window.removeEventListener("aw-finder:reset", resetHandler);
    };
  }, []);

  const openLinkDialog = useCallback(async () => {
    if (!analysis) return;
    setPreparingPayload(true);
    try {
      const xlsxBlob = analysis.buildXlsxBlob ? await analysis.buildXlsxBlob() : null;
      const totalDescontos = analysis.totalDescontos ?? 0;
      const rubricas = analysis.rubricas ?? [];
      const inicioISO = analysis.periodoISO?.inicio || null;
      const fimISO = analysis.periodoISO?.fim || null;
      const metaPeriodo = analysis.meta?.periodo;
      const periodoLabelFromISO =
        inicioISO && fimISO ? `${isoToBR(inicioISO)} a ${isoToBR(fimISO)}` : null;
      const periodoLabel =
        metaPeriodo && metaPeriodo !== "—" ? metaPeriodo : periodoLabelFromISO;
      setPayload({
        banco: analysis.meta?.banco || "DESCONHECIDO",
        agencia: analysis.meta?.agencia || null,
        conta: analysis.meta?.conta || null,
        periodo_label: periodoLabel,
        data_inicio_descontos: inicioISO,
        data_fim_descontos: fimISO,
        valor_total_descontos: totalDescontos || null,
        valor_dobro: totalDescontos ? totalDescontos * 2 : null,
        rubricas,
        raw_grouped: {
          rubricasDetalhadas: analysis.rubricasDetalhadas ?? [],
          meta: analysis.meta ?? {},
          fileName: analysis.fileName ?? null,
        },
        xlsxBlob,
        xlsxFilename: analysis.fileName || "finder-analise.xlsx",
      });
      setDialogOpen(true);
    } finally {
      setPreparingPayload(false);
    }
  }, [analysis]);

  const handleLinked = useCallback(
    (analysisId: string) => {
      navigate(`/pre-protocolo/writer?analise=${analysisId}`);
    },
    [navigate]
  );

  return (
    <div className="h-full flex flex-col -mx-3 -my-3 sm:-mx-6 sm:-my-6">
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-white/[0.06] bg-background/80 backdrop-blur shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/pre-protocolo")} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Pré-Protocolo
        </Button>
        <div className="flex items-center gap-2">
          {analysis && (
            <Button
              size="sm"
              onClick={openLinkDialog}
              disabled={preparingPayload}
              className="gap-1.5"
            >
              <Link2 className="h-3.5 w-3.5" />
              {preparingPayload ? "Preparando…" : "Vincular cliente"}
            </Button>
          )}
          <span className="text-xs text-muted-foreground hidden sm:inline">AW FINDER · integrado</span>
          <a
            href="https://aw-finder.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
            title="Abrir versão de produção"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <FinderApp />
      </div>
      <LinkClienteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        payload={payload}
        onLinked={handleLinked}
      />
    </div>
  );
}
