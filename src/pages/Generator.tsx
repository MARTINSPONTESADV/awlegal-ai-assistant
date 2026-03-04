import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileText, Package, FileSignature, Scale } from "lucide-react";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import JSZip from "jszip";

interface Cliente {
  id: string;
  nome_completo: string;
  nacionalidade: string | null;
  estado_civil: string | null;
  profissao: string | null;
  rg: string | null;
  orgao_expedidor: string | null;
  cpf: string | null;
  endereco_cep: string | null;
}

const FIXED_TEMPLATES = [
  { key: "contrato", label: "Contrato", icon: FileSignature, file: "/templates/CONTRATO_MARTINS_PONTES.docx" },
  { key: "procuracao", label: "Procuração e Declaração", icon: Scale, file: "/templates/PROCURACAO_DECLARACAO_HIPOSSUFICIENCIA.docx" },
];

/**
 * Build the variable map AND a "clean" version that removes
 * entire phrases when a field is blank.
 *
 * Strategy: We use docxtemplater's angular-parser with
 * conditionals so that phrases containing blank fields
 * are completely removed from the output.
 *
 * Since we can't guarantee the exact phrasing inside every
 * template, we use a dual approach:
 *   1. Fill every variable with its value (or empty string).
 *   2. Add boolean flags (has_rg, has_cpf, …) that templates
 *      can use with {#has_rg}…{/has_rg} blocks.
 *   3. For simple {variable} placeholders, we use a custom
 *      nullGetter so missing / empty values render as "".
 *   4. Post-process: strip leftover orphan punctuation patterns
 *      like ", ," or leading/trailing commas in sentences.
 */
