import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarIcon, Search, X, EyeOff, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function Publicacoes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dataInicial, setDataInicial] = useState<Date | undefined>();
  const [dataFinal, setDataFinal] = useState<Date | undefined>();
  const [cliente, setCliente] = useState("");
  const [numProcesso, setNumProcesso] = useState("");
  const [orgao, setOrgao] = useState("");
  const [statusLeitura, setStatusLeitura] = useState("todas");
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({});
  const [selectedMov, setSelectedMov] = useState<any | null>(null);

  const handlePesquisar = () => { setActiveFilters({ dataInicial, dataFinal, cliente, numProcesso, orgao, statusLeitura }); };
  const handleLimpar = () => { setDataInicial(undefined); setDataFinal(undefined); setCliente(""); setNumProcesso(""); setOrgao(""); setStatusLeitura("todas"); setActiveFilters({}); };
  const handleNaoVisualizadas = () => { setStatusLeitura("nao_lidas"); setActiveFilters((prev) => ({ ...prev, statusLeitura: "nao_lidas" })); };

  const { data: movimentacoes = [], isLoading } = useQuery({
    queryKey: ["movimentacoes", activeFilters],
    queryFn: async () => {
      let query = supabase.from("movimentacoes").select("*, processos!inner(id, numero_cnj, numero_processo, clientes!inner(nome_completo))").order("data_movimentacao", { ascending: false });
      const f = activeFilters as { dataInicial?: Date; dataFinal?: Date; cliente?: string; numProcesso?: string; orgao?: string; statusLeitura?: string; };
      if (f.dataInicial) query = query.gte("data_movimentacao", format(f.dataInicial, "yyyy-MM-dd"));
      if (f.dataFinal) query = query.lte("data_movimentacao", format(f.dataFinal, "yyyy-MM-dd"));
      if (f.cliente) query = query.ilike("processos.clientes.nome_completo", `%${f.cliente}%`);
      if (f.numProcesso) { query = query.or(`numero_cnj.ilike.%${f.numProcesso}%,numero_processo.ilike.%${f.numProcesso}%`, { referencedTable: "processos" }); }
      if (f.orgao) query = query.ilike("orgao", `%${f.orgao}%`);
      if (f.statusLeitura === "lidas") query = query.eq("lida", true);
      else if (f.statusLeitura === "nao_lidas") query = query.eq("lida", false);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const toggleLida = useMutation({
    mutationFn: async ({ id, lida }: { id: string; lida: boolean }) => { const { error } = await supabase.from("movimentacoes").update({ lida: !lida }).eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["movimentacoes"] }); toast.success("Status atualizado"); },
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Publicações" }]} />
      <Tabs defaultValue="publicacoes">
        <TabsList><TabsTrigger value="publicacoes">Publicações</TabsTrigger><TabsTrigger value="cargas" disabled>Cargas</TabsTrigger></TabsList>
        <TabsContent value="publicacoes" className="space-y-6 mt-4">
          <Card><CardHeader><CardTitle className="text-lg">Pesquisa de publicações</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Data Inicial</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataInicial && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dataInicial ? format(dataInicial, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dataInicial} onSelect={setDataInicial} className="p-3 pointer-events-auto" /></PopoverContent></Popover></div>
              <div className="space-y-2"><Label>Data Final</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataFinal && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dataFinal ? format(dataFinal, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dataFinal} onSelect={setDataFinal} className="p-3 pointer-events-auto" /></PopoverContent></Popover></div>
              <div className="space-y-2"><Label>Cliente</Label><Input placeholder="Nome do cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} /></div>
              <div className="space-y-2"><Label>Nº Processo</Label><Input placeholder="Número do processo" value={numProcesso} onChange={(e) => setNumProcesso(e.target.value)} /></div>
              <div className="space-y-2"><Label>Órgão/Tribunal</Label><Input placeholder="Tribunal ou diário" value={orgao} onChange={(e) => setOrgao(e.target.value)} /></div>
              <div className="space-y-2"><Label>Status de Leitura</Label><Select value={statusLeitura} onValueChange={setStatusLeitura}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas</SelectItem><SelectItem value="lidas">Lidas</SelectItem><SelectItem value="nao_lidas">Não Lidas</SelectItem></SelectContent></Select></div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2"><Button variant="destructive" size="sm" onClick={handleNaoVisualizadas}><EyeOff className="mr-1 h-4 w-4" />Não visualizadas</Button><Button variant="outline" size="sm" onClick={handleLimpar}><X className="mr-1 h-4 w-4" />Limpar</Button><Button size="sm" onClick={handlePesquisar}><Search className="mr-1 h-4 w-4" />Pesquisar</Button></div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-lg">Listagem de publicações</CardTitle></CardHeader><CardContent>
            {isLoading ? (<p className="text-muted-foreground text-sm py-8 text-center">Carregando...</p>) : movimentacoes.length === 0 ? (<p className="text-muted-foreground text-sm py-8 text-center">Não existem publicações no período especificado.</p>) : (
              <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Órgão</TableHead><TableHead>Nº Processo</TableHead><TableHead>Cliente</TableHead><TableHead>Conteúdo</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
              <TableBody>{movimentacoes.map((mov: any) => (<TableRow key={mov.id} className={cn("cursor-pointer", !mov.lida && "bg-accent/50")} onClick={() => setSelectedMov(mov)}>
                <TableCell className="whitespace-nowrap">{format(new Date(mov.data_movimentacao), "dd/MM/yyyy")}</TableCell><TableCell>{mov.orgao || "—"}</TableCell><TableCell className="whitespace-nowrap">{mov.processos?.numero_cnj || mov.processos?.numero_processo || "—"}</TableCell><TableCell>{mov.processos?.clientes?.nome_completo || "—"}</TableCell><TableCell className="max-w-xs truncate">{mov.conteudo}</TableCell>
                <TableCell><Badge variant={mov.lida ? "secondary" : "destructive"} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleLida.mutate({ id: mov.id, lida: mov.lida }); }}>{mov.lida ? "Lida" : "Não lida"}</Badge></TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/processos/${mov.processo_id}`); }}><ExternalLink className="h-4 w-4" /></Button></TableCell>
              </TableRow>))}</TableBody></Table></div>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
      <Dialog open={!!selectedMov} onOpenChange={(open) => !open && setSelectedMov(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Detalhes da Publicação</DialogTitle></DialogHeader>
          {selectedMov && (<div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Data</p><p className="font-medium text-sm">{format(new Date(selectedMov.data_movimentacao), "dd/MM/yyyy")}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Órgão</p><p className="font-medium text-sm">{selectedMov.orgao || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tipo</p><p className="font-medium text-sm">{selectedMov.tipo_movimentacao || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Fonte</p><p className="font-medium text-sm">{selectedMov.fonte || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Processo</p><p className="font-medium text-sm">{selectedMov.processos?.numero_cnj || selectedMov.processos?.numero_processo || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cliente</p><p className="font-medium text-sm">{selectedMov.processos?.clientes?.nome_completo || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p><Badge variant={selectedMov.lida ? "secondary" : "destructive"} className="cursor-pointer" onClick={() => { toggleLida.mutate({ id: selectedMov.id, lida: selectedMov.lida }); setSelectedMov((prev: any) => prev ? { ...prev, lida: !prev.lida } : null); }}>{selectedMov.lida ? "Lida" : "Não lida"}</Badge></div>
            </div>
            {selectedMov.descricao && (<div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Descrição</p><div className="rounded-lg border border-border bg-muted/50 p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-[20vh] overflow-y-auto">{selectedMov.descricao}</div></div>)}
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Conteúdo</p><div className="rounded-lg border border-border bg-muted/50 p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-[40vh] overflow-y-auto">{selectedMov.conteudo}</div></div>
            <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => { setSelectedMov(null); navigate(`/processos/${selectedMov.processo_id}`); }}><ExternalLink className="h-4 w-4 mr-2" />Ver Processo</Button></div>
          </div>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
