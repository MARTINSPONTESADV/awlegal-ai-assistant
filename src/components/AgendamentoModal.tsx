import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Check, ChevronsUpDown, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const TIPOS = ["Audiência", "Prazo", "Reunião", "Outros"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  processoId?: string;
  processoLabel?: string;
}

const emptyForm = (processoId?: string, responsavelId?: string) => ({
  titulo: "",
  tipo: "Prazo",
  data_prazo: "",
  descricao: "",
  processo_id: processoId || "",
  responsavel_id: responsavelId || "",
});

export function AgendamentoModal({ open, onOpenChange, onSaved, processoId, processoLabel }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm(processoId));
  const [googleCalendar, setGoogleCalendar] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [processos, setProcessos] = useState<{ id: string; numero_processo: string | null }[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [processoOpen, setProcessoOpen] = useState(false);
  const [responsavelOpen, setResponsavelOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGoogleCalendar(false);

    Promise.all([
      supabase.from("processos").select("id, numero_processo").eq("status", "ativo"),
      supabase.from("profiles").select("id, full_name, email").eq("status", "approved"),
    ]).then(([{ data: p }, { data: u }]) => {
      if (p) setProcessos(p as any);
      if (u) setUsuarios(u as any);

      const currentProfile = u?.find((prof: any) => prof.email === user?.email);
      setForm(emptyForm(processoId, currentProfile?.id || ""));
    });
  }, [open, processoId, user?.email]);

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const doSave = async (): Promise<boolean> => {
    if (!form.titulo.trim()) { toast.error("Título é obrigatório"); return false; }
    if (!form.data_prazo) { toast.error("Data é obrigatória"); return false; }

    const payload: Record<string, any> = {
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      data_prazo: form.data_prazo,
      data_hora_inicio: new Date(form.data_prazo + "T00:00:00").toISOString(),
      descricao: form.descricao || null,
      status: "pendente",
      created_by: user?.id,
    };
    if (form.processo_id) payload.processo_id = form.processo_id;
    if (form.responsavel_id) payload.responsavel_id = form.responsavel_id;

    const { error } = await supabase.from("agenda").insert(payload as any);
    if (error) { toast.error("Erro ao criar agendamento"); return false; }
    toast.success("Agendamento criado com sucesso");
    onSaved();
    return true;
  };

  const handleSave = async () => {
    if (await doSave()) onOpenChange(false);
  };

  const handleSaveAndNew = async () => {
    if (await doSave()) {
      const currentProfile = usuarios.find((u) => u.email === user?.email);
      setForm(emptyForm(processoId, currentProfile?.id || ""));
    }
  };

  const selectedProcesso = processos.find((p) => p.id === form.processo_id);
  const selectedResponsavel = usuarios.find((u) => u.id === form.responsavel_id);
  const selectedDate = form.data_prazo ? new Date(form.data_prazo + "T00:00:00") : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Título */}
          <div>
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} className="mt-1" placeholder="Ex: Audiência de instrução" />
          </div>

          {/* Tipo + Data side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
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
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !selectedDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Selecione..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { set("data_prazo", d ? format(d, "yyyy-MM-dd") : ""); setDatePickerOpen(false); }}
                    locale={ptBR}
                    className="p-3"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Responsável */}
          <div>
            <Label>Responsável</Label>
            <Popover open={responsavelOpen} onOpenChange={setResponsavelOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className={cn("w-full justify-between mt-1 font-normal", !form.responsavel_id && "text-muted-foreground")}>
                  {selectedResponsavel?.full_name || selectedResponsavel?.email || "Selecione um responsável..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 pointer-events-auto" align="start">
                <Command>
                  <CommandInput placeholder="Buscar usuário..." />
                  <CommandList>
                    <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                    <CommandGroup>
                      {usuarios.map((u) => (
                        <CommandItem key={u.id} value={u.full_name || u.email} onSelect={() => { set("responsavel_id", u.id); setResponsavelOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", form.responsavel_id === u.id ? "opacity-100" : "opacity-0")} />
                          {u.full_name || u.email}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Vincular Processo */}
          <div>
            <Label>Vincular Processo</Label>
            {processoId ? (
              <Input value={processoLabel || `Processo ${processoId.slice(0, 8)}...`} disabled className="mt-1 bg-muted" />
            ) : (
              <Popover open={processoOpen} onOpenChange={setProcessoOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className={cn("w-full justify-between mt-1 font-normal", !form.processo_id && "text-muted-foreground")}>
                    {selectedProcesso?.numero_processo || (form.processo_id ? "Processo selecionado" : "Selecione um processo...")}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 pointer-events-auto" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar processo..." />
                    <CommandList>
                      <CommandEmpty>Nenhum processo encontrado.</CommandEmpty>
                      <CommandGroup>
                        {processos.map((p) => (
                          <CommandItem key={p.id} value={p.numero_processo || p.id} onSelect={() => { set("processo_id", p.id); setProcessoOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", form.processo_id === p.id ? "opacity-100" : "opacity-0")} />
                            {p.numero_processo || "Sem número"}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Descrição */}
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={form.descricao}
              onChange={(e) => set("descricao", e.target.value)}
              className="mt-1 min-h-[100px] resize-none"
              placeholder="Detalhes do compromisso..."
            />
          </div>

          {/* Google Calendar */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" fill="#4285F4" />
                <rect x="6" y="10" width="4" height="4" fill="#FBBC04" />
                <rect x="10" y="10" width="4" height="4" fill="#34A853" />
                <rect x="14" y="10" width="4" height="4" fill="#EA4335" />
                <rect x="6" y="6" width="12" height="2" fill="white" />
              </svg>
              <span className="text-sm font-medium">Google Calendar</span>
            </div>
            <Switch checked={googleCalendar} onCheckedChange={setGoogleCalendar} disabled />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-border">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="outline" onClick={handleSaveAndNew}>Salvar e criar novo</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}