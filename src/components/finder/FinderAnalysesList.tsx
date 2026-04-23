import { useNavigate } from "react-router-dom";
import { useFinderAnalyses } from "@/hooks/useFinderAnalyses";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, PenLine, Loader2, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatBRL(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FinderAnalysesList() {
  const { data: analyses, isLoading } = useFinderAnalyses();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando análises…
      </div>
    );
  }

  if (!analyses || analyses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/[0.08] p-6 text-center text-sm text-muted-foreground">
        Nenhuma análise vinculada ainda. Comece pelo AW FINDER, analise o extrato e clique em{" "}
        <strong>Vincular cliente</strong>.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {analyses.map((a) => (
        <div
          key={a.id}
          className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors flex items-center gap-3"
        >
          <div className="h-10 w-10 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-5 w-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {a.cliente ? (
                <span className="text-sm font-medium flex items-center gap-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                  {a.cliente.nome_completo}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground italic">(cliente removido)</span>
              )}
              <Badge variant="outline" className="uppercase text-[10px] tracking-wider">
                {a.banco}
              </Badge>
              {a.agencia && (
                <span className="text-xs text-muted-foreground">Ag. {a.agencia}</span>
              )}
              {a.conta && (
                <span className="text-xs text-muted-foreground">Cta. {a.conta}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
              <span>Total: {formatBRL(a.valor_total_descontos)}</span>
              <span>Dobro: {formatBRL(a.valor_dobro)}</span>
              <span>
                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5 shrink-0"
            onClick={() => navigate(`/pre-protocolo/writer?analise=${a.id}`)}
          >
            <PenLine className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Gerar peça</span>
          </Button>
        </div>
      ))}
    </div>
  );
}
