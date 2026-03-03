import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileText, Package } from "lucide-react";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import JSZip from "jszip";

interface Template { id: string; name: string; bucket_path: string; }
interface Cliente { id: string; nome_completo: string; nacionalidade: string | null; estado_civil: string | null; profissao: string | null; rg: string | null; orgao_expedidor: string | null; cpf: string | null; endereco_cep: string | null; }

export default function Generator() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [partesRequeridas, setPartesRequeridas] = useState("");
  const [dia, setDia] = useState(""); const [mes, setMes] = useState(""); const [ano, setAno] = useState("");
  const [generatedDocs, setGeneratedDocs] = useState<{ name: string; blob: Blob }[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const now = new Date();
    setDia(String(now.getDate()).padStart(2, "0"));
    const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
    setMes(meses[now.getMonth()]); setAno(String(now.getFullYear()));
    Promise.all([supabase.from("templates").select("id, name, bucket_path").eq("is_active", true), supabase.from("clientes").select("*").order("nome_completo")]).then(([{ data: t }, { data: c }]) => { if (t) setTemplates(t as Template[]); if (c) setClientes(c as Cliente[]); });
  }, []);

  const generateDocuments = async () => {
    if (!selectedCliente) { toast.error("Selecione um cliente."); return; }
    if (templates.length === 0) { toast.error("Nenhum template disponível."); return; }
    const cliente = clientes.find((c) => c.id === selectedCliente);
    if (!cliente) return;
    setGenerating(true);
    const docs: { name: string; blob: Blob }[] = [];
    const variableMap: Record<string, string> = {
      "NOME DA PARTE REQUERENTE": cliente.nome_completo.toUpperCase(), "nacionalidade": cliente.nacionalidade ?? "", "estado civil": cliente.estado_civil ?? "",
      "profissão": cliente.profissao ?? "", "profissao": cliente.profissao ?? "", "número do RG": cliente.rg ?? "", "numero do RG": cliente.rg ?? "",
      "órgão expedidor": cliente.orgao_expedidor ?? "", "orgao expedidor": cliente.orgao_expedidor ?? "", "número do CPF": cliente.cpf ?? "", "numero do CPF": cliente.cpf ?? "",
      "endereço com CEP": cliente.endereco_cep ?? "", "endereco com CEP": cliente.endereco_cep ?? "", "PARTES REQUERIDAS": partesRequeridas, "DIA": dia, "MÊS": mes, "MES": mes, "ANO": ano,
    };
    const clienteNomeSafe = cliente.nome_completo.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
    for (const template of templates) {
      try {
        const { data, error } = await supabase.storage.from("templates").download(template.bucket_path);
        if (error || !data) { toast.error(`Erro ao baixar: ${template.name}`); continue; }
        const arrayBuffer = await data.arrayBuffer();
        const zip = new PizZip(arrayBuffer);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: "{", end: "}" } });
        doc.render(variableMap);
        const output = doc.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        docs.push({ name: `${template.name}_${clienteNomeSafe}.docx`, blob: output });
      } catch (err: any) { console.error("Error generating doc:", err); toast.error(`Erro ao gerar ${template.name}: ${err.message}`); }
    }
    setGeneratedDocs(docs);
    if (docs.length > 0) toast.success(`${docs.length} documento(s) gerado(s)!`);
    setGenerating(false);
  };

  const downloadSingle = (doc: { name: string; blob: Blob }) => saveAs(doc.blob, doc.name);
  const downloadPdf = async (doc: { name: string; blob: Blob }) => {
    try {
      const form = new FormData(); form.append("file", doc.blob, doc.name);
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/convert-to-pdf`, { method: "POST", body: form });
      if (!res.ok) { toast.error("Erro ao converter PDF"); return; }
      const pdfBlob = await res.blob(); saveAs(pdfBlob, doc.name.replace(".docx", ".pdf"));
    } catch { toast.error("Erro ao converter para PDF"); }
  };
  const downloadAll = async () => {
    if (generatedDocs.length === 0) return;
    const zip = new JSZip(); generatedDocs.forEach((doc) => zip.file(doc.name, doc.blob));
    const content = await zip.generateAsync({ type: "blob" });
    const cliente = clientes.find((c) => c.id === selectedCliente);
    const safeName = cliente ? cliente.nome_completo.replace(/\s+/g, "_") : "documentos";
    saveAs(content, `${safeName}_kit.zip`);
  };

  return (
    <>
      <h2 className="font-display text-3xl font-bold mb-6">Gerador de Documentos</h2>
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader><CardTitle>Dados para Geração</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Cliente</Label><Select value={selectedCliente} onValueChange={setSelectedCliente}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um cliente..." /></SelectTrigger><SelectContent>{clientes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>))}</SelectContent></Select></div>
              {selectedCliente && (() => { const c = clientes.find((cl) => cl.id === selectedCliente); if (!c) return null; return (<div className="rounded-lg border border-border p-4 bg-muted/50 text-sm space-y-1"><p><strong>CPF:</strong> {c.cpf || "—"} &nbsp; <strong>RG:</strong> {c.rg || "—"}</p><p><strong>Profissão:</strong> {c.profissao || "—"} &nbsp; <strong>Estado Civil:</strong> {c.estado_civil || "—"}</p><p><strong>Endereço:</strong> {c.endereco_cep || "—"}</p></div>); })()}
              <div><Label>Partes Requeridas (opcional)</Label><Input value={partesRequeridas} onChange={(e) => setPartesRequeridas(e.target.value)} className="mt-1" placeholder="Ex: Empresa X Ltda." /></div>
              <div className="grid grid-cols-3 gap-4"><div><Label>Dia</Label><Input value={dia} onChange={(e) => setDia(e.target.value)} className="mt-1" /></div><div><Label>Mês</Label><Input value={mes} onChange={(e) => setMes(e.target.value)} className="mt-1" /></div><div><Label>Ano</Label><Input value={ano} onChange={(e) => setAno(e.target.value)} className="mt-1" /></div></div>
              <Button className="w-full" onClick={generateDocuments} disabled={generating}>{generating ? "Gerando..." : "Gerar Documentos"}</Button>
            </CardContent>
          </Card>
          {generatedDocs.length > 0 && (
            <Card className="mt-6">
              <CardHeader><CardTitle>Documentos Gerados</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {generatedDocs.map((doc, i) => (<div key={i} className="flex items-center justify-between rounded-lg border border-border p-3"><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-muted-foreground" /><span className="font-medium text-sm">{doc.name}</span></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => downloadSingle(doc)}><Download className="h-4 w-4 mr-1" /> DOCX</Button><Button size="sm" variant="outline" onClick={() => downloadPdf(doc)}><Download className="h-4 w-4 mr-1" /> PDF</Button></div></div>))}
                {generatedDocs.length > 1 && (<Button className="w-full mt-2" variant="outline" onClick={downloadAll}><Package className="h-4 w-4 mr-2" /> Baixar Kit ZIP</Button>)}
              </CardContent>
            </Card>
          )}
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Templates Disponíveis</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">{templates.map((t) => (<div key={t.id} className="flex items-center gap-3 rounded-lg border border-border p-3"><FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" /><span className="text-sm font-medium">{t.name}</span></div>))}{templates.length === 0 && (<p className="text-muted-foreground text-center py-6 text-sm">Nenhum template disponível.</p>)}</div>
              <div className="mt-4 rounded-lg bg-muted p-4 text-xs text-muted-foreground space-y-2"><p className="font-semibold text-foreground">Variáveis suportadas:</p><code className="block">{"{NOME DA PARTE REQUERENTE}"}<br />{"{nacionalidade}"} {"{estado civil}"}<br />{"{profissão}"} {"{número do RG}"}<br />{"{órgão expedidor}"} {"{número do CPF}"}<br />{"{endereço com CEP}"} {"{PARTES REQUERIDAS}"}<br />{"{DIA}"} {"{MÊS}"} {"{ANO}"}</code></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
