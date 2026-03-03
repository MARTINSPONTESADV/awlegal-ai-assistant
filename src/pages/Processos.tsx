import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Eye, Trash2, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface Processo {
  id: string; cliente_id: string; numero_processo: string | null; numero_cnj: string | null;
  partes_requeridas: string | null; status: string; situacao: string | null;
  valor_acordo: number | null; valor_execucao: number | null; valor_sentenca: number | null;
  status_pagamento_honorarios: string | null; prognostico: string | null; tipo_processo: string | null;
  fase_id: string | null; aux_fases?: { nome: string } | null; clientes?: { nome_completo: string } | null;
}

const FILTER_LABELS: Record<string, string> = {
  recebidos: "Honorários Pagos", areceber: "Total a Receber", areceber_acordos: "A Receber (Acordos)",
  areceber_execucoes: "A Receber (Execuções)", execucoes_recebidas: "Execuções Recebidas",
  acordos_recebidos: "Acordos Recebidos", acordos_receber: "A Receber: Acordos",
  execucoes_receber: "A Receber: Execuções", sentencas_tramitando: "Expectativa: Sentenças",
};

export default function Processos() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtroFinanceiro = searchParams.get("filtroFinanceiro");
  const filtroFase = searchParams.get("filtroFase");
  const filtroTipo = searchParams.get("filtroTipo");
  const filtroPrognostico = searchParams.get("filtroPrognostico");

  const fetchAll = useCallback(async () => {
    const { data } = await supabase.from("processos")
      .select("id, cliente_id, numero_processo, numero_cnj, partes_requeridas, status, situacao, valor_acordo, valor_execucao, valor_sentenca, status_pagamento_honorarios, prognostico, tipo_processo, fase_id, aux_fases(nome), clientes(nome_completo)")
      .order("created_at", { ascending: false });
    if (data) setProcessos(data as any);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const financiallyFiltered = useMemo(() => {
    if (!filtroFinanceiro) return processos;
    switch (filtroFinanceiro) {
      case "recebidos": return processos.filter(p => p.status_pagamento_honorarios === "Pago");
      case "areceber": return processos.filter(p => p.status_pagamento_honorarios !== "Pago" && (Number(p.valor_acordo || 0) > 0 || Number(p.valor_execucao || 0) > 0));
      case "areceber_acordos": return processos.filter(p => p.status_pagamento_honorarios !== "Pago" && Number(p.valor_acordo || 0) > 0);
      case "areceber_execucoes": return processos.filter(p => p.status_pagamento_honorarios !== "Pago" && Number(p.valor_execucao || 0) > 0);
      case "execucoes_recebidas": return processos.filter(p => p.status_pagamento_honorarios === "Pago" && Number(p.valor_execucao || 0) > 0);
      case "acordos_recebidos": return processos.filter(p => p.status_pagamento_honorarios === "Pago" && Number(p.valor_acordo || 0) > 0);
      case "acordos_receber": return processos.filter(p => p.status_pagamento_honorarios !== "Pago" && Number(p.valor_acordo || 0) > 0);
      case "execucoes_receber": return processos.filter(p => p.status_pagamento_honorarios !== "Pago" && Number(p.valor_execucao || 0) > 0);
      case "sentencas_tramitando": return processos.filter(p => Number(p.valor_sentenca || 0) > 0);
      default: return processos;
    }
  }, [processos, filtroFinanceiro]);

  const extraFiltered = useMemo(() => {
    let result = financiallyFiltered;
    if (filtroFase) result = result.filter(p => (p.aux_fases?.nome || "Sem fase") === filtroFase);
    if (filtroTipo) result = result.filter(p => p.tipo_processo === filtroTipo);
    if (filtroPrognostico) result = result.filter(p => p.prognostico === filtroPrognostico);
    return result;
  }, [financiallyFiltered, filtroFase, filtroTipo, filtroPrognostico]);

  const filtered = extraFiltered.filter((p) =>
    (p.numero_processo ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.numero_cnj ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.clientes?.nome_completo ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("processos").delete().eq("id", deleteId);
    if (error) { toast.error("Erro ao excluir processo"); return; }
    toast.success("Processo removido"); setDeleteId(null); fetchAll();
  };

  const clearFilter = (key: string) => { searchParams.delete(key); setSearchParams(searchParams); };
  const totalAtivos = processos.filter(p => p.situacao === "Ativo" || (!p.situacao && p.status === "ativo")).length;
  const totalInativos = processos.filter(p => p.situacao === "Inativo" || p.situacao === "Suspenso" || (!p.situacao && p.status !== "ativo")).length;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-3xl font-bold">Processos</h2>
        <Button onClick={() => navigate("/processos/novo")}><Plus className="h-4 w-4 mr-2" />Novo Processo</Button>
      </div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" /><span className="text-sm font-medium text-foreground">{totalAtivos} Ativos</span></div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5"><span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" /><span className="text-sm font-medium text-muted-foreground">{totalInativos} Inativos</span></div>
        {filtroFinanceiro && (<Button variant="outline" size="sm" onClick={() => clearFilter("filtroFinanceiro")} className="gap-2 border-primary/50 text-primary"><X className="h-3.5 w-3.5" />Filtro: {FILTER_LABELS[filtroFinanceiro] || filtroFinanceiro} — Limpar</Button>)}
        {filtroFase && (<Button variant="outline" size="sm" onClick={() => clearFilter("filtroFase")} className="gap-2 border-primary/50 text-primary"><X className="h-3.5 w-3.5" />Filtro: Fase {filtroFase} — Limpar</Button>)}
        {filtroTipo && (<Button variant="outline" size="sm" onClick={() => clearFilter("filtroTipo")} className="gap-2 border-primary/50 text-primary"><X className="h-3.5 w-3.5" />Filtro: Tipo {filtroTipo} — Limpar</Button>)}
        {filtroPrognostico && (<Button variant="outline" size="sm" onClick={() => clearFilter("filtroPrognostico")} className="gap-2 border-primary/50 text-primary"><X className="h-3.5 w-3.5" />Filtro: Prognóstico {filtroPrognostico} — Limpar</Button>)}
      </div>
      <Card>
        <CardHeader><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por nº, CNJ ou cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nº Processo</TableHead><TableHead>Cliente</TableHead><TableHead className="hidden md:table-cell">Partes Requeridas</TableHead><TableHead>Situação</TableHead><TableHead className="w-16">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/processos/${p.id}`)}>
                  <TableCell className="font-medium hover:underline">{p.numero_processo || p.numero_cnj || "—"}</TableCell>
                  <TableCell>{p.clientes?.nome_completo ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{p.partes_requeridas || "—"}</TableCell>
                  <TableCell><Badge variant={(p.situacao === "Ativo" || p.status === "ativo") ? "default" : "secondary"}>{p.situacao || (p.status === "ativo" ? "Ativo" : "Arquivado")}</Badge></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/processos/${p.id}`)}><Eye className="h-4 w-4" /></Button>
                      {isAdmin && (<Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4" /></Button>)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum processo encontrado.</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita e apagará todos os dados vinculados a este processo.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
