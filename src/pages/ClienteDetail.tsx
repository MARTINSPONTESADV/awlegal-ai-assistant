import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pencil, Plus, FileText, Eye, Trash2 } from "lucide-react";

interface Cliente { id: string; nome_completo: string; nacionalidade: string | null; estado_civil: string | null; profissao: string | null; rg: string | null; orgao_expedidor: string | null; cpf: string | null; endereco_cep: string | null; created_at: string; status_cliente: string; }
interface Processo { id: string; numero_processo: string | null; numero_cnj: string | null; status: string; area_atuacao: string | null; created_at: string; }

export default function ClienteDetail() {
  useEffect(() => { document.title = "Cliente — AW LEGALTECH"; }, []);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ nome_completo: "", nacionalidade: "", estado_civil: "", profissao: "", rg: "", orgao_expedidor: "", cpf: "", endereco_cep: "" });

  const fetchData = useCallback(async () => {
    if (!id) return;
    const [{ data: c }, { data: p }] = await Promise.all([supabase.from("clientes").select("*").eq("id", id).single(), supabase.from("processos").select("*").eq("cliente_id", id).order("created_at", { ascending: false })]);
    if (c) { setCliente(c as Cliente); setForm({ nome_completo: c.nome_completo, nacionalidade: c.nacionalidade ?? "", estado_civil: c.estado_civil ?? "", profissao: c.profissao ?? "", rg: c.rg ?? "", orgao_expedidor: c.orgao_expedidor ?? "", cpf: c.cpf ?? "", endereco_cep: c.endereco_cep ?? "" }); }
    if (p) setProcessos(p as Processo[]);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!id) return;
    const { error } = await supabase.from("clientes").update(form).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success("Cliente atualizado"); setEditOpen(false); fetchData();
  };

  if (!cliente) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  const infoFields = [{ label: "CPF", value: cliente.cpf }, { label: "RG", value: cliente.rg }, { label: "Órgão Expedidor", value: cliente.orgao_expedidor }, { label: "Nacionalidade", value: cliente.nacionalidade }, { label: "Estado Civil", value: cliente.estado_civil }, { label: "Profissão", value: cliente.profissao }, { label: "Endereço com CEP", value: cliente.endereco_cep, full: true }];
  const editFields = [{ key: "nome_completo", label: "Nome Completo", full: true }, { key: "nacionalidade", label: "Nacionalidade" }, { key: "estado_civil", label: "Estado Civil" }, { key: "profissao", label: "Profissão" }, { key: "rg", label: "RG" }, { key: "orgao_expedidor", label: "Órgão Expedidor" }, { key: "cpf", label: "CPF" }, { key: "endereco_cep", label: "Endereço com CEP", full: true }];

  return (
    <>
      <Breadcrumbs items={[{ label: "Clientes", href: "/clientes" }, { label: cliente.nome_completo }]} />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-3xl font-bold">{cliente.nome_completo}</h2>
          <Select value={cliente.status_cliente || "Assinatura Pendente"} onValueChange={async (val) => { await supabase.from("clientes").update({ status_cliente: val }).eq("id", id); setCliente({ ...cliente, status_cliente: val }); toast.success("Status atualizado"); }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Assinatura Pendente">Assinatura Pendente</SelectItem><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4 mr-2" />Editar Dados</Button>
          {isAdmin && (<Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4 mr-2" />Excluir</Button>)}
          <Button onClick={() => navigate(`/processos?novo=true&cliente_id=${id}`)}><Plus className="h-4 w-4 mr-2" />Novo Processo</Button>
        </div>
      </div>
      <Tabs defaultValue="dados">
        <TabsList><TabsTrigger value="dados">Visão Geral</TabsTrigger><TabsTrigger value="processos">Processos ({processos.length})</TabsTrigger><TabsTrigger value="documentos">Documentos</TabsTrigger></TabsList>
        <TabsContent value="dados" className="mt-6"><Card><CardHeader><CardTitle>Dados Pessoais</CardTitle></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{infoFields.map((f) => (<div key={f.label} className={f.full ? "sm:col-span-2 lg:col-span-3" : ""}><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{f.label}</p><p className="font-medium">{f.value || "—"}</p></div>))}</div></CardContent></Card></TabsContent>
        <TabsContent value="processos" className="mt-6"><Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>Nº Processo</TableHead><TableHead>Área</TableHead><TableHead>Status</TableHead><TableHead className="w-16">Ações</TableHead></TableRow></TableHeader><TableBody>{processos.map((p) => (<TableRow key={p.id}><TableCell className="font-medium">{p.numero_processo || p.numero_cnj || "—"}</TableCell><TableCell>{p.area_atuacao || "—"}</TableCell><TableCell><Badge variant={p.status === "ativo" ? "default" : "secondary"}>{p.status === "ativo" ? "Ativo" : "Arquivado"}</Badge></TableCell><TableCell><Button size="icon" variant="ghost" onClick={() => navigate(`/processos/${p.id}`)}><Eye className="h-4 w-4" /></Button></TableCell></TableRow>))}{processos.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum processo vinculado.</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>
        <TabsContent value="documentos" className="mt-6"><Card><CardContent className="text-center text-muted-foreground py-12"><FileText className="h-10 w-10 mx-auto mb-3 opacity-50" /><p>Use o <Link to="/generator" className="text-foreground underline">Gerador de Documentos</Link> para criar documentos para este cliente.</p></CardContent></Card></TabsContent>
      </Tabs>
      <Dialog open={editOpen} onOpenChange={setEditOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Editar Cliente</DialogTitle></DialogHeader><div className="grid gap-4 sm:grid-cols-2 py-4">{editFields.map(({ key, label, full }) => (<div key={key} className={full ? "sm:col-span-2" : ""}><Label>{label}</Label><Input value={(form as any)[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className="mt-1" /></div>))}</div><Button onClick={handleSave} className="w-full">Salvar</Button></DialogContent></Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita e apagará todos os dados vinculados a este cliente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => { const { error } = await supabase.from("clientes").delete().eq("id", id); if (error) { toast.error("Erro ao excluir"); return; } toast.success("Cliente removido"); navigate("/clientes"); }}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}
