import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Download, Search } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ProcessoRow { numero_processo: string | null; numero_cnj: string | null; cliente_nome: string; responsavel: string | null; status_processual: string | null; comarca: string | null; situacao: string | null; valor_causa: number | null; }

const STATUS_OPTIONS = ["Em andamento", "Suspenso", "Encerrado", "Arquivado"];

export default function Relatorios() {
  useEffect(() => { document.title = "Relatórios — AW ECO"; }, []);
  const [responsavel, setResponsavel] = useState("");
  const [statusProcessual, setStatusProcessual] = useState("");
  const [comarca, setComarca] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [results, setResults] = useState<ProcessoRow[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      let query = supabase.from("processos").select("numero_processo, numero_cnj, responsavel, status_processual, comarca, situacao, valor_causa, clientes(nome_completo)").order("created_at", { ascending: false });
      if (responsavel) query = query.ilike("responsavel", `%${responsavel}%`);
      if (statusProcessual) query = query.eq("status_processual", statusProcessual);
      if (comarca) query = query.ilike("comarca", `%${comarca}%`);
      if (dataInicial) query = query.gte("data_distribuicao", dataInicial);
      if (dataFinal) query = query.lte("data_distribuicao", dataFinal);
      const { data, error } = await query;
      if (error) { toast.error("Erro na busca"); return; }
      setResults((data || []).map((p: any) => ({ numero_processo: p.numero_processo, numero_cnj: p.numero_cnj, cliente_nome: p.clientes?.nome_completo || "—", responsavel: p.responsavel, status_processual: p.status_processual, comarca: p.comarca, situacao: p.situacao, valor_causa: p.valor_causa })));
    } finally { setLoading(false); }
  };

  const exportExcel = () => {
    if (!results.length) { toast.error("Sem dados para exportar"); return; }
    const ws = XLSX.utils.json_to_sheet(results.map(r => ({ "Nº Processo": r.numero_processo || "", "Nº CNJ": r.numero_cnj || "", "Cliente": r.cliente_nome, "Responsável": r.responsavel || "", "Status": r.status_processual || "", "Comarca": r.comarca || "", "Situação": r.situacao || "", "Valor da Causa": r.valor_causa ?? "" })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Relatório"); XLSX.writeFile(wb, "relatorio_processos.xlsx"); toast.success("Excel exportado!");
  };

  const exportPDF = () => {
    if (!results.length) { toast.error("Sem dados para exportar"); return; }
    const doc = new jsPDF({ orientation: "landscape" }); doc.setFontSize(16); doc.text("Martins Pontes Advocacia - Relatório de Processos", 14, 20); doc.setFontSize(10); doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
    autoTable(doc, { startY: 35, head: [["Nº Processo", "Nº CNJ", "Cliente", "Responsável", "Status", "Comarca", "Situação", "Valor"]], body: results.map(r => [r.numero_processo || "", r.numero_cnj || "", r.cliente_nome, r.responsavel || "", r.status_processual || "", r.comarca || "", r.situacao || "", r.valor_causa != null ? `R$ ${Number(r.valor_causa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""]), styles: { fontSize: 8 }, headStyles: { fillColor: [30, 30, 30] } });
    doc.save("relatorio_processos.pdf"); toast.success("PDF exportado!");
  };

  return (
    <>
      <h2 className="font-display text-3xl font-bold mb-6">Relatórios</h2>
      <Card className="mb-6"><CardHeader><CardTitle className="text-lg">Filtros</CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div><Label>Responsável</Label><Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Nome..." className="mt-1" /></div>
          <div><Label>Status Processual</Label><Select value={statusProcessual} onValueChange={setStatusProcessual}><SelectTrigger className="mt-1"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="__all__">Todos</SelectItem>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Comarca</Label><Input value={comarca} onChange={(e) => setComarca(e.target.value)} placeholder="Comarca..." className="mt-1" /></div>
          <div><Label>Data Inicial</Label><Input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} className="mt-1" /></div>
          <div><Label>Data Final</Label><Input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} className="mt-1" /></div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4"><Button onClick={handleSearch} disabled={loading}><Search className="h-4 w-4 mr-2" />{loading ? "Buscando..." : "Buscar"}</Button><Button variant="outline" onClick={exportExcel}><Download className="h-4 w-4 mr-2" />Exportar Excel</Button><Button variant="outline" onClick={exportPDF}><Download className="h-4 w-4 mr-2" />Exportar PDF</Button></div>
      </CardContent></Card>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Nº Processo</TableHead><TableHead>Nº CNJ</TableHead><TableHead>Cliente</TableHead><TableHead>Responsável</TableHead><TableHead>Status</TableHead><TableHead>Comarca</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
      <TableBody>{results.map((r, i) => (<TableRow key={i}><TableCell className="font-medium">{r.numero_processo || "—"}</TableCell><TableCell>{r.numero_cnj || "—"}</TableCell><TableCell>{r.cliente_nome}</TableCell><TableCell>{r.responsavel || "—"}</TableCell><TableCell>{r.status_processual || "—"}</TableCell><TableCell>{r.comarca || "—"}</TableCell><TableCell>{r.situacao || "—"}</TableCell><TableCell className="text-right">{r.valor_causa != null ? `R$ ${Number(r.valor_causa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</TableCell></TableRow>))}{results.length === 0 && (<TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Use os filtros acima para buscar processos.</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    </>
  );
}
