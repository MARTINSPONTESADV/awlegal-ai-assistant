import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileText, Package, FileSignature, Scale, FileDown } from "lucide-react";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { renderContratoHTML, renderProcuracaoHTML } from "@/lib/contractTemplates";
import type { Cliente } from "@/lib/types";

const FIXED_TEMPLATES = [
  { key: "contrato", label: "Contrato", icon: FileSignature, file: "/templates/CONTRATO_MARTINS_PONTES.docx" },
  { key: "procuracao", label: "Procuração e Declaração", icon: Scale, file: "/templates/PROCURACAO_DECLARACAO_HIPOSSUFICIENCIA.docx" },
];

function buildVariables(cliente: Cliente, extras: { dia: string; mes: string; ano: string }) {
  const v: Record<string, string | boolean> = {
    "NOME DA PARTE REQUERENTE": cliente.nome_completo?.toUpperCase() ?? "",
    "nome_completo": cliente.nome_completo ?? "",
    "nacionalidade": cliente.nacionalidade ?? "",
    "estado civil": cliente.estado_civil ?? "",
    "estado_civil": cliente.estado_civil ?? "",
    "profissão": cliente.profissao ?? "",
    "profissao": cliente.profissao ?? "",
    "número do RG": cliente.rg ?? "",
    "numero do RG": cliente.rg ?? "",
    "rg": cliente.rg ?? "",
    "RG": cliente.rg ?? "",
    "órgão expedidor": cliente.orgao_expedidor ?? "",
    "orgao expedidor": cliente.orgao_expedidor ?? "",
    "orgao_expedidor": cliente.orgao_expedidor ?? "",
    "número do CPF": cliente.cpf ?? "",
    "numero do CPF": cliente.cpf ?? "",
    "cpf": cliente.cpf ?? "",
    "CPF": cliente.cpf ?? "",
    "endereço com CEP": cliente.endereco_cep ?? "",
    "endereco com CEP": cliente.endereco_cep ?? "",
    "endereco_cep": cliente.endereco_cep ?? "",
    "endereco": cliente.endereco_cep ?? "",
    "PARTES REQUERIDAS": "",
    "partes_requeridas": "",
    "DIA": extras.dia,
    "MÊS": extras.mes,
    "MES": extras.mes,
    "ANO": extras.ano,
    has_rg: !!cliente.rg,
    has_cpf: !!cliente.cpf,
    has_profissao: !!cliente.profissao,
    has_estado_civil: !!cliente.estado_civil,
    has_nacionalidade: !!cliente.nacionalidade,
    has_endereco: !!cliente.endereco_cep,
    has_orgao_expedidor: !!cliente.orgao_expedidor,
  };
  return v;
}

function cleanOrphanPhrases(xml: string): string {
  const patterns = [
    /,?\s*portador(?:a)?\s+d[eo]\s+RG\s+n[ºo°]\.?\s*,?/gi,
    /,?\s*portador(?:a)?\s+d[ao]\s+(?:cédula\s+de\s+)?identidade\s+(?:RG\s+)?n[ºo°]\.?\s*,?/gi,
    /,?\s*inscrit[oa]\s+no\s+CPF\s+(?:sob\s+)?(?:o\s+)?n[ºo°]\.?\s*,?/gi,
    /,?\s*CPF\s+n[ºo°]\.?\s*,?/gi,
    /,?\s*(?:expedid[oa]\s+pel[oa]\s+|órgão\s+expedidor\s*:?\s*),?/gi,
    /,?\s*residente\s+e\s+domiciliad[oa]\s+n[oa]\s*,?/gi,
    /,?\s*com\s+endereço\s+(?:na?|em)\s*,?/gi,
    /,?\s*profissão\s*,?/gi,
    /,?\s*estado\s+civil\s*,?/gi,
    /,\s*,/g,
    /,\s*\./g,
  ];
  let result = xml;
  for (const p of patterns) {
    result = result.replace(p, (match) => {
      if (match.trim().endsWith('.')) return '.';
      return '';
    });
  }
  result = result.replace(/  +/g, ' ');
  return result;
}

