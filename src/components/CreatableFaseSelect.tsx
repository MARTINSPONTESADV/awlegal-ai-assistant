import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AuxItem { id: string; nome: string; }

interface Props {
  fases: AuxItem[];
  value: string;
  onChange: (id: string) => void;
  onCreated: (item: AuxItem) => void;
  onDeleted: (id: string) => void;
}

export function CreatableFaseSelect({ fases, value, onChange, onCreated, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = fases.find(c => c.id === value);
  const filtered = fases.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()));
  const exactMatch = fases.some(c => c.nome.toLowerCase() === search.toLowerCase());

  const handleCreate = async () => {
    if (!search.trim() || exactMatch) return;
    setCreating(true);
    const nome = search.trim().toUpperCase();
    const { data, error } = await supabase.from("aux_fases").insert({ nome }).select("id, nome").single();
    setCreating(false);
    if (error) {
      if (error.code === "23505") { toast.error("Essa fase já existe"); return; }
      toast.error("Erro ao criar fase"); return;
    }
    if (data) {
      onCreated(data);
      onChange(data.id);
      setSearch("");
      setOpen(false);
      toast.success(`Fase "${data.nome}" criada`);
    }
  };

  const handleDelete = async (e: React.MouseEvent, item: AuxItem) => {
    e.stopPropagation();
    const { error } = await supabase.from("aux_fases").delete().eq("id", item.id);
    if (error) { toast.error("Erro ao excluir fase: " + (error.message || "verifique se há processos vinculados")); return; }
    onDeleted(item.id);
    if (value === item.id) onChange("");
    toast.success(`Fase "${item.nome}" removida`);
  };

  return (
    <div>
      <Label>Fase</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className={cn("w-full justify-between mt-1 font-normal", !selected && "text-muted-foreground")}>
            {selected?.nome || "Selecione ou crie..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="p-2">
            <Input
              ref={inputRef}
              placeholder="Buscar ou criar fase..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto px-1 pb-1">
            {filtered.map(c => (
              <div
                key={c.id}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer group",
                  value === c.id && "bg-accent"
                )}
                onClick={() => { onChange(c.id); setSearch(""); setOpen(false); }}
              >
                <Check className={cn("h-4 w-4 shrink-0", value === c.id ? "opacity-100" : "opacity-0")} />
                <span className="flex-1 text-left">{c.nome}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => handleDelete(e, c)}
                  title={`Excluir "${c.nome}"`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {filtered.length === 0 && !search && (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhuma fase</p>
            )}
          </div>
          {search.trim() && !exactMatch && (
            <div className="border-t p-2">
              <Button size="sm" variant="ghost" className="w-full justify-start text-sm" onClick={handleCreate} disabled={creating}>
                <Plus className="h-4 w-4 mr-2" />
                Criar "{search.trim()}"
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}