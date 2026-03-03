import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AuxItem { id: string; nome: string; }

interface Props {
  comarcas: AuxItem[];
  value: string;
  onChange: (id: string) => void;
  onCreated: (item: AuxItem) => void;
}

export function CreatableComarcaSelect({ comarcas, value, onChange, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = comarcas.find(c => c.id === value);
  const filtered = comarcas.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()));
  const exactMatch = comarcas.some(c => c.nome.toLowerCase() === search.toLowerCase());

  const handleCreate = async () => {
    if (!search.trim() || exactMatch) return;
    setCreating(true);
    const { data, error } = await supabase.from("aux_comarcas").insert({ nome: search.trim() }).select("id, nome").single();
    setCreating(false);
    if (error) { toast.error("Erro ao criar comarca"); return; }
    if (data) {
      onCreated(data);
      onChange(data.id);
      setSearch("");
      setOpen(false);
      toast.success(`Comarca "${data.nome}" criada`);
    }
  };

  return (
    <div>
      <Label>Comarca</Label>
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
              placeholder="Buscar ou criar comarca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto px-1 pb-1">
            {filtered.map(c => (
              <button
                key={c.id}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                  value === c.id && "bg-accent"
                )}
                onClick={() => { onChange(c.id); setSearch(""); setOpen(false); }}
              >
                <Check className={cn("h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")} />
                {c.nome}
              </button>
            ))}
            {filtered.length === 0 && !search && (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhuma comarca</p>
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