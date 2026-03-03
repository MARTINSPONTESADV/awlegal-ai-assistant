import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Check, X, Upload, Trash2, FileText, Ban, MoreHorizontal, ShieldCheck, ShieldOff, UserX, Ghost } from "lucide-react";
import { Navigate } from "react-router-dom";

interface Profile { id: string; user_id: string; email: string; full_name: string | null; status: string; created_at: string; }
interface UserRole { user_id: string; role: string; }
interface Template { id: string; name: string; file_path: string; bucket_path: string; is_active: boolean; created_at: string; }

function sanitizeFileName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

export default function Admin() {
  const { isAdmin, user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [uploading, setUploading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; userId: string; label: string } | null>(null);
  const [ghostEmail, setGhostEmail] = useState("");
  const [deletingGhost, setDeletingGhost] = useState(false);

  const fetchProfiles = useCallback(async () => {
    const [{ data: p }, { data: r }] = await Promise.all([supabase.from("profiles").select("*").order("created_at", { ascending: false }), supabase.from("user_roles").select("user_id, role")]);
    if (p) setProfiles(p as Profile[]); if (r) setRoles(r as UserRole[]);
  }, []);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase.from("templates").select("*").order("created_at", { ascending: false });
    if (data) setTemplates(data as Template[]);
  }, []);

  useEffect(() => { if (isAdmin) { fetchProfiles(); fetchTemplates(); } }, [isAdmin, fetchProfiles, fetchTemplates]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const getUserRole = (userId: string) => roles.find((r) => r.user_id === userId)?.role ?? "user";

  const updateStatus = async (userId: string, status: "pending" | "approved" | "rejected" | "suspended") => {
    const { error } = await supabase.from("profiles").update({ status }).eq("user_id", userId);
    if (error) { toast.error("Erro ao atualizar status"); } else { const labels: Record<string, string> = { approved: "aprovado", rejected: "rejeitado", suspended: "suspenso" }; toast.success(`Usuário ${labels[status] || status}`); fetchProfiles(); }
    setConfirmAction(null);
  };

  const toggleAdmin = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    const { error } = await supabase.from("user_roles").update({ role: newRole }).eq("user_id", userId);
    if (error) { toast.error("Erro ao alterar permissão"); } else { toast.success(newRole === "admin" ? "Usuário promovido a admin" : "Privilégio admin removido"); fetchProfiles(); }
    setConfirmAction(null);
  };

  const deleteUser = async (userId: string) => {
    try {
      const res = await supabase.functions.invoke("delete-user-account", { body: { user_id: userId } });
      if (res.error) { toast.error("Erro ao excluir conta: " + (res.error.message || "Erro desconhecido")); } else { toast.success("Conta excluída definitivamente"); fetchProfiles(); }
    } catch (err: any) { toast.error("Erro ao excluir conta: " + (err?.message || "Erro desconhecido")); }
    setConfirmAction(null);
  };

  const deleteGhostUser = async () => {
    if (!ghostEmail.trim()) { toast.error("Digite o e-mail"); return; }
    setDeletingGhost(true);
    try {
      const res = await supabase.functions.invoke("delete-user-by-email", { body: { email: ghostEmail.trim() } });
      if (res.error) { toast.error("Erro: " + (res.error.message || "Erro desconhecido")); } else if (res.data?.error) { toast.error(res.data.error); } else { toast.success(`Usuário ${ghostEmail} removido do auth.users`); setGhostEmail(""); fetchProfiles(); }
    } catch (err: any) { toast.error(err?.message || "Erro desconhecido"); }
    setDeletingGhost(false);
  };

  const executeConfirm = () => {
    if (!confirmAction) return;
    const { type, userId } = confirmAction;
    if (type === "suspend") updateStatus(userId, "suspended");
    else if (type === "reject") updateStatus(userId, "rejected");
    else if (type === "delete") deleteUser(userId);
    else if (type === "toggle_admin") { const role = getUserRole(userId); toggleAdmin(userId, role); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = { pending: { label: "Pendente", variant: "secondary" }, approved: { label: "Aprovado", variant: "default" }, rejected: { label: "Rejeitado", variant: "destructive" }, suspended: { label: "Suspenso", variant: "outline" } };
    const s = map[status] || map.pending;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".docx")) { toast.error("Apenas .docx"); return; }
    setUploading(true);
    const sanitized = sanitizeFileName(file.name);
    const bucketPath = `templates/${Date.now()}_${sanitized}`;
    const { error: uploadError } = await supabase.storage.from("templates").upload(bucketPath, file);
    if (uploadError) { toast.error("Erro no upload: " + uploadError.message); setUploading(false); return; }
    const { error: dbError } = await supabase.from("templates").insert({ name: file.name.replace(".docx", ""), file_path: sanitized, bucket_path: bucketPath, uploaded_by: user?.id });
    if (dbError) { toast.error("Erro ao salvar template"); } else { toast.success("Template enviado!"); fetchTemplates(); }
    setUploading(false); e.target.value = "";
  };

  const toggleTemplate = async (id: string, isActive: boolean) => { await supabase.from("templates").update({ is_active: !isActive }).eq("id", id); fetchTemplates(); };
  const deleteTemplate = async (template: Template) => { await supabase.storage.from("templates").remove([template.bucket_path]); await supabase.from("templates").delete().eq("id", template.id); toast.success("Template removido"); fetchTemplates(); };

  return (
    <>
      <h2 className="font-display text-3xl font-bold mb-6">Administração</h2>
      <Tabs defaultValue="users">
        <TabsList><TabsTrigger value="users">Gestão de Acessos</TabsTrigger><TabsTrigger value="templates">Gestão de Templates</TabsTrigger><TabsTrigger value="ghost"><Ghost className="h-4 w-4 mr-1" />Ghost Users</TabsTrigger></TabsList>
        <TabsContent value="users" className="mt-6">
          <Card><CardHeader><CardTitle>Usuários Cadastrados</CardTitle></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Nível</TableHead><TableHead>Cadastro</TableHead><TableHead className="w-16">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {profiles.map((p) => { const role = getUserRole(p.user_id); const isSelf = p.user_id === user?.id; return (
                <TableRow key={p.id}><TableCell className="font-medium">{p.full_name || "Sem nome"}</TableCell><TableCell className="text-sm">{p.email}</TableCell><TableCell>{statusBadge(p.status)}</TableCell>
                <TableCell><Badge variant={role === "admin" ? "default" : "secondary"}>{role === "admin" ? "Admin" : "Usuário"}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>{!isSelf && (
                  <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {p.status !== "approved" && (<DropdownMenuItem onClick={() => updateStatus(p.user_id, "approved")}><Check className="h-4 w-4 mr-2" />Aprovar</DropdownMenuItem>)}
                    {p.status !== "suspended" && (<DropdownMenuItem onClick={() => setConfirmAction({ type: "suspend", userId: p.user_id, label: `Deseja suspender ${p.full_name || p.email}?` })}><Ban className="h-4 w-4 mr-2" />Suspender</DropdownMenuItem>)}
                    {p.status !== "rejected" && (<DropdownMenuItem onClick={() => setConfirmAction({ type: "reject", userId: p.user_id, label: `Deseja rejeitar ${p.full_name || p.email}?` })}><X className="h-4 w-4 mr-2" />Rejeitar</DropdownMenuItem>)}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setConfirmAction({ type: "toggle_admin", userId: p.user_id, label: role === "admin" ? `Remover privilégio admin de ${p.full_name || p.email}?` : `Tornar ${p.full_name || p.email} admin?` })}>{role === "admin" ? <ShieldOff className="h-4 w-4 mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}{role === "admin" ? "Remover Admin" : "Tornar Admin"}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => setConfirmAction({ type: "delete", userId: p.user_id, label: `Excluir permanentemente ${p.full_name || p.email}? Esta ação não pode ser desfeita.` })}><UserX className="h-4 w-4 mr-2" />Excluir Conta</DropdownMenuItem>
                  </DropdownMenuContent></DropdownMenu>
                )}</TableCell></TableRow>); })}
              {profiles.length === 0 && (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum usuário.</TableCell></TableRow>)}
            </TableBody></Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="templates" className="mt-6">
          <Card><CardHeader><CardTitle>Templates de Documentos</CardTitle></CardHeader><CardContent className="space-y-6">
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center"><Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" /><Label htmlFor="template-upload" className="cursor-pointer text-sm font-medium">{uploading ? "Enviando..." : "Clique para enviar um template .docx"}</Label><Input id="template-upload" type="file" accept=".docx" className="hidden" onChange={handleUpload} disabled={uploading} /></div>
            <div className="space-y-3">{templates.map((t) => (<div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-4"><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-muted-foreground" /><div><p className="font-medium">{t.name}</p><p className="text-xs text-muted-foreground">{t.is_active ? "Ativo" : "Inativo"}</p></div></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => toggleTemplate(t.id, t.is_active)}>{t.is_active ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}</Button><Button size="sm" variant="outline" onClick={() => deleteTemplate(t)}><Trash2 className="h-4 w-4" /></Button></div></div>))}{templates.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum template.</p>}</div>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="ghost" className="mt-6">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Ghost className="h-5 w-5" />Remover Ghost User</CardTitle></CardHeader><CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Digite o e-mail de um usuário travado no auth.users que não aparece na lista de perfis. Isso irá removê-lo completamente, liberando o e-mail para novo cadastro.</p>
            <div className="flex gap-3 items-end"><div className="flex-1 space-y-2"><Label htmlFor="ghost-email">E-mail do Ghost User</Label><Input id="ghost-email" type="email" placeholder="usuario@exemplo.com" value={ghostEmail} onChange={(e) => setGhostEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && deleteGhostUser()} /></div><Button variant="destructive" onClick={deleteGhostUser} disabled={deletingGhost || !ghostEmail.trim()}><Trash2 className="h-4 w-4 mr-2" />{deletingGhost ? "Removendo..." : "Remover"}</Button></div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
      <AlertDialog open={!!confirmAction} onOpenChange={(v) => !v && setConfirmAction(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Ação</AlertDialogTitle><AlertDialogDescription>{confirmAction?.label}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={executeConfirm}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
