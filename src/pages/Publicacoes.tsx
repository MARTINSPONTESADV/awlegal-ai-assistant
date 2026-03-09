import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarIcon, Search, X, EyeOff, ClipboardList, Paperclip, Loader2, Eye, BookOpen } from "lucide-react";
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

  const [showOcorrencia, setShowOcorrencia] = useState(false);
  const [logText, setLogText] = useState("");
  const [attachedImages, setAttachedImages] = useState<{ file: File; preview: string }[]>([]);
  const [savingOcorrencia, setSavingOcorrencia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Realtime subscription ──
  useEffect(() => {
    const channel = supabase
      .channel('publicacoes_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publicacoes' }, () => {
        queryClient.invalidateQueries({ queryKey: ["publicacoes"] });
        queryClient.invalidateQueries({ queryKey: ["publicacoes_counts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const handlePesquisar = () => {
    setActiveFilters({ dataInicial, dataFinal, cliente, numProcesso, orgao, statusLeitura });
  };
  const handleLimpar = () => {
    setDataInicial(undefined); setDataFinal(undefined);
    setCliente(""); setNumProcesso(""); setOrgao("");
    setStatusLeitura("todas"); setActiveFilters({});
  };

  // ── SEPARATE query for accurate counts (always unfiltered) ──
  const { data: allPublicacoes = [] } = useQuery({
    queryKey: ["publicacoes_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publicacoes")
        .select("id, status_leitura")
        .order("data_publicacao", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const totalCount = allPublicacoes.length;
  const naoLidasCount = allPublicacoes.filter((p: any) => p.status_leitura === 'Não lida' || !p.status_leitura).length;
  const lidasCount = allPublicacoes.filter((p: any) => p.status_leitura === 'Lida').length;

  // ── Main filtered query ──
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
      else if (f.statusLeitura === "nao_lidas") {
        query = query.or("status_leitura.eq.Não lida,status_leitura.is.null,status_leitura.eq.");
      }
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publicacoes"] });
      queryClient.invalidateQueries({ queryKey: ["publicacoes_counts"] });
      toast.success("Status atualizado");
    },
  });

  const handleOpenOcorrencia = () => {
    setShowOcorrencia(true);
    setLogText("");
    setAttachedImages([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages = Array.from(files).map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setAttachedImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setAttachedImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSaveOcorrencia = async () => {
    if (!logText.trim() && attachedImages.length === 0) {
      toast.error("Escreva um log ou anexe uma imagem.");
      return;
    }
    setSavingOcorrencia(true);
    try {
      let processoId: string | null = null;
      if (selectedPub?.numero_processo) {
        const { data: proc } = await supabase.from("processos").select("id").eq("numero_processo", selectedPub.numero_processo).maybeSingle();
        processoId = proc?.id || null;
      }
      const uploadedUrls: string[] = [];
      for (const img of attachedImages) {
        const ext = img.file.name.split(".").pop() || "jpg";
        const filename = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("anexos_agenda").upload(filename, img.file, { contentType: img.file.type, upsert: false });
        if (upErr) { toast.error(`Erro ao enviar imagem: ${img.file.name}`); continue; }
        const { data: urlData } = supabase.storage.from("anexos_agenda").getPublicUrl(filename);
        uploadedUrls.push(urlData.publicUrl);
      }
      const { error } = await supabase.from("agenda").insert({
        titulo: `Ocorrência: ${selectedPub?.numero_processo || "Publicação"}`,
        tipo: "Outros",
        data_prazo: new Date().toISOString().split("T")[0],
        processo_id: processoId,
        logs_interacao: logText.trim() || null,
        anexos_log: uploadedUrls.length > 0 ? uploadedUrls : null,
        descricao: `Registrado a partir da publicação de ${selectedPub?.data_publicacao || "—"}`,
      });
      if (error) throw error;
      toast.success("Ocorrência registrada na Agenda!");
      setShowOcorrencia(false); setLogText(""); setAttachedImages([]);
    } catch {
      toast.error("Erro ao salvar ocorrência.");
    } finally {
      setSavingOcorrencia(false);
    }
  };

  const isFilterActive = Object.keys(activeFilters).length > 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Publicações" }]} />

      {/* ── Contagem rápida (sempre precisa, query separada) ── */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{totalCount}</span> Total
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/25 bg-amber-500/08 text-xs text-amber-300">
          <EyeOff className="h-3.5 w-3.5" />
          <span className="font-bold">{naoLidasCount}</span> Não lidas
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/08 text-xs text-emerald-300">
          <Eye className="h-3.5 w-3.5" />
          <span className="font-bold">{lidasCount}</span> Lidas
        </div>
      </div>

      <Tabs defaultValue="publicacoes">
        <TabsList><TabsTrigger value="publicacoes">Publicações</TabsTrigger><TabsTrigger value="cargas" disabled>Cargas</TabsTrigger></TabsList>
        <TabsContent value="publicacoes" className="space-y-6 mt-4">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-lg">Pesquisa de publicações</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Data Inicial</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataInicial && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dataInicial ? format(dataInicial, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dataInicial} onSelect={setDataInicial} className="p-3 pointer-events-auto" /></PopoverContent></Popover></div>
                <div className="space-y-2"><Label>Data Final</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataFinal && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dataFinal ? format(dataFinal, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dataFinal} onSelect={setDataFinal} className="p-3 pointer-events-auto" /></PopoverContent></Popover></div>
                <div className="space-y-2"><Label>Cliente</Label><Input placeholder="Nome do cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} /></div>
                <div className="space-y-2"><Label>Nº Processo</Label><Input placeholder="Número do processo" value={numProcesso} onChange={(e) => setNumProcesso(e.target.value)} /></div>
                <div className="space-y-2"><Label>Órgão/Tribunal</Label><Input placeholder="Tribunal ou diário" value={orgao} onChange={(e) => setOrgao(e.target.value)} /></div>
                <div className="space-y-2"><Label>Status de Leitura</Label>
                  <Select value={statusLeitura} onValueChange={setStatusLeitura}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas ({totalCount})</SelectItem>
                      <SelectItem value="lidas">Lidas ({lidasCount})</SelectItem>
                      <SelectItem value="nao_lidas">Não Lidas ({naoLidasCount})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusLeitura("nao_lidas");
                    setActiveFilters((prev) => ({ ...prev, statusLeitura: "nao_lidas" }));
                  }}
                  className="gap-1.5 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                >
                  <EyeOff className="h-4 w-4" />
                  Não lidas ({naoLidasCount})
                </Button>
                <Button variant="outline" size="sm" onClick={handleLimpar}><X className="mr-1 h-4 w-4" />Limpar</Button>
                <Button size="sm" onClick={handlePesquisar}><Search className="mr-1 h-4 w-4" />Pesquisar</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Listagem de publicações
                <Badge variant="secondary" className="font-mono text-sm">
                  {isLoading ? "…" : publicacoes.length}
                </Badge>
                {isFilterActive && (
                  <Badge variant="outline" className="text-xs border-violet-400/30 text-violet-300">
                    filtrado
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Carregando...</span>
                </div>
              ) : publicacoes.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  {isFilterActive ? "Nenhuma publicação encontrada para os filtros aplicados." : "Clique em 'Pesquisar' para carregar as publicações, ou em 'Não lidas' para ver as pendentes."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.06]">
                        <TableHead>Data</TableHead>
                        <TableHead>Órgão</TableHead>
                        <TableHead>Nº Processo</TableHead>
                        <TableHead className="hidden md:table-cell">Cliente</TableHead>
                        <TableHead className="hidden lg:table-cell">Conteúdo</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {publicacoes.map((pub: any) => (
                        <TableRow
                          key={pub.id}
                          className={cn(
                            "cursor-pointer border-white/[0.04] hover:bg-white/[0.03] transition-colors",
                            pub.status_leitura !== "Lida" && "bg-amber-500/[0.04]"
                          )}
                          onClick={() => { setSelectedPub(pub); setShowOcorrencia(false); }}
                        >
                          <TableCell className="whitespace-nowrap text-sm font-mono">{pub.data_publicacao || "—"}</TableCell>
                          <TableCell className="text-sm">{pub.orgao || "—"}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm font-mono">{pub.numero_processo || "—"}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{pub.cliente_id || "—"}</TableCell>
                          <TableCell className="max-w-xs truncate hidden lg:table-cell text-sm text-muted-foreground">{pub.conteudo || "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={pub.status_leitura === "Lida" ? "secondary" : "outline"}
                              className={cn(
                                "cursor-pointer text-xs",
                                pub.status_leitura === "Lida"
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                  : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                              )}
                              onClick={(e) => { e.stopPropagation(); toggleLida.mutate({ id: pub.id, current: pub.status_leitura || "" }); }}
                            >
                              {pub.status_leitura || "Não lida"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail + Occurrence Modal */}
      <Dialog open={!!selectedPub} onOpenChange={(open) => { if (!open) { setSelectedPub(null); setShowOcorrencia(false); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle>Detalhes da Publicação</DialogTitle>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleOpenOcorrencia}>
                <ClipboardList className="h-4 w-4" />Registrar Ocorrência
              </Button>
            </div>
          </DialogHeader>
          {selectedPub && !showOcorrencia && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Data</p><p className="font-medium text-sm font-mono">{selectedPub.data_publicacao || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Órgão</p><p className="font-medium text-sm">{selectedPub.orgao || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tipo</p><p className="font-medium text-sm">{selectedPub.tipo_publicacao || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tribunal</p><p className="font-medium text-sm">{selectedPub.tribunal || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Processo</p><p className="font-medium text-sm font-mono">{selectedPub.numero_processo || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cliente</p><p className="font-medium text-sm">{selectedPub.cliente_id || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "cursor-pointer text-xs",
                      selectedPub.status_leitura === "Lida"
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    )}
                    onClick={() => {
                      toggleLida.mutate({ id: selectedPub.id, current: selectedPub.status_leitura || "" });
                      setSelectedPub((prev: any) => prev ? { ...prev, status_leitura: prev.status_leitura === "Lida" ? "Não lida" : "Lida" } : null);
                    }}
                  >
                    {selectedPub.status_leitura || "Não lida"}
                  </Badge>
                </div>
              </div>
              {selectedPub.materia && (<div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Matéria</p><div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-[20vh] overflow-y-auto">{selectedPub.materia}</div></div>)}
              {selectedPub.descricao && (<div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Resumo</p><div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-[20vh] overflow-y-auto">{selectedPub.descricao}</div></div>)}
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Conteúdo</p><div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-[40vh] overflow-y-auto">{selectedPub.conteudo || "—"}</div></div>
            </div>
          )}
          {selectedPub && showOcorrencia && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Registrando ocorrência para <strong>{selectedPub.numero_processo || "publicação selecionada"}</strong></p>
              <div className="space-y-2"><Label>Log da Ocorrência</Label><Textarea placeholder="Descreva a ocorrência..." value={logText} onChange={(e) => setLogText(e.target.value)} rows={5} /></div>
              <div className="space-y-2">
                <Label>Anexos (imagens)</Label>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}><Paperclip className="h-4 w-4" />Anexar Imagem</Button>
                {attachedImages.length > 0 && (<div className="flex flex-wrap gap-3 mt-2">{attachedImages.map((img, idx) => (<div key={idx} className="relative group"><img src={img.preview} alt={`Anexo ${idx + 1}`} className="h-20 w-20 object-cover rounded-lg border border-white/[0.08]" /><button type="button" onClick={() => removeImage(idx)} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button></div>))}</div>)}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowOcorrencia(false)}>Voltar</Button>
                <Button size="sm" onClick={handleSaveOcorrencia} disabled={savingOcorrencia}>
                  {savingOcorrencia ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Salvando...</> : "Salvar Ocorrência"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
