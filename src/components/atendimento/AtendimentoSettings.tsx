import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Check, X, Zap } from "lucide-react";
import type { QuickReply } from "./QuickReplyPopover";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplatesChange: (templates: QuickReply[]) => void;
}

const emptyForm = { titulo: "", conteudo: "", atalho: "" };

export default function AtendimentoSettings({ open, onOpenChange, onTemplatesChange }: Props) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<QuickReply[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open) load();
  }, [open]);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("mensagens_rapidas")
      .select("*")
      .order("ordem", { ascending: true });
    if (data) {
      setTemplates(data as QuickReply[]);
      onTemplatesChange(data as QuickReply[]);
    }
  };

  const save = async () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      toast({ title: "Título e conteúdo são obrigatórios", variant: "destructive" });
      return;
    }
    if (editingId) {
      await (supabase as any)
        .from("mensagens_rapidas")
        .update({ titulo: form.titulo, conteudo: form.conteudo, atalho: form.atalho || null })
        .eq("id", editingId);
      toast({ title: "Resposta atualizada!" });
    } else {
      const maxOrdem = templates.reduce((m, t) => Math.max(m, t.ordem), 0);
      await (supabase as any)
        .from("mensagens_rapidas")
        .insert({ titulo: form.titulo, conteudo: form.conteudo, atalho: form.atalho || null, ordem: maxOrdem + 1 });
      toast({ title: "Resposta criada!" });
    }
    cancel();
    load();
  };

  const remove = async (id: string) => {
    await (supabase as any).from("mensagens_rapidas").delete().eq("id", id);
    toast({ title: "Resposta removida" });
    load();
  };

  const startEdit = (t: QuickReply) => {
    setEditingId(t.id);
    setAddingNew(false);
    setForm({ titulo: t.titulo, conteudo: t.conteudo, atalho: t.atalho || "" });
  };

  const cancel = () => {
    setEditingId(null);
    setAddingNew(false);
    setForm(emptyForm);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] max-w-full flex flex-col gap-4 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-400" />
            Respostas Rápidas
          </SheetTitle>
        </SheetHeader>

        <p className="text-xs text-muted-foreground">
          Digite{" "}
          <span className="font-mono text-violet-400 font-bold bg-violet-500/10 px-1 rounded">
            /
          </span>{" "}
          no campo de mensagem para usar uma resposta rápida.
        </p>

        {/* Formulário de edição/criação */}
        {(addingNew || editingId) && (
          <div className="border border-white/[0.1] rounded-xl p-3 space-y-2 bg-white/[0.02]">
            <Input
              placeholder="Título (ex: Follow-up)"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              className="h-8 text-sm bg-white/[0.04] border-white/[0.08]"
            />
            <Input
              placeholder="Atalho (ex: followup) — opcional"
              value={form.atalho}
              onChange={(e) => setForm((f) => ({ ...f, atalho: e.target.value }))}
              className="h-8 text-sm bg-white/[0.04] border-white/[0.08] font-mono"
            />
            <textarea
              placeholder="Conteúdo da mensagem..."
              value={form.conteudo}
              onChange={(e) => setForm((f) => ({ ...f, conteudo: e.target.value }))}
              rows={5}
              className="w-full resize-none rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-violet-400/40"
            />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={save}>
                <Check className="h-3.5 w-3.5 mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={cancel}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="space-y-2 flex-1 min-h-0">
          {templates.map((t) => (
            <div
              key={t.id}
              className="border border-white/[0.08] rounded-xl p-3 flex items-start gap-2 group"
            >
              <div className="h-6 w-6 rounded-md bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-violet-400">/</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{t.titulo}</p>
                {t.atalho && (
                  <p className="text-[10px] text-violet-400/70 font-mono">/{t.atalho}</p>
                )}
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.conteudo}</p>
              </div>
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => startEdit(t)}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => remove(t.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {templates.length === 0 && !addingNew && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma resposta rápida cadastrada
            </p>
          )}
        </div>

        {!addingNew && !editingId && (
          <Button
            variant="outline"
            className="w-full border-dashed border-white/[0.15] hover:bg-white/[0.04] shrink-0"
            onClick={() => {
              setAddingNew(true);
              setEditingId(null);
              setForm(emptyForm);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Nova Resposta Rápida
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}
