import { useEffect, useState, useCallback, useMemo } from "react";
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
import { Plus, Pencil, Trash2, Search, Eye, Users, CheckCircle2, Clock3, XCircle, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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

// Status pill config
const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; badgeClass: string }> = {
  all:                  { label: "Todos",              icon: Users,          color: "text-foreground",    badgeClass: "border-white/10 bg-white/[0.05] text-foreground" },
  Ativo:                { label: "Ativos",             icon: CheckCircle2,   color: "text-emerald-400",   badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  "Assinatura Pendente":{ label: "Assin. Pendente",   icon: Clock3,         color: "text-amber-400",     badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
  Inativo:              { label: "Inativos",           icon: XCircle,        color: "text-red-400",       badgeClass: "border-red-500/30 bg-red-500/10 text-red-300" },
};

export default function Clientes() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  // Status counts from loaded data
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: clientes.length };
    clientes.forEach((c) => {
      const s = c.status_cliente || "Assinatura Pendente";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [clientes]);

  const filtered = useMemo(() =>
    clientes.filter((c) => {
      const matchSearch = c.nome_completo.toLowerCase().includes(search.toLowerCase()) || (c.cpf ?? "").includes(search);
      const matchStatus = statusFilter === "all" || (c.status_cliente || "Assinatura Pendente") === statusFilter;
      return matchSearch && matchStatus;
    }),
    [clientes, search, statusFilter]
  );

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
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold text-foreground">
            Clientes
            <span className="ml-2 text-cyan-400/60 text-sm font-mono align-middle">// gestão</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{clientes.length} cliente(s) cadastrado(s)</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyCliente); } }}>
          <DialogTrigger asChild>
            <Button className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4 mr-2" />Novo Cliente
            </Button>
          </DialogTrigger>
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

      {/* ── Status Pills Bar ── */}
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = statusCounts[key] ?? 0;
          const isActive = statusFilter === key;
          const Icon = cfg.icon;
          // Don't show status pills for statuses with 0 count (except "all")
          if (key !== "all" && count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
                isActive
                  ? cfg.badgeClass + " ring-1 ring-current/30 scale-[1.02]"
                  : "border-white/[0.07] bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", isActive ? cfg.color : "")} />
              {cfg.label}
              <span className={cn(
                "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                isActive ? "bg-current/20" : "bg-white/[0.08]"
              )}>
                {count}
              </span>
            </button>
          );
        })}
        {statusFilter !== "all" && (
          <button
            onClick={() => setStatusFilter("all")}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Filter className="h-3 w-3" />
            Limpar filtro
          </button>
        )}
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/[0.04] border-white/[0.08]"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06]">
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">CPF</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer border-white/[0.04] hover:bg-white/[0.03]" onClick={() => navigate(`/clientes/${c.id}`)}>
                  <TableCell className="font-medium text-foreground hover:underline">{c.nome_completo}</TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-sm">{c.cpf || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        c.status_cliente === "Ativo"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : c.status_cliente === "Assinatura Pendente" || !c.status_cliente
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                          : "border-white/10 text-muted-foreground"
                      )}
                    >
                      {c.status_cliente || "Assinatura Pendente"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/clientes/${c.id}`)}><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      {isAdmin && (<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4" /></Button>)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita e apagará todos os dados vinculados a este cliente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