function buildVariables(cliente: Cliente, extras: { partesRequeridas: string; dia: string; mes: string; ano: string }) {
  const v: Record<string, string | boolean> = {
    // Main fields
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
    "PARTES REQUERIDAS": extras.partesRequeridas,
    "partes_requeridas": extras.partesRequeridas,
    "DIA": extras.dia,
    "MÊS": extras.mes,
    "MES": extras.mes,
    "ANO": extras.ano,
    // Boolean flags for conditional blocks
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

/**
 * Post-process the generated XML to remove orphan commas / phrases
 * left behind when a variable was blank.
 *
 * Common patterns in legal docs:
 *   "portador do RG nº ,"  →  remove entire phrase
 *   "inscrito no CPF sob o nº ,"  →  remove
 *   "residente e domiciliado(a) na ,"  →  remove
 *   ", profissão ,"  →  remove
 */
function cleanOrphanPhrases(xml: string): string {
  const patterns = [
    // RG phrases
    /,?\s*portador(?:a)?\s+d[eo]\s+RG\s+n[ºo°]\.?\s*,?/gi,
    /,?\s*portador(?:a)?\s+d[ao]\s+(?:cédula\s+de\s+)?identidade\s+(?:RG\s+)?n[ºo°]\.?\s*,?/gi,
    // CPF phrases
    /,?\s*inscrit[oa]\s+no\s+CPF\s+(?:sob\s+)?(?:o\s+)?n[ºo°]\.?\s*,?/gi,
    /,?\s*CPF\s+n[ºo°]\.?\s*,?/gi,
    // Órgão expedidor
    /,?\s*(?:expedid[oa]\s+pel[oa]\s+|órgão\s+expedidor\s*:?\s*),?/gi,
    // Endereço
    /,?\s*residente\s+e\s+domiciliad[oa]\s+n[oa]\s*,?/gi,
    /,?\s*com\s+endereço\s+(?:na?|em)\s*,?/gi,
    // Profissão
    /,?\s*profissão\s*,?/gi,
    // Estado civil standalone
    /,?\s*estado\s+civil\s*,?/gi,
    // Clean up resulting double commas, leading/trailing commas
    /,\s*,/g,
    /,\s*\./g,  // ", ." → "."
  ];

  let result = xml;
  for (const p of patterns) {
    result = result.replace(p, (match) => {
      // If match ends with period, keep the period
      if (match.trim().endsWith('.')) return '.';
      return '';
    });
  }
  // Clean multiple spaces
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
  const [partesRequeridas, setPartesRequeridas] = useState("");
  const [dia, setDia] = useState("");
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState("");
  const [generatedDocs, setGeneratedDocs] = useState<{ name: string; blob: Blob }[]>([]);
  const [generating, setGenerating] = useState(false);

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

  const generateSingle = async (templateKey: string) => {
    if (!selectedCliente) { toast.error("Selecione um cliente."); return; }
    const template = FIXED_TEMPLATES.find((t) => t.key === templateKey);
    if (!template) return;
    const cliente = clientes.find((c) => c.id === selectedCliente);
    if (!cliente) return;

    setGenerating(true);
    try {
      const arrayBuffer = await fetchTemplateFile(template.file);
      const doc = createDoc(arrayBuffer, cliente);
      const blob = doc.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const safeName = cliente.nome_completo.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
      const fileName = `${template.label}_${safeName}.docx`;
      setGeneratedDocs((prev) => {
        const filtered = prev.filter((d) => !d.name.startsWith(template.label));
        return [...filtered, { name: fileName, blob }];
      });
      toast.success(`${template.label} gerado com sucesso!`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao gerar ${template.label}: ${err.message}`);
    }
    setGenerating(false);
  };

  const generateAll = async () => {
    if (!selectedCliente) { toast.error("Selecione um cliente."); return; }
    const cliente = clientes.find((c) => c.id === selectedCliente);
    if (!cliente) return;

    setGenerating(true);
    const docs: { name: string; blob: Blob }[] = [];
    const safeName = cliente.nome_completo.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");

    for (const template of FIXED_TEMPLATES) {
      try {
        const arrayBuffer = await fetchTemplateFile(template.file);
        const doc = createDoc(arrayBuffer, cliente);
        const blob = doc.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        docs.push({ name: `${template.label}_${safeName}.docx`, blob });
      } catch (err: any) {
        console.error(err);
        toast.error(`Erro ao gerar ${template.label}: ${err.message}`);
      }
    }
    setGeneratedDocs(docs);
    if (docs.length > 0) toast.success(`${docs.length} documento(s) gerado(s)!`);
    setGenerating(false);
  };

  const createDoc = (arrayBuffer: ArrayBuffer, cliente: Cliente) => {
    const variables = buildVariables(cliente, { partesRequeridas, dia, mes, ano });
    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{", end: "}" },
      nullGetter: () => "",
    });
    doc.render(variables);

    // Post-process: clean orphan phrases from document XML
    const outputZip = doc.getZip();
    const docXml = outputZip.file("word/document.xml");
    if (docXml) {
      const content = docXml.asText();
      const cleaned = cleanOrphanPhrases(content);
      outputZip.file("word/document.xml", cleaned);
    }

    return doc;
  };

  const downloadSingle = (doc: { name: string; blob: Blob }) => saveAs(doc.blob, doc.name);

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
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um cliente..." /></SelectTrigger>
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
                    <p className="text-xs text-yellow-500 mt-2">⚠ Campos em branco serão omitidos automaticamente no documento.</p>
                  )}
                </div>
              )}

              <div>
                <Label>Partes Requeridas (opcional)</Label>
                <Input value={partesRequeridas} onChange={(e) => setPartesRequeridas(e.target.value)} className="mt-1" placeholder="Ex: Empresa X Ltda." />
              </div>

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
                    <Button size="sm" variant="outline" onClick={() => downloadSingle(doc)}>
                      <Download className="h-4 w-4 mr-1" /> DOCX
                    </Button>
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
                <p>Campos em branco são removidos automaticamente do documento final, incluindo frases que os referenciam.</p>
                <p className="font-semibold text-foreground mt-3">Variáveis suportadas:</p>
                <code className="block">
                  {"{NOME DA PARTE REQUERENTE}"}<br />
                  {"{nacionalidade}"} {"{estado civil}"}<br />
                  {"{profissão}"} {"{número do RG}"}<br />
                  {"{órgão expedidor}"} {"{número do CPF}"}<br />
                  {"{endereço com CEP}"} {"{PARTES REQUERIDAS}"}<br />
                  {"{DIA}"} {"{MÊS}"} {"{ANO}"}
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
