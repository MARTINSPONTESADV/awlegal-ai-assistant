import { useEffect, useState } from "react";
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
  raw_grouped: unknown;
}

function toWriterCliente(c: ClienteRow) {
  return {
    id: c.id,
    nome_completo: c.nome_completo || "",
    nacionalidade: c.nacionalidade || "brasileiro(a)",
    estado_civil: c.estado_civil || "",
    profissao: c.profissao || "",
    rg: c.rg || "",
    orgao_expedidor: c.orgao_expedidor || "",
    cpf: c.cpf || "",
    endereco_completo: c.endereco_cep || "",
  };
}

export default function WriterApp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const analiseId = searchParams.get("analise");
  const clienteIdParam = searchParams.get("cliente");
  const [prefillReady, setPrefillReady] = useState<boolean>(false);
  const [prefillError, setPrefillError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState<number>(0);

  useEffect(() => { document.title = "AW Writer — AW ECO"; }, []);

  // Sempre carrega lista de clientes pra substituir o CLIENTES_MOCK do Writer —
  // usuário vê clientes reais mesmo sem prefill. Bloqueia o iframe até o
  // sessionStorage estar populado, senão o Writer inicia com os mocks.
  useEffect(() => {
    let cancelled = false;
    setPrefillReady(false);

    const run = async () => {
      try {
        const { data: clientesData, error: clientesErr } = await supabase
          .from("clientes")
          .select("id, nome_completo, cpf, nacionalidade, estado_civil, profissao, rg, orgao_expedidor, endereco_cep")
          .order("nome_completo", { ascending: true });
        if (clientesErr) throw clientesErr;
        const clientesList = (clientesData || []).map(toWriterCliente);

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
          const found = (clientesData || []).find((c) => c.id === resolvedClienteId);
          cliente = (found as ClienteRow) || null;
          if (!cliente) {
            const { data, error } = await supabase
              .from("clientes")
              .select("id, nome_completo, cpf, nacionalidade, estado_civil, profissao, rg, orgao_expedidor, endereco_cep")
              .eq("id", resolvedClienteId)
              .maybeSingle();
            if (error) throw error;
            cliente = data as ClienteRow | null;
          }
        }

        let xlsxBase64: string | null = null;
        if (analise?.xlsx_storage_path) {
          xlsxBase64 = await fetchFinderAnalysisXlsxBase64(analise.xlsx_storage_path);
        }

        // rubricasDetalhadas vêm de analise.raw_grouped (estrutura rica)
        let rubricasDetalhadas: unknown[] = [];
        if (analise?.raw_grouped && typeof analise.raw_grouped === "object") {
          const rg = analise.raw_grouped as { rubricasDetalhadas?: unknown[] };
          if (Array.isArray(rg.rubricasDetalhadas)) {
            rubricasDetalhadas = rg.rubricasDetalhadas;
          }
        }

        const payload = {
          clientesList,
          cliente: cliente ? toWriterCliente(cliente) : null,
          pacote3: analise
            ? {
                numero_agencia: analise.agencia || "",
                numero_conta: analise.conta || "",
              }
            : null,
          rubricasDetalhadas,
          xlsxBase64,
          xlsxFilename: analise?.xlsx_filename || "finder-analise.xlsx",
        };

        sessionStorage.setItem(PREFILL_STORAGE_KEY, JSON.stringify(payload));
        if (!cancelled) {
          setIframeKey((k) => k + 1);
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
          key={iframeKey}
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
