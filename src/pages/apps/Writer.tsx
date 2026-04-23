import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchFinderAnalysisXlsxBase64 } from "@/hooks/useFinderAnalyses";
import { toast } from "sonner";

const PREFILL_STORAGE_KEY = "aw-writer:prefill";

interface ClienteRow {
  id: string;
  nome_completo: string;
  cpf: string | null;
  nacionalidade: string | null;
  estado_civil: string | null;
  profissao: string | null;
  rg: string | null;
  orgao_expedidor: string | null;
  endereco_cep: string | null;
}

interface FinderAnalysisRow {
  id: string;
  cliente_id: string;
  banco: string;
  agencia: string | null;
  conta: string | null;
  data_inicio_descontos: string | null;
  data_fim_descontos: string | null;
  valor_total_descontos: number | null;
  valor_dobro: number | null;
  rubricas: unknown;
  xlsx_storage_path: string | null;
  xlsx_filename: string | null;
}

function isoToBR(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function formatBRL(n: number | null): string {
  if (n == null) return "";
  return n.toFixed(2).replace(".", ",");
}

export default function WriterApp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const analiseId = searchParams.get("analise");
  const clienteIdParam = searchParams.get("cliente");
  const [prefillReady, setPrefillReady] = useState<boolean>(!analiseId && !clienteIdParam);
  const [prefillError, setPrefillError] = useState<string | null>(null);
  const iframeKey = useRef(0);

  useEffect(() => { document.title = "AW Writer — AW ECO"; }, []);

  useEffect(() => {
    if (!analiseId && !clienteIdParam) return;
    let cancelled = false;

    const run = async () => {
      try {
        let cliente: ClienteRow | null = null;
        let analise: FinderAnalysisRow | null = null;

        if (analiseId) {
          const { data, error } = await supabase
            .from("finder_analyses")
            .select("*")
            .eq("id", analiseId)
            .maybeSingle();
          if (error) throw error;
          analise = data as FinderAnalysisRow | null;
        }

        const resolvedClienteId = clienteIdParam || analise?.cliente_id || null;
        if (resolvedClienteId) {
          const { data, error } = await supabase
            .from("clientes")
            .select("id, nome_completo, cpf, nacionalidade, estado_civil, profissao, rg, orgao_expedidor, endereco_cep")
            .eq("id", resolvedClienteId)
            .maybeSingle();
          if (error) throw error;
          cliente = data as ClienteRow | null;
        }

        if (!cliente && !analise) {
          throw new Error("Nada encontrado pra preencher");
        }

        let xlsxBase64: string | null = null;
        if (analise?.xlsx_storage_path) {
          xlsxBase64 = await fetchFinderAnalysisXlsxBase64(analise.xlsx_storage_path);
        }

        const payload = {
          cliente: cliente
            ? {
                nome_completo: cliente.nome_completo || "",
                nacionalidade: cliente.nacionalidade || "brasileiro(a)",
                estado_civil: cliente.estado_civil || "",
                profissao: cliente.profissao || "",
                rg: cliente.rg || "",
                orgao_expedidor: cliente.orgao_expedidor || "",
                cpf: cliente.cpf || "",
                endereco_completo: cliente.endereco_cep || "",
              }
            : null,
          pacote3: analise
            ? {
                agencia: analise.agencia || "",
                conta_corrente: analise.conta || "",
                data_inicio_descontos: isoToBR(analise.data_inicio_descontos),
                data_fim_descontos: isoToBR(analise.data_fim_descontos),
                valor_total_descontos: formatBRL(analise.valor_total_descontos),
                valor_dano_moral: "",
              }
            : null,
          rubricas: Array.isArray(analise?.rubricas) ? (analise?.rubricas as string[]) : [],
          xlsxBase64,
          xlsxFilename: analise?.xlsx_filename || "finder-analise.xlsx",
        };

        sessionStorage.setItem(PREFILL_STORAGE_KEY, JSON.stringify(payload));
        if (!cancelled) {
          iframeKey.current += 1;
          setPrefillReady(true);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao carregar dados";
        if (!cancelled) {
          setPrefillError(msg);
          toast.error(msg);
          setPrefillReady(true);
        }
      }
    };

    run();
    return () => { cancelled = true; };
  }, [analiseId, clienteIdParam]);

  return (
    <div className="h-full flex flex-col -mx-3 -my-3 sm:-mx-6 sm:-my-6">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-background/80 backdrop-blur shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/pre-protocolo")} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Pré-Protocolo
        </Button>
        <div className="flex items-center gap-2">
          {(analiseId || clienteIdParam) && (
            <span className="text-xs text-violet-400">Prefill ativo</span>
          )}
          <span className="text-xs text-muted-foreground hidden sm:inline">AW WRITER · integrado</span>
          <a
            href="https://aw-writer.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
            title="Abrir versão de produção"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      {!prefillReady ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando dados do cliente e análise…
          </div>
        </div>
      ) : (
        <iframe
          key={iframeKey.current}
          src="/apps/writer/index.html"
          title="AW Writer"
          className="flex-1 w-full border-0"
          style={{ minHeight: "calc(100vh - 120px)" }}
        />
      )}
      {prefillError && (
        <div className="px-4 py-2 text-xs text-red-400 border-t border-red-500/20 bg-red-500/5">
          Erro no prefill: {prefillError}. Você ainda pode preencher manualmente.
        </div>
      )}
    </div>
  );
}
