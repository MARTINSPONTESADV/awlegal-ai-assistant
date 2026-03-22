import { useEffect, useState, useCallback, useRef } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Clock, Save, CalendarIcon, Trash2, Link2, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CreatableComarcaSelect } from "@/components/CreatableComarcaSelect";
import { CreatableFaseSelect } from "@/components/CreatableFaseSelect";
import { AgendamentoModal } from "@/components/AgendamentoModal";

interface AuxItem { id: string; nome: string; }
const UF_LIST = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const DATE_FORMAT_DISPLAY = (v: string | null) => v ? format(new Date(v + "T00:00:00"), "dd/MM/yyyy") : "—";

function DateField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  const date = value ? new Date(value + "T00:00:00") : undefined;
  return (<div><Label>{label}</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{date ? format(date, "dd/MM/yyyy") : "Selecione..."}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={date} onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : null)} className="p-3 pointer-events-auto" /></PopoverContent></Popover></div>);
}

function CurrencyInput({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  const formatBRL = (cents: number) => (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [cents, setCents] = useState(() => value != null ? Math.round(value * 100) : 0);
  const handleChange = (raw: string) => { const digits = raw.replace(/\D/g, ""); const c = parseInt(digits || "0", 10); setCents(c); onChange(c > 0 ? c / 100 : null); };
  return (<div><Label>{label}</Label><div className="relative mt-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span><Input value={cents > 0 ? formatBRL(cents) : ""} onChange={(e) => handleChange(e.target.value)} className="pl-10" placeholder="0,00" /></div></div>);
}

export default function ProcessoDetail() {
  useEffect(() => { document.title = "Processo — AW LEGALTECH"; }, []);
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const isNew = id === "novo";
  const paiId = searchParams.get("pai");

  const [processo, setProcesso] = useState<Record<string, any> | null>(isNew ? {} : null);
  const [andamentos, setAndamentos] = useState<any[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [andamentoOpen, setAndamentoOpen] = useState(false);
  const [andForm, setAndForm] = useState({ data: new Date().toISOString().split("T")[0], tipo: "Movimentação", descricao: "" });
  const [form, setForm] = useState<Record<string, any>>(isNew ? { status: "ativo", situacao: "Ativo", grupo: "Contencioso", segredo_justica: false, capturar_andamentos: true, ...(paiId ? { processo_pai_id: paiId } : {}) } : {});
  const [taskTriggerOpen, setTaskTriggerOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ titulo: "", data_prazo: "" });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [duplicateField, setDuplicateField] = useState(false);
  const prevFaseRef = useRef<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const [clientes, setClientes] = useState<{ id: string; nome_completo: string }[]>([]);
  const [comarcas, setComarcas] = useState<AuxItem[]>([]);
  const [fases, setFases] = useState<AuxItem[]>([]);
  const [assuntos, setAssuntos] = useState<AuxItem[]>([]);
  const [apensos, setApensos] = useState<any[]>([]);
  const [apensoModalOpen, setApensoModalOpen] = useState(false);
  const [apensoForm, setApensoForm] = useState<Record<string, any>>({});
  const [apensoSaving, setApensoSaving] = useState(false);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [agendamentoModalOpen, setAgendamentoModalOpen] = useState(false);

  const fetchLookups = useCallback(async () => {
    try {
      const [{ data: cl }, { data: co }, { data: fa }, { data: as_ }] = await Promise.all([supabase.from("clientes").select("id, nome_completo").order("nome_completo"), supabase.from("aux_comarcas").select("*").order("nome"), supabase.from("aux_fases").select("*").order("nome"), supabase.from("aux_assuntos").select("*").order("nome")]);
      if (cl) setClientes(cl); if (co) setComarcas(co); if (fa) setFases(fa); if (as_) setAssuntos(as_);
    } catch { toast.error("Não foi possível carregar algumas opções"); }
  }, []);

  const fetchData = useCallback(async () => {
    if (isNew || !id) return;
    const apensosQuery = supabase.from("processos").select("id, numero_processo, numero_cnj, status, situacao, clientes(nome_completo)");
    (apensosQuery as any).eq("processo_pai_id", id);
    const [{ data: p }, { data: a }, { data: m }, { data: ap }, { data: ag }] = await Promise.all([
      supabase.from("processos").select("*, clientes(id, nome_completo)").eq("id", id).single(),
      supabase.from("andamentos").select("*").eq("processo_id", id).order("data", { ascending: false }),
      supabase.from("movimentacoes").select("*").eq("processo_id", id).order("data_movimentacao", { ascending: false }),
      apensosQuery,
      supabase.from("agenda").select("*, clientes(nome_completo)").eq("processo_id", id).order("data_hora_inicio", { ascending: true, nullsFirst: false }),
    ]);
    if (p) { setProcesso(p); setForm(p); prevFaseRef.current = p.fase_id || p.fase || null; prevStatusRef.current = p.status_processual || null; }
    if (a) setAndamentos(a); if (m) setMovimentacoes(m); if (ap) setApensos(ap); if (ag) setAgendamentos(ag);
  }, [id, isNew]);

  useEffect(() => { fetchLookups(); fetchData(); }, [fetchLookups, fetchData]);

  const set = useCallback((field: string, value: any) => { setForm((p) => ({ ...p, [field]: value })); }, []);

  const handleSave = async () => {
    if (!form.cliente_id) { toast.error("Selecione um cliente"); return; }
    if (isNew && !form.numero_cnj?.trim()) { toast.error("Preencha o Nº CNJ"); return; }
    const faseChanged = !isNew && prevFaseRef.current !== (form.fase_id || form.fase || null);
    const statusChanged = !isNew && prevStatusRef.current !== (form.status_processual || null);
    const { clientes: _, id: _id, created_at, updated_at, ...payload } = form;
    if (isNew) {
      const { data, error } = await supabase.from("processos").insert({ ...payload, created_by: user?.id } as any).select("id").single();
      if (error) { if (error.code === "23505" && error.message?.includes("numero_processo")) { toast.error("Erro: Este número de processo já está cadastrado no sistema."); setDuplicateField(true); return; } toast.error(`Erro ao criar processo: ${error.message}`); return; }
      setDuplicateField(false); toast.success("Processo criado com sucesso"); navigate(`/processos/${data.id}`);
    } else {
      const { error } = await supabase.from("processos").update(payload).eq("id", id);
      if (error) { if (error.code === "23505" && error.message?.includes("numero_processo")) { toast.error("Erro: Este número de processo já está cadastrado no sistema."); setDuplicateField(true); return; } toast.error(`Erro ao atualizar: ${error.message}`); return; }
      setDuplicateField(false); toast.success("Processo atualizado");
      if (faseChanged || statusChanged) { setTaskTriggerOpen(true); }
      fetchData();
    }
  };

  const handleTaskTriggerSave = async () => {
    if (!taskForm.titulo.trim() || !taskForm.data_prazo) { toast.error("Título e data são obrigatórios"); return; }
    const { error } = await supabase.from("agenda").insert({ titulo: taskForm.titulo, data_prazo: taskForm.data_prazo, processo_id: id, created_by: user?.id });
    if (error) { toast.error("Erro ao criar prazo"); return; }
    toast.success("Prazo agendado!"); setTaskTriggerOpen(false); setTaskForm({ titulo: "", data_prazo: "" }); fetchData();
  };

  const openApensoModal = () => {
    setApensoForm({ numero_processo: "", numero_cnj: "", status_processual: form.status_processual ?? "", localizador: form.localizador ?? "", objeto_acao: form.objeto_acao ?? "", fase_id: form.fase_id ?? "", adverso: form.adverso ?? "", grupo_acao: form.grupo_acao ?? "", area_atuacao: form.area_atuacao ?? "", comarca_id: form.comarca_id ?? "", uf: form.uf ?? "", pasta: form.pasta ?? "", valor_causa: form.valor_causa ?? null, data_contratacao: form.data_contratacao ?? null, honorarios_percentual: form.honorarios_percentual ?? null });
    setApensoModalOpen(true);
  };

  const handleSaveApenso = async () => {
    if (!apensoForm.numero_cnj?.trim()) { toast.error("Preencha o Nº CNJ do apenso"); return; }
    setApensoSaving(true);
    const payload = { ...apensoForm, cliente_id: form.cliente_id, processo_pai_id: id, status: "ativo", situacao: "Ativo", grupo: form.grupo ?? "Contencioso", segredo_justica: form.segredo_justica ?? false, capturar_andamentos: true, created_by: user?.id };
    const { error } = await supabase.from("processos").insert(payload as any).select("id").single();
    setApensoSaving(false);
    if (error) { if (error.code === "23505" && error.message?.includes("numero_processo")) { toast.error("Este número de processo já está cadastrado."); return; } toast.error(`Erro ao criar apenso: ${error.message}`); return; }
    toast.success("Processo apenso criado com sucesso"); setApensoModalOpen(false); fetchData();
  };

  const setApenso = (field: string, value: any) => setApensoForm(p => ({ ...p, [field]: value }));

  const handleAddAndamento = async () => {
    if (!andForm.descricao.trim()) { toast.error("Descrição é obrigatória"); return; }
    const { error } = await supabase.from("andamentos").insert({ ...andForm, processo_id: id, created_by: user?.id });
    if (error) { toast.error("Erro ao adicionar andamento"); return; }
    toast.success("Andamento adicionado"); setAndamentoOpen(false); setAndForm({ data: new Date().toISOString().split("T")[0], tipo: "Movimentação", descricao: "" }); fetchData();
  };

  if (!processo && !isNew) return (<div className="py-12 text-center text-muted-foreground"><p>Carregando processo...</p><Button variant="link" onClick={() => navigate("/processos")} className="mt-2">Voltar para Processos</Button></div>);

  return (
    <>
      <Breadcrumbs items={[{ label: "Processos", href: "/processos" }, { label: isNew ? "Novo Processo" : (processo?.numero_processo || processo?.numero_cnj || "Sem número") }]} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-3xl font-bold">{isNew ? "Novo Processo" : (processo?.numero_processo || processo?.numero_cnj || "Processo")}</h2>
          {!isNew && processo?.clientes && (<Link to={`/clientes/${processo.clientes.id}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cliente: {processo.clientes.nome_completo}</Link>)}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" />Salvar Alterações</Button>
          {!isNew && isAdmin && (<Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4 mr-2" />Excluir</Button>)}
        </div>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita e apagará todos os dados vinculados a este processo.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => { const { error } = await supabase.from("processos").delete().eq("id", id); if (error) { toast.error("Erro ao excluir processo"); return; } toast.success("Processo removido"); navigate("/processos"); }}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>

      <Tabs defaultValue="detalhes" className="w-full">
        <TabsList className="mb-6"><TabsTrigger value="detalhes">Detalhes</TabsTrigger>{!isNew && <TabsTrigger value="apensos">Processos Apensos</TabsTrigger>}{!isNew && <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>}</TabsList>

        <TabsContent value="detalhes">
          <div className="space-y-6">
            <Card><CardHeader><CardTitle className="text-lg">Identificação</CardTitle></CardHeader><CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Cliente *</Label><Select value={form.cliente_id ?? ""} onValueChange={(v) => set("cliente_id", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger><SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Nº do Processo</Label><Input value={form.numero_processo ?? ""} onChange={(e) => { set("numero_processo", e.target.value); setDuplicateField(false); }} className={cn("mt-1", duplicateField && "border-destructive ring-destructive focus-visible:ring-destructive")} /></div>
                <div><Label>Nº CNJ *</Label><Input value={form.numero_cnj ?? ""} onChange={(e) => set("numero_cnj", e.target.value)} className="mt-1" placeholder="0000000-00.0000.0.00.0000" /></div>
                <div><Label>Nº Antigo</Label><Input value={form.numero_antigo ?? ""} onChange={(e) => set("numero_antigo", e.target.value)} className="mt-1" /></div>
                <div><Label>Partes Requeridas</Label><Input value={form.partes_requeridas ?? ""} onChange={(e) => set("partes_requeridas", e.target.value)} className="mt-1" /></div>
                <div><Label>Adverso</Label><Input value={form.adverso ?? ""} onChange={(e) => set("adverso", e.target.value)} className="mt-1" /></div>
                <div><Label>Situação</Label><Select value={form.situacao ?? ""} onValueChange={(v) => set("situacao", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{[{ value: "Ativo", label: "Ativo" }, { value: "Inativo", label: "Inativo" }, { value: "Suspenso", label: "Suspenso" }].map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Grupo</Label><Select value={form.grupo ?? ""} onValueChange={(v) => set("grupo", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{[{ value: "Contencioso", label: "Contencioso" }, { value: "Consultivo", label: "Consultivo" }].map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Tipo de Processo</Label><Input value={form.tipo_processo ?? ""} onChange={(e) => set("tipo_processo", e.target.value)} className="mt-1" /></div>
                <div><Label>Grupo do Cliente</Label><Input value={form.grupo_cliente ?? ""} onChange={(e) => set("grupo_cliente", e.target.value)} className="mt-1" /></div>
                <div><Label>Pasta</Label><Input value={form.pasta ?? ""} onChange={(e) => set("pasta", e.target.value)} className="mt-1" /></div>
                <div><Label>Etiqueta</Label><Input value={form.etiqueta ?? ""} onChange={(e) => set("etiqueta", e.target.value)} className="mt-1" /></div>
              </div>
            </CardContent></Card>

            <Separator />

            <Card><CardHeader><CardTitle className="text-lg">Detalhes Jurídicos</CardTitle></CardHeader><CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Grupo da Ação</Label><Input value={form.grupo_acao ?? ""} onChange={(e) => set("grupo_acao", e.target.value)} className="mt-1" /></div>
                <div><Label>Status Processual</Label><Input value={form.status_processual ?? ""} onChange={(e) => set("status_processual", e.target.value)} className="mt-1" /></div>
                <div><Label>Área de Atuação</Label><Input value={form.area_atuacao ?? ""} onChange={(e) => set("area_atuacao", e.target.value)} className="mt-1" /></div>
                <div><Label>Objeto da Ação</Label><Input value={form.objeto_acao ?? ""} onChange={(e) => set("objeto_acao", e.target.value)} className="mt-1" /></div>
                <CreatableComarcaSelect comarcas={comarcas} value={form.comarca_id ?? ""} onChange={(v) => set("comarca_id", v)} onCreated={(newItem) => setComarcas(prev => [...prev, newItem].sort((a, b) => a.nome.localeCompare(b.nome)))} />
                <CreatableFaseSelect fases={fases} value={form.fase_id ?? ""} onChange={(v) => set("fase_id", v)} onCreated={(newItem) => setFases(prev => [...prev, newItem].sort((a, b) => a.nome.localeCompare(b.nome)))} onDeleted={(delId) => setFases(prev => prev.filter(f => f.id !== delId))} />
                <div><Label>Assunto</Label><Select value={form.assunto_id ?? ""} onValueChange={(v) => set("assunto_id", v)}><SelectTrigger className="mt-1"><SelectValue placeholder={assuntos.length ? "Selecione..." : "Carregando..."} /></SelectTrigger><SelectContent>{assuntos.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Prognóstico</Label><Select value={form.prognostico ?? ""} onValueChange={(v) => set("prognostico", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{["Procedente","Improcedente","Parcial","Acordo"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
              </div>
            </CardContent></Card>

            <Separator />

            <Card><CardHeader><CardTitle className="text-lg">Localização e Tramitação</CardTitle></CardHeader><CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Local de Tramitação</Label><Input value={form.local_tramite ?? ""} onChange={(e) => set("local_tramite", e.target.value)} className="mt-1" /></div>
                <div><Label>UF</Label><Select value={form.uf ?? ""} onValueChange={(v) => set("uf", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{UF_LIST.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Localizador</Label><Input value={form.localizador ?? ""} onChange={(e) => set("localizador", e.target.value)} className="mt-1" /></div>
                <div><Label>Responsável</Label><Input value={form.responsavel ?? ""} onChange={(e) => set("responsavel", e.target.value)} className="mt-1" /></div>
              </div>
            </CardContent></Card>

            <Separator />

            <Card><CardHeader><CardTitle className="text-lg">Decisões</CardTitle></CardHeader><CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Detalhes</Label><Textarea value={form.detalhes ?? ""} onChange={(e) => set("detalhes", e.target.value)} className="mt-1" rows={3} /></div>
                <div><Label>Status 1º Grau</Label><Input value={form.status_1_grau ?? ""} onChange={(e) => set("status_1_grau", e.target.value)} className="mt-1" /></div>
                <div><Label>Status 2º Grau</Label><Input value={form.status_2_grau ?? ""} onChange={(e) => set("status_2_grau", e.target.value)} className="mt-1" /></div>
                <div><Label>Juiz 1º Grau</Label><Input value={form.juiz_1_grau ?? ""} onChange={(e) => set("juiz_1_grau", e.target.value)} className="mt-1" /></div>
                <div><Label>Parceiro</Label><Input value={form.parceiro ?? ""} onChange={(e) => set("parceiro", e.target.value)} className="mt-1" /></div>
                <div><Label>Origem</Label><Input value={form.origem ?? ""} onChange={(e) => set("origem", e.target.value)} className="mt-1" /></div>
                <div className="col-span-2"><Label>Acórdão/Decisão</Label><Textarea value={form.acordao_decisao ?? ""} onChange={(e) => set("acordao_decisao", e.target.value)} className="mt-1" rows={3} /></div>
                <div><Label>Relator 2º Grau</Label><Input value={form.relator_2_grau ?? ""} onChange={(e) => set("relator_2_grau", e.target.value)} className="mt-1" /></div>
                <div><Label>Câmara/Turma</Label><Input value={form.camara_turma ?? ""} onChange={(e) => set("camara_turma", e.target.value)} className="mt-1" /></div>
              </div>
            </CardContent></Card>

            <Separator />

            <Card><CardHeader><CardTitle className="text-lg">Datas</CardTitle></CardHeader><CardContent>
              <div className="grid grid-cols-2 gap-4">
                <DateField label="Data de Contratação" value={form.data_contratacao} onChange={(v) => set("data_contratacao", v)} />
                <DateField label="Data de Distribuição" value={form.data_distribuicao} onChange={(v) => set("data_distribuicao", v)} />
                <DateField label="Data da Sentença" value={form.data_sentenca} onChange={(v) => set("data_sentenca", v)} />
                <DateField label="Data do Acórdão" value={(form as any).data_acordao} onChange={(v) => set("data_acordao", v)} />
                <DateField label="Data Trânsito em Julgado" value={form.data_transito_julgado} onChange={(v) => set("data_transito_julgado", v)} />
                <DateField label="Data de Execução" value={form.data_execucao} onChange={(v) => set("data_execucao", v)} />
                <DateField label="Data de Encerramento" value={form.data_encerramento} onChange={(v) => set("data_encerramento", v)} />
                <DateField label="Data da Últ. Movimentação" value={form.data_ultima_movimentacao ? form.data_ultima_movimentacao.split("T")[0] : null} onChange={(v) => set("data_ultima_movimentacao", v)} />
              </div>
            </CardContent></Card>

            <Separator />

            {isAdmin && (
              <Card><CardHeader><CardTitle className="text-lg">Valores e Configurações</CardTitle></CardHeader><CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <CurrencyInput label="Valor da Causa" value={form.valor_causa} onChange={(v) => set("valor_causa", v)} />
                  <CurrencyInput label="Outro Valor" value={form.outro_valor} onChange={(v) => set("outro_valor", v)} />
                  <CurrencyInput label="Valor de Execução" value={form.valor_execucao} onChange={(v) => set("valor_execucao", v)} />
                  <CurrencyInput label="Valor de Sentença (Tramitando)" value={form.valor_sentenca} onChange={(v) => set("valor_sentenca", v)} />
                  <CurrencyInput label="Valor de Acordo" value={form.valor_acordo} onChange={(v) => set("valor_acordo", v)} />
                  <CurrencyInput label="Contingência" value={form.contingencia} onChange={(v) => set("contingencia", v)} />
                  <div><Label>Percentual de Honorários (%)</Label><div className="relative mt-1"><Input type="number" min={0} max={100} step={0.01} value={form.honorarios_percentual ?? ""} onChange={(e) => set("honorarios_percentual", e.target.value ? Number(e.target.value) : null)} className="pr-8" placeholder="0" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span></div></div>
                  <div><Label>Status do Pagamento</Label><Select value={form.status_pagamento_honorarios ?? "Pendente"} onValueChange={(v) => set("status_pagamento_honorarios", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Pago">Pago</SelectItem></SelectContent></Select></div>

                  {(() => {
                    const baseValor = Number(form.valor_execucao || 0) || Number(form.valor_acordo || 0);
                    const pctVal = Number(form.honorarios_percentual || 0);
                    const devidoEscritorio = baseValor * (pctVal / 100);
                    const devidoCliente = baseValor - devidoEscritorio;
                    const valSentenca = Number(form.valor_sentenca || 0);
                    const expectEscritorio = valSentenca * (pctVal / 100);
                    const expectCliente = valSentenca - expectEscritorio;
                    const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
                    return (<>
                      {baseValor > 0 && pctVal > 0 && (<div className="col-span-2 rounded-lg border border-border bg-muted/30 p-4 space-y-2"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Divisão — Acordo / Execução</p><div className="flex justify-between text-sm"><span className="text-muted-foreground">Devido ao Escritório:</span><span className="font-bold text-foreground">{fmt(devidoEscritorio)}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Devido ao Cliente:</span><span className="font-bold text-foreground">{fmt(devidoCliente)}</span></div></div>)}
                      {valSentenca > 0 && pctVal > 0 && (<div className="col-span-2 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-4 space-y-2"><p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Expectativa — Sentença (Tramitando)</p><div className="flex justify-between text-sm"><span className="text-muted-foreground">Expectativa do Escritório:</span><span className="font-bold text-foreground">{fmt(expectEscritorio)}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Expectativa do Cliente:</span><span className="font-bold text-foreground">{fmt(expectCliente)}</span></div></div>)}
                    </>);
                  })()}

                  <div><Label>Pedido</Label><Textarea value={form.pedido ?? ""} onChange={(e) => set("pedido", e.target.value)} className="mt-1" rows={3} /></div>
                  <div className="col-span-2"><Label>Observação</Label><Textarea value={form.observacao ?? ""} onChange={(e) => set("observacao", e.target.value)} className="mt-1" rows={3} /></div>
                  <div><Label>Segredo de Justiça</Label><RadioGroup value={form.segredo_justica ? "sim" : "nao"} onValueChange={(v) => set("segredo_justica", v === "sim")} className="flex gap-4 mt-2"><div className="flex items-center gap-2"><RadioGroupItem value="sim" id="sj-sim" /><Label htmlFor="sj-sim">Sim</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="nao" id="sj-nao" /><Label htmlFor="sj-nao">Não</Label></div></RadioGroup></div>
                  <div><Label>Capturar Andamentos</Label><RadioGroup value={form.capturar_andamentos ? "sim" : "nao"} onValueChange={(v) => set("capturar_andamentos", v === "sim")} className="flex gap-4 mt-2"><div className="flex items-center gap-2"><RadioGroupItem value="sim" id="ca-sim" /><Label htmlFor="ca-sim">Sim</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="nao" id="ca-nao" /><Label htmlFor="ca-nao">Não</Label></div></RadioGroup></div>
                </div>
              </CardContent></Card>
            )}

            <Button onClick={handleSave} className="w-full" size="lg"><Save className="h-4 w-4 mr-2" />Salvar Alterações</Button>

            {!isNew && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-4"><h3 className="font-display text-xl font-bold">Andamentos</h3><Button variant="outline" onClick={() => setAndamentoOpen(true)}><Plus className="h-4 w-4 mr-2" />Adicionar Andamento</Button></div>
                {(() => {
                  const combined = [
                    ...andamentos.map((a) => ({ id: a.id, date: a.data, tipo: a.tipo, descricao: a.descricao, source: "andamento" as const })),
                    ...movimentacoes.map((m) => ({ id: m.id, date: m.data_movimentacao, tipo: m.tipo_movimentacao, descricao: m.descricao ? `${m.descricao}\n\n${m.conteudo}` : m.conteudo, source: "movimentacao" as const })),
                  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  return combined.length > 0 ? (
                    <div className="relative border-l-2 border-border ml-4 space-y-6 pl-6">
                      {combined.map((item) => (
                        <div key={`${item.source}-${item.id}`} className="relative">
                          <div className={cn("absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 bg-background", item.source === "movimentacao" ? "border-primary" : "border-border")} />
                          <div className="rounded-lg border border-border p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={item.source === "movimentacao" ? "default" : "secondary"}>{item.tipo}</Badge>
                              {item.source === "movimentacao" && (<Badge variant="outline" className="text-[10px]">Automático</Badge>)}
                              <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{DATE_FORMAT_DISPLAY(item.date)}</span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{item.descricao}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (<Card><CardContent className="text-center text-muted-foreground py-8">Nenhum andamento registrado.</CardContent></Card>);
                })()}
              </div>
            )}
          </div>
        </TabsContent>

        {!isNew && (
          <TabsContent value="apensos">
            <Card><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-lg">Processos Apensos</CardTitle><Button variant="outline" onClick={openApensoModal}><Link2 className="h-4 w-4 mr-2" />Vincular Processo Apenso</Button></div></CardHeader><CardContent>
              {apensos.length > 0 ? (<div className="space-y-3">{apensos.map((ap) => (<Link key={ap.id} to={`/processos/${ap.id}`} className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-muted-foreground" /><div><p className="font-medium text-sm">{ap.numero_processo || ap.numero_cnj || "Sem número"}</p><p className="text-xs text-muted-foreground">{(ap as any).clientes?.nome_completo}</p></div></div><Badge variant={ap.situacao === "Ativo" ? "default" : "secondary"}>{ap.situacao || ap.status}</Badge></Link>))}</div>) : (<p className="text-center text-muted-foreground py-8">Nenhum processo apenso vinculado.</p>)}
            </CardContent></Card>
          </TabsContent>
        )}

        {!isNew && (
          <TabsContent value="agendamentos">
            <Card><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-lg">Agendamentos</CardTitle><Button variant="outline" onClick={() => setAgendamentoModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo Agendamento</Button></div></CardHeader><CardContent>
              {agendamentos.length > 0 ? (<div className="space-y-3">{agendamentos.map((ag) => (<div key={ag.id} className="flex items-center justify-between rounded-lg border border-border p-4 gap-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2 flex-wrap"><p className="font-medium text-sm">{ag.titulo}</p><Badge variant="outline" className="text-xs">{ag.tipo || "Prazo"}</Badge></div>{ag.descricao && <p className="text-xs text-muted-foreground mt-1">{ag.descricao}</p>}</div><div className="flex items-center gap-2 shrink-0"><Badge variant={ag.status === "pendente" ? "outline" : ag.status === "concluido" ? "default" : "secondary"}>{ag.status}</Badge><span className="text-xs text-muted-foreground flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{ag.data_hora_inicio ? format(new Date(ag.data_hora_inicio), "dd/MM/yyyy HH:mm") : DATE_FORMAT_DISPLAY(ag.data_prazo)}</span><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={async () => { const { error } = await supabase.from("agenda").delete().eq("id", ag.id); if (error) { toast.error("Erro ao excluir"); return; } toast.success("Agendamento excluído"); fetchData(); }}><Trash2 className="h-4 w-4" /></Button></div></div>))}</div>) : (<p className="text-center text-muted-foreground py-8">Nenhum agendamento vinculado a este processo.</p>)}
            </CardContent></Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={andamentoOpen} onOpenChange={setAndamentoOpen}><DialogContent><DialogHeader><DialogTitle>Adicionar Andamento</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div><Label>Data</Label><Input type="date" value={andForm.data} onChange={(e) => setAndForm((p) => ({ ...p, data: e.target.value }))} className="mt-1" /></div><div><Label>Tipo</Label><Select value={andForm.tipo} onValueChange={(v) => setAndForm((p) => ({ ...p, tipo: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["Movimentação","Despacho","Decisão","Sentença","Petição","Audiência","Outro"].map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent></Select></div><div><Label>Descrição</Label><Textarea value={andForm.descricao} onChange={(e) => setAndForm((p) => ({ ...p, descricao: e.target.value }))} className="mt-1" /></div></div><Button onClick={handleAddAndamento} className="w-full">Salvar</Button></DialogContent></Dialog>

      <Dialog open={taskTriggerOpen} onOpenChange={setTaskTriggerOpen}><DialogContent><DialogHeader><DialogTitle>Agendar Prazo</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Agende um prazo vinculado a este processo.</p><div className="grid gap-4 py-4"><div><Label>Título do Prazo</Label><Input value={taskForm.titulo} onChange={(e) => setTaskForm(p => ({ ...p, titulo: e.target.value }))} className="mt-1" placeholder="Ex: Prazo para manifestação" /></div><div><Label>Data do Prazo</Label><Input type="date" value={taskForm.data_prazo} onChange={(e) => setTaskForm(p => ({ ...p, data_prazo: e.target.value }))} className="mt-1" /></div></div><div className="flex gap-2"><Button onClick={handleTaskTriggerSave} className="flex-1">Agendar</Button><Button variant="outline" onClick={() => setTaskTriggerOpen(false)} className="flex-1">Cancelar</Button></div></DialogContent></Dialog>

      <Dialog open={apensoModalOpen} onOpenChange={setApensoModalOpen}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Novo Processo Apenso</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Os campos abaixo foram herdados do processo pai. Preencha o CNJ e ajuste o que for necessário.</p><div className="grid grid-cols-2 gap-4 py-4">
        <div className="col-span-2"><Label>Nº do Processo (CNJ) *</Label><Input value={apensoForm.numero_cnj ?? ""} onChange={(e) => { setApenso("numero_cnj", e.target.value); setApenso("numero_processo", e.target.value); }} className="mt-1" placeholder="0000000-00.0000.0.00.0000" autoFocus /></div>
        <CreatableFaseSelect fases={fases} value={apensoForm.fase_id ?? ""} onChange={(v) => setApenso("fase_id", v)} onCreated={(newItem) => setFases(prev => [...prev, newItem].sort((a, b) => a.nome.localeCompare(b.nome)))} onDeleted={(delId) => setFases(prev => prev.filter(f => f.id !== delId))} />
        <div><Label>Status Processual</Label><Input value={apensoForm.status_processual ?? ""} onChange={(e) => setApenso("status_processual", e.target.value)} className="mt-1" /></div>
        <div><Label>Localizador</Label><Input value={apensoForm.localizador ?? ""} onChange={(e) => setApenso("localizador", e.target.value)} className="mt-1" /></div>
        <div className="col-span-2"><Label>Objeto da Ação</Label><Input value={apensoForm.objeto_acao ?? ""} onChange={(e) => setApenso("objeto_acao", e.target.value)} className="mt-1" /></div>
        <Separator className="col-span-2" /><p className="col-span-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Dados Herdados (editáveis)</p>
        <div><Label>Adverso</Label><Input value={apensoForm.adverso ?? ""} onChange={(e) => setApenso("adverso", e.target.value)} className="mt-1" /></div>
        <div><Label>Grupo da Ação</Label><Input value={apensoForm.grupo_acao ?? ""} onChange={(e) => setApenso("grupo_acao", e.target.value)} className="mt-1" /></div>
        <div><Label>Área de Atuação</Label><Input value={apensoForm.area_atuacao ?? ""} onChange={(e) => setApenso("area_atuacao", e.target.value)} className="mt-1" /></div>
        <CreatableComarcaSelect comarcas={comarcas} value={apensoForm.comarca_id ?? ""} onChange={(v) => setApenso("comarca_id", v)} onCreated={(newItem) => setComarcas(prev => [...prev, newItem].sort((a, b) => a.nome.localeCompare(b.nome)))} />
        <div><Label>UF</Label><Select value={apensoForm.uf ?? ""} onValueChange={(v) => setApenso("uf", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{UF_LIST.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Pasta</Label><Input value={apensoForm.pasta ?? ""} onChange={(e) => setApenso("pasta", e.target.value)} className="mt-1" /></div>
      </div><div className="flex gap-2"><Button onClick={handleSaveApenso} disabled={apensoSaving} className="flex-1">{apensoSaving ? "Salvando..." : "Criar Processo Apenso"}</Button><Button variant="outline" onClick={() => setApensoModalOpen(false)} className="flex-1">Cancelar</Button></div></DialogContent></Dialog>

      <AgendamentoModal open={agendamentoModalOpen} onOpenChange={setAgendamentoModalOpen} onSaved={fetchData} processoId={id} processoLabel={processo?.numero_processo || processo?.numero_cnj || "Processo atual"} />
    </>
  );
}
