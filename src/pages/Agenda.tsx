import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, CalendarDays, Clock, User, FileText, Trash2, Paperclip, Loader2, Pencil, X, Check, CalendarIcon } from "lucide-react";
import { format, addDays, startOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AgendamentoModal } from "@/components/AgendamentoModal";
import { Link } from "react-router-dom";

interface AgendaItem {
  id: string; titulo: string; tipo: string; data_prazo: string;
  data_hora_inicio: string | null; data_hora_fim: string | null;
  descricao: string | null; status: string; processo_id: string | null; cliente_id: string | null;
  logs_interacao: string | null; anexos_log: any;
  processos?: { numero_processo: string | null; clientes?: { nome_completo: string } | null } | null;
  clientes?: { nome_completo: string } | null;
}

const TIPOS = ["Audiência", "Prazo", "Reunião", "Outros"];
const TIPO_COLORS: Record<string, string> = {
  "Audiência": "bg-blue-500",
  "Prazo": "bg-amber-500",
  "Reunião": "bg-emerald-500",
  "Outros": "bg-purple-500"
};

interface EditForm {
  titulo: string;
  tipo: string;
  data_prazo: string;
  descricao: string;
}

export default function Agenda() {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("week");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Detail modal state
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null);
  const [logText, setLogText] = useState("");
  const [attachedImages, setAttachedImages] = useState<{ file: File; preview: string }[]>([]);
  const [savingLog, setSavingLog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ titulo: "", tipo: "Prazo", data_prazo: "", descricao: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from("agenda")
      .select("*, processos(numero_processo, clientes(nome_completo)), clientes(nome_completo)")
      .order("data_hora_inicio", { ascending: true, nullsFirst: false });
    if (data) setItems(data as any);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const eventDates = useMemo(() => {
    const map = new Map<string, Set<string>>();
    items.forEach((item) => {
      const key = item.data_prazo;
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(item.tipo);
    });
    return map;
  }, [items]);

  const filteredItems = useMemo(() => {
    const start = startOfDay(selectedDate);
    const end = viewMode === "day" ? addDays(start, 1) : addDays(start, 7);
    return items.filter((item) => {
      const d = new Date(item.data_prazo + "T00:00:00");
      return d >= start && d < end;
    });
  }, [items, selectedDate, viewMode]);

  const today = new Date().toISOString().split("T")[0];

  const toggleStatus = async (item: AgendaItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = item.status === "pendente" ? "concluido" : "pendente";
    await supabase.from("agenda").update({ status: newStatus }).eq("id", item.id);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: newStatus } : i));
    if (selectedItem?.id === item.id) setSelectedItem((prev) => prev ? { ...prev, status: newStatus } : null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("agenda").delete().eq("id", deleteId);
    if (error) { toast.error("Erro ao excluir agendamento"); return; }
    setItems((prev) => prev.filter((i) => i.id !== deleteId));
    if (selectedItem?.id === deleteId) setSelectedItem(null);
    toast.success("Agendamento excluído"); setDeleteId(null);
  };

  const openDetail = (item: AgendaItem) => {
    setSelectedItem(item);
    setLogText(item.logs_interacao || "");
    setAttachedImages([]);
    setEditMode(false);
  };

  const openEditMode = () => {
    if (!selectedItem) return;
    setEditForm({
      titulo: selectedItem.titulo,
      tipo: selectedItem.tipo,
      data_prazo: selectedItem.data_prazo,
      descricao: selectedItem.descricao || "",
    });
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    if (!editForm.titulo.trim()) { toast.error("Título é obrigatório"); return; }
    if (!editForm.data_prazo) { toast.error("Data é obrigatória"); return; }
    setSavingEdit(true);
    try {
      const payload = {
        titulo: editForm.titulo.trim(),
        tipo: editForm.tipo,
        data_prazo: editForm.data_prazo,
        descricao: editForm.descricao || null,
        data_hora_inicio: new Date(editForm.data_prazo + "T00:00:00").toISOString(),
      };
      const { error } = await supabase.from("agenda").update(payload).eq("id", selectedItem.id);
      if (error) throw error;

      const updated = { ...selectedItem, ...payload };
      setSelectedItem(updated as AgendaItem);
      setItems((prev) => prev.map((i) => i.id === updated.id ? { ...i, ...payload } : i));
      setEditMode(false);
      toast.success("Agendamento atualizado!");
    } catch {
      toast.error("Erro ao salvar edição.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages = Array.from(files).map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setAttachedImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeNewImage = (index: number) => {
    setAttachedImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSaveLog = async () => {
    if (!selectedItem) return;
    setSavingLog(true);
    try {
      const uploadedUrls: string[] = [];
      for (const img of attachedImages) {
        const ext = img.file.name.split(".").pop() || "jpg";
        const filename = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("anexos_agenda").upload(filename, img.file, { contentType: img.file.type, upsert: false });
        if (upErr) { toast.error(`Erro ao enviar: ${img.file.name}`); continue; }
        const { data: urlData } = supabase.storage.from("anexos_agenda").getPublicUrl(filename);
        uploadedUrls.push(urlData.publicUrl);
      }
      const existingUrls: string[] = Array.isArray(selectedItem.anexos_log) ? selectedItem.anexos_log : [];
      const allUrls = [...existingUrls, ...uploadedUrls];
      const { error } = await supabase.from("agenda").update({
        logs_interacao: logText.trim() || null,
        anexos_log: allUrls.length > 0 ? allUrls : null,
      }).eq("id", selectedItem.id);
      if (error) throw error;
      const updated = { ...selectedItem, logs_interacao: logText.trim() || null, anexos_log: allUrls.length > 0 ? allUrls : null };
      setSelectedItem(updated);
      setItems((prev) => prev.map((i) => i.id === updated.id ? { ...i, logs_interacao: updated.logs_interacao, anexos_log: updated.anexos_log } : i));
      setAttachedImages([]);
      toast.success("Histórico salvo!");
    } catch {
      toast.error("Erro ao salvar histórico.");
    } finally {
      setSavingLog(false);
    }
  };

  const existingUrls: string[] = selectedItem && Array.isArray(selectedItem.anexos_log) ? selectedItem.anexos_log : [];
  const editSelectedDate = editForm.data_prazo ? new Date(editForm.data_prazo + "T00:00:00") : undefined;

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold text-foreground">
            Agenda / Prazos
            <span className="ml-2 text-cyan-400/60 text-sm font-mono align-middle">// calendário</span>
          </h2>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-2" />Novo Agendamento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
        {/* Calendar panel */}
        <Card className="glass-card w-full lg:w-fit">
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              locale={ptBR}
              className="p-3 pointer-events-auto"
              modifiers={{ hasEvent: (date) => eventDates.has(format(date, "yyyy-MM-dd")) }}
              modifiersClassNames={{ hasEvent: "relative" }}
              components={{
                DayContent: ({ date }) => {
                  const key = format(date, "yyyy-MM-dd");
                  const tipos = eventDates.get(key);
                  return (
                    <div className="relative flex flex-col items-center">
                      <span>{date.getDate()}</span>
                      {tipos && (
                        <div className="flex gap-0.5 mt-0.5">
                          {Array.from(tipos).slice(0, 3).map((tipo) => (
                            <span key={tipo} className={cn("h-1 w-1 rounded-full", TIPO_COLORS[tipo] || "bg-muted-foreground")} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                },
              }}
            />
            <div className="flex gap-2 mt-3 px-3">
              <Button size="sm" variant={viewMode === "day" ? "default" : "outline"} onClick={() => setViewMode("day")} className="flex-1">Dia</Button>
              <Button size="sm" variant={viewMode === "week" ? "default" : "outline"} onClick={() => setViewMode("week")} className="flex-1">7 Dias</Button>
            </div>
          </CardContent>
        </Card>

        {/* Event list */}
        <div className="space-y-3 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-lg">
              {viewMode === "day"
                ? format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })
                : `${format(selectedDate, "dd/MM")} — ${format(addDays(selectedDate, 6), "dd/MM/yyyy")}`}
            </h3>
            <Badge variant="secondary" className="ml-auto kpi-value">{filteredItems.length} compromisso(s)</Badge>
          </div>

          {filteredItems.length > 0 ? filteredItems.map((item) => {
            const isOverdue = item.status === "pendente" && item.data_prazo < today;
            const isDone = item.status === "concluido";
            return (
              <Card
                key={item.id}
                className={cn("glass-card cursor-pointer hover:border-violet-400/30 transition-all", isDone && "opacity-55")}
                onClick={() => openDetail(item)}
              >
                <CardContent className="flex items-start gap-3 sm:gap-4 py-4 px-3 sm:px-5">
                  <Checkbox
                    checked={isDone}
                    onCheckedChange={() => toggleStatus(item)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn("font-medium", isDone && "line-through text-muted-foreground")}>{item.titulo}</p>
                      <Badge variant="outline" className="text-xs">
                        <span className={cn("h-2 w-2 rounded-full mr-1 inline-block", TIPO_COLORS[item.tipo] || "bg-muted-foreground")} />
                        {item.tipo}
                      </Badge>
                      {isOverdue && <Badge variant="destructive" className="text-xs">Atrasado</Badge>}
                    </div>
                    {item.descricao && <p className="text-sm text-muted-foreground mt-1 truncate">{item.descricao}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      {item.data_hora_inicio && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(item.data_hora_inicio), "HH:mm")}
                          {item.data_hora_fim && ` — ${format(parseISO(item.data_hora_fim), "HH:mm")}`}
                        </span>
                      )}
                      {item.processos && (
                        <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Link to={`/processos/${item.processo_id}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                            <FileText className="h-3 w-3" />{item.processos.numero_processo || "Processo"}
                          </Link>
                        </span>
                      )}
                      {(item.clientes || item.processos?.clientes) && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {item.clientes?.nome_completo || item.processos?.clientes?.nome_completo}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-sm hidden sm:inline font-mono", isOverdue ? "text-destructive font-semibold" : "text-muted-foreground")}>
                      {new Date(item.data_prazo + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          }) : (
            <Card className="glass-card">
              <CardContent className="text-center text-muted-foreground py-12">
                <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-20" />
                Nenhum compromisso para o período selecionado.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AgendamentoModal open={modalOpen} onOpenChange={setModalOpen} onSaved={fetchAll} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Agendamento</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Detail / Edit Modal ── */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => { if (!open) { setSelectedItem(null); setAttachedImages([]); setEditMode(false); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle>{editMode ? "Editar Agendamento" : "Detalhes do Agendamento"}</DialogTitle>
              {!editMode ? (
                <Button size="sm" variant="outline" className="gap-1.5 border-violet-400/30 text-violet-300 hover:bg-violet-500/10" onClick={openEditMode}>
                  <Pencil className="h-4 w-4" />Editar
                </Button>
              ) : (
                <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => setEditMode(false)}>
                  <X className="h-4 w-4" />Cancelar
                </Button>
              )}
            </div>
          </DialogHeader>

          {selectedItem && !editMode && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Título</p>
                  <p className="font-semibold text-foreground">{selectedItem.titulo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tipo</p>
                  <Badge variant="outline">
                    <span className={cn("h-2 w-2 rounded-full mr-1.5 inline-block", TIPO_COLORS[selectedItem.tipo] || "bg-muted-foreground")} />
                    {selectedItem.tipo}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                  <Badge
                    variant={selectedItem.status === "concluido" ? "secondary" : "default"}
                    className="cursor-pointer"
                    onClick={() => toggleStatus(selectedItem)}
                  >
                    {selectedItem.status === "concluido" ? "Concluído" : "Pendente"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Data</p>
                  <p className="text-sm font-medium font-mono">{new Date(selectedItem.data_prazo + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Horário</p>
                  <p className="text-sm font-medium">
                    {selectedItem.data_hora_inicio
                      ? `${format(parseISO(selectedItem.data_hora_inicio), "HH:mm")}${selectedItem.data_hora_fim ? ` — ${format(parseISO(selectedItem.data_hora_fim), "HH:mm")}` : ""}`
                      : "—"}
                  </p>
                </div>
                {selectedItem.processos && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Processo</p>
                    <Link to={`/processos/${selectedItem.processo_id}`} className="text-sm font-medium text-violet-400 hover:underline">
                      {selectedItem.processos.numero_processo || "Ver processo"}
                    </Link>
                  </div>
                )}
                {(selectedItem.clientes || selectedItem.processos?.clientes) && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cliente</p>
                    <p className="text-sm font-medium">{selectedItem.clientes?.nome_completo || selectedItem.processos?.clientes?.nome_completo}</p>
                  </div>
                )}
              </div>
              {selectedItem.descricao && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Descrição</p>
                  <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-3 text-sm whitespace-pre-wrap">{selectedItem.descricao}</div>
                </div>
              )}

              {/* Histórico de Execução */}
              <div className="border-t border-white/[0.06] pt-4 space-y-3">
                <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Histórico de Execução</h4>
                <div className="space-y-2">
                  <Label>Log</Label>
                  <Textarea placeholder="Descreva o que aconteceu nesta diligência/tarefa..." value={logText} onChange={(e) => setLogText(e.target.value)} rows={4} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Anexos</Label>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
                    <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="h-3.5 w-3.5" />Anexar Foto
                    </Button>
                  </div>
                  {existingUrls.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {existingUrls.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Anexo ${idx + 1}`} className="h-20 w-20 object-cover rounded-lg border border-white/[0.08] hover:ring-2 hover:ring-violet-400/40 transition-all" />
                        </a>
                      ))}
                    </div>
                  )}
                  {attachedImages.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {attachedImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img src={img.preview} alt={`Novo ${idx + 1}`} className="h-20 w-20 object-cover rounded-lg border-2 border-dashed border-violet-400/40" />
                          <button type="button" onClick={() => removeNewImage(idx)} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleSaveLog} disabled={savingLog}>
                    {savingLog ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Salvando...</> : "Salvar Histórico"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Edit Form ── */}
          {selectedItem && editMode && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Título *</Label>
                <Input
                  value={editForm.titulo}
                  onChange={(e) => setEditForm((p) => ({ ...p, titulo: e.target.value }))}
                  className="mt-1"
                  placeholder="Título do agendamento"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={editForm.tipo} onValueChange={(v) => setEditForm((p) => ({ ...p, tipo: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Data *</Label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal mt-1", !editSelectedDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editSelectedDate ? format(editSelectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                      <Calendar
                        mode="single"
                        selected={editSelectedDate}
                        onSelect={(d) => {
                          setEditForm((p) => ({ ...p, data_prazo: d ? format(d, "yyyy-MM-dd") : "" }));
                          setDatePickerOpen(false);
                        }}
                        locale={ptBR}
                        className="p-3"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={editForm.descricao}
                  onChange={(e) => setEditForm((p) => ({ ...p, descricao: e.target.value }))}
                  className="mt-1 min-h-[100px] resize-none"
                  placeholder="Detalhes do compromisso..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <Button variant="ghost" onClick={() => setEditMode(false)}>
                  <X className="h-4 w-4 mr-1" />Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={savingEdit} className="bg-violet-600 hover:bg-violet-700">
                  {savingEdit ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Salvando...</> : <><Check className="h-4 w-4 mr-1" />Salvar Edição</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
