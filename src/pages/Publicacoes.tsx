import { useState, useEffect } from "react";
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
import { CalendarIcon, Search, X, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function Publicacoes() {
  const queryClient = useQueryClient();
  const [dataInicial, setDataInicial] = useState<Date | undefined>();
  const [dataFinal, setDataFinal] = useState<Date | undefined>();
  const [cliente, setCliente] = useState("");
  const [numProcesso, setNumProcesso] = useState("");
  const [orgao, setOrgao] = useState("");
  const [statusLeitura, setStatusLeitura] = useState("todas");
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({});
  const [selectedPub, setSelectedPub] = useState<any | null>(null);

  // Realtime subscription for publicacoes
  useEffect(() => {
    const channel = supabase
      .channel('publicacoes_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publicacoes' }, () => {
        queryClient.invalidateQueries({ queryKey: ["publicacoes"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const handlePesquisar = () => { setActiveFilters({ dataInicial, dataFinal, cliente, numProcesso, orgao, statusLeitura }); };
  const handleLimpar = () => { setDataInicial(undefined); setDataFinal(undefined); setCliente(""); setNumProcesso(""); setOrgao(""); setStatusLeitura("todas"); setActiveFilters({}); };
  const handleNaoVisualizadas = () => { setStatusLeitura("nao_lidas"); setActiveFilters((prev) => ({ ...prev, statusLeitura: "nao_lidas" })); };

  const { data: publicacoes = [], isLoading } = useQuery({
    queryKey: ["publicacoes", activeFilters],
    queryFn: async () => {
      let query = supabase.from("publicacoes").select("*").order("data_publicacao", { ascending: false });
      const f = activeFilters as any;
      if (f.dataInicial) query = query.gte("data_publicacao", format(f.dataInicial, "dd/MM/yyyy"));
      if (f.dataFinal) query = query.lte("data_publicacao", format(f.dataFinal, "dd/MM/yyyy"));
      if (f.cliente) query = query.ilike("cliente_id", `%${f.cliente}%`);
      if (f.numProcesso) query = query.ilike("numero_processo", `%${f.numProcesso}%`);
      if (f.orgao) query = query.ilike("orgao", `%${f.orgao}%`);
      if (f.statusLeitura === "lidas") query = query.eq("status_leitura", "Lida");
      else if (f.statusLeitura === "nao_lidas") query = query.eq("status_leitura", "Não lida");
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const toggleLida = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: string }) => {
      const newStatus = current === "Lida" ? "Não lida" : "Lida";
      const lido_em = newStatus === "Lida" ? new Date().toISOString() : null;
      const { error } = await supabase.from("publicacoes").update({ status_leitura: newStatus, lido_em }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["publicacoes"] }); toast.success("Status atualizado"); },
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
          <Card><CardHeader><CardTitle className="text-lg">Listagem de publicações ({publicacoes.length})</CardTitle></CardHeader><CardContent>
            {isLoading ? (<p className="text-muted-foreground text-sm py-8 text-center">Carregando...</p>) : publicacoes.length === 0 ? (<p className="text-muted-foreground text-sm py-8 text-center">Não existem publicações no período especificado.</p>) : (
              <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Órgão</TableHead><TableHead>Nº Processo</TableHead><TableHead>Cliente</TableHead><TableHead>Conteúdo</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{publicacoes.map((pub: any) => (<TableRow key={pub.id} className={cn("cursor-pointer", pub.status_leitura !== "Lida" && "bg-accent/50")} onClick={() => setSelectedPub(pub)}>
                <TableCell className="whitespace-nowrap">{pub.data_publicacao || "—"}</TableCell>
                <TableCell>{pub.orgao || "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{pub.numero_processo || "—"}</TableCell>
                <TableCell>{pub.cliente_id || "—"}</TableCell>
                <TableCell className="max-w-xs truncate">{pub.conteudo || "—"}</TableCell>
                <TableCell><Badge variant={pub.status_leitura === "Lida" ? "secondary" : "destructive"} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleLida.mutate({ id: pub.id, current: pub.status_leitura || "" }); }}>{pub.status_leitura || "Não lida"}</Badge></TableCell>
              </TableRow>))}</TableBody></Table></div>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
      <Dialog open={!!selectedPub} onOpenChange={(open) => !open && setSelectedPub(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Detalhes da Publicação</DialogTitle></DialogHeader>
          {selectedPub && (<div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Data</p><p className="font-medium text-sm">{selectedPub.data_publicacao || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Órgão</p><p className="font-medium text-sm">{selectedPub.orgao || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tipo</p><p className="font-medium text-sm">{selectedPub.tipo_publicacao || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tribunal</p><p className="font-medium text-sm">{selectedPub.tribunal || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Processo</p><p className="font-medium text-sm">{selectedPub.numero_processo || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cliente</p><p className="font-medium text-sm">{selectedPub.cliente_id || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p><Badge variant={selectedPub.status_leitura === "Lida" ? "secondary" : "destructive"} className="cursor-pointer" onClick={() => { toggleLida.mutate({ id: selectedPub.id, current: selectedPub.status_leitura || "" }); setSelectedPub((prev: any) => prev ? { ...prev, status_leitura: prev.status_leitura === "Lida" ? "Não lida" : "Lida" } : null); }}>{selectedPub.status_leitura || "Não lida"}</Badge></div>
            </div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Conteúdo</p><div className="rounded-lg border border-border bg-muted/50 p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-[40vh] overflow-y-auto">{selectedPub.conteudo || "—"}</div></div>
          </div>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
