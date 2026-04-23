import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, User, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCreateFinderAnalysis } from "@/hooks/useFinderAnalyses";
import { toast } from "sonner";

interface ClienteRow {
  id: string;
  nome_completo: string;
  cpf: string | null;
}

export interface FinderAnalysisPayload {
  banco: string;
  agencia?: string | null;
  conta?: string | null;
  periodo_label?: string | null;
  data_inicio_descontos?: string | null;
  data_fim_descontos?: string | null;
  valor_total_descontos?: number | null;
  valor_dobro?: number | null;
  rubricas?: string[];
  raw_grouped?: unknown;
  xlsxBlob?: Blob | null;
  xlsxFilename?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: FinderAnalysisPayload | null;
  onLinked?: (analysisId: string, clienteId: string) => void;
}

export function LinkClienteDialog({ open, onOpenChange, payload, onLinked }: Props) {
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const createMutation = useCreateFinderAnalysis();

  useEffect(() => {
    if (!open) return;
    setLoadingClientes(true);
    supabase
      .from("clientes")
      .select("id, nome_completo, cpf")
      .order("nome_completo", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Falha ao carregar clientes");
          setClientes([]);
        } else {
          setClientes((data || []) as ClienteRow[]);
        }
        setLoadingClientes(false);
      });
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedId("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientes.slice(0, 20);
    const digits = q.replace(/\D/g, "");
    return clientes
      .filter((c) => {
        const nameMatch = c.nome_completo.toLowerCase().includes(q);
        const cpfMatch = digits.length >= 3 && (c.cpf ?? "").replace(/\D/g, "").includes(digits);
        return nameMatch || cpfMatch;
      })
      .slice(0, 20);
  }, [clientes, search]);

  const selectedCliente = clientes.find((c) => c.id === selectedId) || null;

  const handleConfirm = async () => {
    if (!payload) {
      toast.error("Análise não disponível");
      return;
    }
    if (!selectedId) {
      toast.error("Selecione um cliente");
      return;
    }
    try {
      const result = await createMutation.mutateAsync({
        cliente_id: selectedId,
        banco: payload.banco,
        agencia: payload.agencia ?? null,
        conta: payload.conta ?? null,
        periodo_label: payload.periodo_label ?? null,
        data_inicio_descontos: payload.data_inicio_descontos ?? null,
        data_fim_descontos: payload.data_fim_descontos ?? null,
        valor_total_descontos: payload.valor_total_descontos ?? null,
        valor_dobro: payload.valor_dobro ?? null,
        rubricas: payload.rubricas ?? [],
        raw_grouped: payload.raw_grouped ?? null,
        xlsxBlob: payload.xlsxBlob ?? null,
        xlsxFilename: payload.xlsxFilename ?? null,
      });
      toast.success("Análise vinculada ao cliente");
      onLinked?.(result.id, selectedId);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar análise");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Vincular análise a um cliente</DialogTitle>
          <DialogDescription>
            Esta análise ficará salva e pode ser usada depois pelo AW Writer pra gerar a peça.
          </DialogDescription>
        </DialogHeader>

        {payload && (
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-xs space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span className="font-semibold uppercase tracking-wider">{payload.banco}</span>
              {payload.agencia && <span>· Ag. {payload.agencia}</span>}
              {payload.conta && <span>· Cta. {payload.conta}</span>}
            </div>
            {payload.periodo_label && (
              <div className="text-muted-foreground">Período: {payload.periodo_label}</div>
            )}
            {typeof payload.valor_total_descontos === "number" && (
              <div className="text-muted-foreground">
                Total: R$ {payload.valor_total_descontos.toFixed(2).replace(".", ",")} · Dobro: R${" "}
                {(payload.valor_dobro ?? payload.valor_total_descontos * 2).toFixed(2).replace(".", ",")}
              </div>
            )}
            {payload.rubricas && payload.rubricas.length > 0 && (
              <div className="text-muted-foreground">Rubricas: {payload.rubricas.join(", ")}</div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Buscar cliente
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome ou CPF"
              className="pl-9"
            />
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto rounded-lg border border-white/[0.06] divide-y divide-white/[0.04]">
          {loadingClientes ? (
            <div className="p-4 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando clientes…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum cliente encontrado
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/[0.04] transition-colors ${
                  selectedId === c.id ? "bg-violet-500/10 ring-1 ring-violet-500/40" : ""
                }`}
              >
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.nome_completo}</div>
                  {c.cpf && <div className="text-xs text-muted-foreground">{c.cpf}</div>}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground">
            {selectedCliente ? (
              <>
                Selecionado: <strong>{selectedCliente.nome_completo}</strong>
              </>
            ) : (
              "Selecione um cliente acima"
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedId || createMutation.isPending || !payload}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando…
                </>
              ) : (
                "Vincular e salvar"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
