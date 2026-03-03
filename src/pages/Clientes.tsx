import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  status_cliente: string;
}

const emptyCliente = {
  nome_completo: "",
  nacionalidade: "",
  estado_civil: "",
  profissao: "",
  rg: "",
  orgao_expedidor: "",
  cpf: "",
  endereco_cep: "",
};

export default function Clientes() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCliente);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchClientes = useCallback(async () => {
    const { data } = await supabase.from("clientes").select("*").order("nome_completo");
    if (data) setClientes(data as Cliente[]);
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const handleSave = async () => {
    if (!form.nome_completo.trim()) { toast.error("Nome é obrigatório"); return; }
    if (editing) {
      const { error } = await supabase.from("clientes").update(form).eq("id", editing);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Cliente atualizado");
    } else {
      const { error } = await supabase.from("clientes").insert({ ...form, created_by: user?.id });
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Cliente cadastrado");
    }
    setOpen(false); setEditing(null); setForm(emptyCliente); fetchClientes();
  };

  const handleEdit = (c: Cliente) => {
    setEditing(c.id);
    setForm({ nome_completo: c.nome_completo, nacionalidade: c.nacionalidade ?? "", estado_civil: c.estado_civil ?? "", profissao: c.profissao ?? "", rg: c.rg ?? "", orgao_expedidor: c.orgao_expedidor ?? "", cpf: c.cpf ?? "", endereco_cep: c.endereco_cep ?? "" });
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("clientes").delete().eq("id", deleteId);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Cliente removido"); setDeleteId(null); fetchClientes();
  };

  const filtered = clientes.filter((c) => c.nome_completo.toLowerCase().includes(search.toLowerCase()) || (c.cpf ?? "").includes(search));

  const fields: { key: keyof typeof emptyCliente; label: string; full?: boolean }[] = [
    { key: "nome_completo", label: "Nome Completo", full: true },
    { key: "nacionalidade", label: "Nacionalidade" },
    { key: "estado_civil", label: "Estado Civil" },
    { key: "profissao", label: "Profissão" },
    { key: "rg", label: "RG" },
    { key: "orgao_expedidor", label: "Órgão Expedidor" },
    { key: "cpf", label: "CPF" },
    { key: "endereco_cep", label: "Endereço com CEP", full: true },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-3xl font-bold">Clientes</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyCliente); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2 py-4">
              {fields.map(({ key, label, full }) => (
                <div key={key} className={full ? "sm:col-span-2" : ""}>
                  <Label>{label}</Label>
                  <Input value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className="mt-1" />
                </div>
              ))}
            </div>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">CPF</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/clientes/${c.id}`)}>
                  <TableCell className="font-medium text-foreground hover:underline">{c.nome_completo}</TableCell>
                  <TableCell className="hidden md:table-cell">{c.cpf || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant={c.status_cliente === "Ativo" ? "default" : c.status_cliente === "Inativo" ? "secondary" : "outline"}
                      className={c.status_cliente === "Ativo" ? "bg-success text-success-foreground" : c.status_cliente === "Assinatura Pendente" ? "bg-warning text-warning-foreground" : ""}>
                      {c.status_cliente || "Assinatura Pendente"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/clientes/${c.id}`)}><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      {isAdmin && (<Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4" /></Button>)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum cliente encontrado.</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita e apagará todos os dados vinculados a este cliente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
