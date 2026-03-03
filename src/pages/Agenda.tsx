import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, CalendarDays, Clock, User, FileText, Trash2 } from "lucide-react";
import { format, addDays, startOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AgendamentoModal } from "@/components/AgendamentoModal";
import { Link } from "react-router-dom";

interface AgendaItem {
  id: string; titulo: string; tipo: string; data_prazo: string;
  data_hora_inicio: string | null; data_hora_fim: string | null;
  descricao: string | null; status: string; processo_id: string | null; cliente_id: string | null;
  processos?: { numero_processo: string | null; clientes?: { nome_completo: string } | null } | null;
  clientes?: { nome_completo: string } | null;
}

const TIPO_COLORS: Record<string, string> = { "Audiência": "bg-blue-500", "Prazo": "bg-amber-500", "Reunião": "bg-emerald-500", "Outros": "bg-purple-500" };

export default function Agenda() {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("week");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const { data } = await supabase.from("agenda").select("*, processos(numero_processo, clientes(nome_completo)), clientes(nome_completo)").order("data_hora_inicio", { ascending: true, nullsFirst: false });
    if (data) setItems(data as any);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const eventDates = useMemo(() => {
    const map = new Map<string, Set<string>>();
    items.forEach((item) => { const key = item.data_prazo; if (!map.has(key)) map.set(key, new Set()); map.get(key)!.add(item.tipo); });
    return map;
  }, [items]);

  const filteredItems = useMemo(() => {
    const start = startOfDay(selectedDate);
    const end = viewMode === "day" ? addDays(start, 1) : addDays(start, 7);
    return items.filter((item) => { const d = new Date(item.data_prazo + "T00:00:00"); return d >= start && d < end; });
  }, [items, selectedDate, viewMode]);

  const today = new Date().toISOString().split("T")[0];

  const toggleStatus = async (item: AgendaItem) => {
    const newStatus = item.status === "pendente" ? "concluido" : "pendente";
    await supabase.from("agenda").update({ status: newStatus }).eq("id", item.id);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: newStatus } : i));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("agenda").delete().eq("id", deleteId);
    if (error) { toast.error("Erro ao excluir agendamento"); return; }
    setItems((prev) => prev.filter((i) => i.id !== deleteId));
    toast.success("Agendamento excluído"); setDeleteId(null);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-3xl font-bold">Agenda / Prazos</h2>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo Agendamento</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
        <Card className="w-full lg:w-fit">
          <CardContent className="p-4">
            <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} locale={ptBR} className="p-3 pointer-events-auto"
              modifiers={{ hasEvent: (date) => eventDates.has(format(date, "yyyy-MM-dd")) }}
              modifiersClassNames={{ hasEvent: "relative" }}
              components={{
                DayContent: ({ date }) => {
                  const key = format(date, "yyyy-MM-dd"); const tipos = eventDates.get(key);
                  return (<div className="relative flex flex-col items-center"><span>{date.getDate()}</span>{tipos && (<div className="flex gap-0.5 mt-0.5">{Array.from(tipos).slice(0, 3).map((tipo) => (<span key={tipo} className={cn("h-1 w-1 rounded-full", TIPO_COLORS[tipo] || "bg-muted-foreground")} />))}</div>)}</div>);
                },
              }}
            />
            <div className="flex gap-2 mt-3 px-3">
              <Button size="sm" variant={viewMode === "day" ? "default" : "outline"} onClick={() => setViewMode("day")} className="flex-1">Dia</Button>
              <Button size="sm" variant={viewMode === "week" ? "default" : "outline"} onClick={() => setViewMode("week")} className="flex-1">7 Dias</Button>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-3 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-lg">{viewMode === "day" ? format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR }) : `${format(selectedDate, "dd/MM")} — ${format(addDays(selectedDate, 6), "dd/MM/yyyy")}`}</h3>
            <Badge variant="secondary" className="ml-auto">{filteredItems.length} compromisso(s)</Badge>
          </div>
          {filteredItems.length > 0 ? filteredItems.map((item) => {
            const isOverdue = item.status === "pendente" && item.data_prazo < today;
            const isDone = item.status === "concluido";
            return (
              <Card key={item.id} className={cn(isDone && "opacity-60")}>
                <CardContent className="flex items-start gap-3 sm:gap-4 py-4 px-3 sm:px-6">
                  <Checkbox checked={isDone} onCheckedChange={() => toggleStatus(item)} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn("font-medium", isDone && "line-through text-muted-foreground")}>{item.titulo}</p>
                      <Badge variant="outline" className="text-xs"><span className={cn("h-2 w-2 rounded-full mr-1 inline-block", TIPO_COLORS[item.tipo] || "bg-muted-foreground")} />{item.tipo}</Badge>
                      {isOverdue && <Badge variant="destructive">Atrasado</Badge>}
                    </div>
                    {item.descricao && <p className="text-sm text-muted-foreground mt-1 truncate">{item.descricao}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      {item.data_hora_inicio && (<span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(parseISO(item.data_hora_inicio), "HH:mm")}{item.data_hora_fim && ` — ${format(parseISO(item.data_hora_fim), "HH:mm")}`}</span>)}
                      {item.processos && (<Link to={`/processos/${item.processo_id}`} className="flex items-center gap-1 hover:text-foreground transition-colors"><FileText className="h-3 w-3" />{item.processos.numero_processo || "Processo"}</Link>)}
                      {(item.clientes || item.processos?.clientes) && (<span className="flex items-center gap-1"><User className="h-3 w-3" />{item.clientes?.nome_completo || item.processos?.clientes?.nome_completo}</span>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-sm hidden sm:inline", isOverdue ? "text-destructive font-semibold" : "text-muted-foreground")}>{new Date(item.data_prazo + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(item.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          }) : (<Card><CardContent className="text-center text-muted-foreground py-12">Nenhum compromisso para o período selecionado.</CardContent></Card>)}
        </div>
      </div>
      <AgendamentoModal open={modalOpen} onOpenChange={setModalOpen} onSaved={fetchAll} />
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir Agendamento</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