async function fetchTemplateFile(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch template: ${res.statusText}`);
  return res.arrayBuffer();
}

export default function Generator() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [dia, setDia] = useState("");
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState("");
  const [generatedDocs, setGeneratedDocs] = useState<{ name: string; blob: Blob; templateKey: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const now = new Date();
    setDia(String(now.getDate()).padStart(2, "0"));
    const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    setMes(meses[now.getMonth()]);
    setAno(String(now.getFullYear()));
    supabase.from("clientes").select("*").order("nome_completo").then(({ data }) => {
      if (data) setClientes(data as Cliente[]);
    });
  }, []);

  const emptyCliente: Cliente = { id: "", nome_completo: "", nacionalidade: null, estado_civil: null, profissao: null, rg: null, orgao_expedidor: null, cpf: null, endereco_cep: null };

  const getCliente = () => (selectedCliente ? clientes.find((c) => c.id === selectedCliente) : null) ?? emptyCliente;

  const createDocx = (arrayBuffer: ArrayBuffer, cliente: Cliente) => {
    const variables = buildVariables(cliente, { dia, mes, ano });
    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{", end: "}" },
      nullGetter: () => "",
    });
    doc.render(variables);
    const outputZip = doc.getZip();
    const docXml = outputZip.file("word/document.xml");
    if (docXml) {
      const content = docXml.asText();
      const cleaned = cleanOrphanPhrases(content);
      outputZip.file("word/document.xml", cleaned);
    }
    return doc;
  };

  const generateSingle = async (templateKey: string) => {
    const template = FIXED_TEMPLATES.find((t) => t.key === templateKey);
    if (!template) return;
    const cliente = getCliente();
    setGenerating(true);
    try {
      const arrayBuffer = await fetchTemplateFile(template.file);
      const doc = createDocx(arrayBuffer, cliente);
      const blob = doc.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const safeName = (cliente.nome_completo || "documento").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
      const fileName = `${template.label}_${safeName}.docx`;
      setGeneratedDocs((prev) => {
        const filtered = prev.filter((d) => d.templateKey !== templateKey);
        return [...filtered, { name: fileName, blob, templateKey }];
      });
      toast.success(`${template.label} gerado com sucesso!`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao gerar ${template.label}: ${err.message}`);
    }
    setGenerating(false);
  };

  const generateAll = async () => {
    const cliente = getCliente();
    setGenerating(true);
    const docs: { name: string; blob: Blob; templateKey: string }[] = [];
    const safeName = (cliente.nome_completo || "documento").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
    for (const template of FIXED_TEMPLATES) {
      try {
        const arrayBuffer = await fetchTemplateFile(template.file);
        const doc = createDocx(arrayBuffer, cliente);
        const blob = doc.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        docs.push({ name: `${template.label}_${safeName}.docx`, blob, templateKey: template.key });
      } catch (err: any) {
        console.error(err);
        toast.error(`Erro ao gerar ${template.label}: ${err.message}`);
      }
    }
    setGeneratedDocs(docs);
    if (docs.length > 0) toast.success(`${docs.length} documento(s) gerado(s)!`);
    setGenerating(false);
  };

  const downloadDocx = (doc: { name: string; blob: Blob }) => saveAs(doc.blob, doc.name);

  const downloadPdf = async (doc: { name: string; blob: Blob; templateKey: string }) => {
    const cliente = getCliente();
    const templateData = { cliente, dia, mes, ano };

    // Generate HTML based on template type
    const html = doc.templateKey === "contrato"
      ? renderContratoHTML(templateData)
      : renderProcuracaoHTML(templateData);

    // Render HTML in hidden container
    const container = pdfContainerRef.current;
    if (!container) return;

    container.innerHTML = html;
    container.style.display = "block";

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 794, // A4 at 96dpi
        windowWidth: 794,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      const imgData = canvas.toDataURL("image/png");

      let position = 0;
      let heightLeft = imgHeight;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(doc.name.replace(".docx", ".pdf"));
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    } finally {
      container.style.display = "none";
      container.innerHTML = "";
    }
  };

  const downloadAll = async () => {
    if (generatedDocs.length === 0) return;
    const zip = new JSZip();
    generatedDocs.forEach((doc) => zip.file(doc.name, doc.blob));
    const content = await zip.generateAsync({ type: "blob" });
    const cliente = clientes.find((c) => c.id === selectedCliente);
    const safeName = cliente ? cliente.nome_completo.replace(/\s+/g, "_") : "documentos";
    saveAs(content, `${safeName}_kit.zip`);
  };

  const clienteInfo = clientes.find((c) => c.id === selectedCliente);

  return (
    <>
      <h2 className="font-display text-3xl font-bold mb-6">Gerador de Documentos</h2>
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader><CardTitle>Dados para Geração</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um cliente (opcional)..." /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {clienteInfo && (
                <div className="rounded-lg border border-border p-4 bg-muted/50 text-sm space-y-1">
                  <p><strong>CPF:</strong> {clienteInfo.cpf || "—"} &nbsp; <strong>RG:</strong> {clienteInfo.rg || "—"}</p>
                  <p><strong>Profissão:</strong> {clienteInfo.profissao || "—"} &nbsp; <strong>Estado Civil:</strong> {clienteInfo.estado_civil || "—"}</p>
                  <p><strong>Endereço:</strong> {clienteInfo.endereco_cep || "—"}</p>
                  {(!clienteInfo.cpf || !clienteInfo.rg || !clienteInfo.endereco_cep) && (
                    <p className="text-xs text-muted-foreground mt-2">⚠ Campos em branco serão omitidos automaticamente no documento.</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div><Label>Dia</Label><Input value={dia} onChange={(e) => setDia(e.target.value)} className="mt-1" /></div>
                <div><Label>Mês</Label><Input value={mes} onChange={(e) => setMes(e.target.value)} className="mt-1" /></div>
                <div><Label>Ano</Label><Input value={ano} onChange={(e) => setAno(e.target.value)} className="mt-1" /></div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {FIXED_TEMPLATES.map((t) => (
                  <Button key={t.key} variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => generateSingle(t.key)} disabled={generating}>
                    <t.icon className="h-6 w-6" />
                    <span className="text-xs font-medium">Gerar {t.label}</span>
                  </Button>
                ))}
              </div>

              <Button className="w-full" onClick={generateAll} disabled={generating}>
                <Package className="h-4 w-4 mr-2" />
                {generating ? "Gerando..." : "Gerar Todos os Documentos"}
              </Button>
            </CardContent>
          </Card>

          {generatedDocs.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Documentos Gerados</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {generatedDocs.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium text-sm">{doc.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => downloadPdf(doc)}>
                        <FileDown className="h-4 w-4 mr-1" /> PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => downloadDocx(doc)}>
                        <Download className="h-4 w-4 mr-1" /> DOCX
                      </Button>
                    </div>
                  </div>
                ))}
                {generatedDocs.length > 1 && (
                  <Button className="w-full mt-2" variant="outline" onClick={downloadAll}>
                    <Package className="h-4 w-4 mr-2" /> Baixar Kit ZIP
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Modelos Disponíveis</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {FIXED_TEMPLATES.map((t) => (
                <div key={t.key} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <t.icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium">{t.label}</span>
                </div>
              ))}
              <div className="mt-4 rounded-lg bg-muted p-4 text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">Omissão Inteligente</p>
                <p>Campos em branco são removidos automaticamente do documento final, incluindo frases inteiras que os referenciam (RG, CPF, endereço, profissão).</p>
                <p className="font-semibold text-foreground mt-3">Formatos de download:</p>
                <p><strong>DOCX</strong> — Documento Word editável com variáveis substituídas</p>
                <p><strong>PDF</strong> — Documento formatado como contrato jurídico profissional</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden container for PDF rendering */}
      <div
        ref={pdfContainerRef}
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "794px",
          display: "none",
          background: "#fff",
        }}
      />
    </>
  );
}
