import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickReply {
  id: string;
  titulo: string;
  conteudo: string;
  atalho: string | null;
  ordem: number;
}

interface Props {
  templates: QuickReply[];
  filter: string;
  onSelect: (conteudo: string) => void;
  onClose: () => void;
}

export default function QuickReplyPopover({ templates, filter, onSelect, onClose }: Props) {
  const filtered = templates.filter((t) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      t.titulo.toLowerCase().includes(q) ||
      (t.atalho && t.atalho.toLowerCase().includes(q))
    );
  });

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden z-50">
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-1.5 bg-white/[0.02]">
        <Zap className="h-3 w-3 text-violet-400" />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          Respostas rápidas
        </span>
      </div>
      <div className="max-h-56 overflow-y-auto">
        {filtered.map((t) => (
          <button
            key={t.id}
            className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-white/[0.05] text-left transition-colors border-b border-white/[0.04] last:border-0"
            onMouseDown={(e) => {
              // mousedown em vez de click para não perder o foco do input
              e.preventDefault();
              onSelect(t.conteudo);
              onClose();
            }}
          >
            <div className="shrink-0 h-6 w-6 rounded-md bg-violet-500/15 flex items-center justify-center mt-0.5">
              <span className="text-[10px] font-bold text-violet-400">/</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{t.titulo}</p>
              {t.atalho && (
                <p className="text-[10px] text-violet-400/70 font-mono">/{t.atalho}</p>
              )}
              <p className={cn("text-xs text-muted-foreground mt-0.5 line-clamp-2")}>{t.conteudo}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
