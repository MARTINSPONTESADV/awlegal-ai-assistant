import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
// @ts-expect-error - Finder é JSX sem types, integração direta
import FinderApp from "@/apps/finder/App.jsx";

export default function FinderPage() {
  useEffect(() => { document.title = "AW Finder — AW ECO"; }, []);
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col -mx-3 -my-3 sm:-mx-6 sm:-my-6">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-background/80 backdrop-blur shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/pre-protocolo")} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Pré-Protocolo
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">AW FINDER · integrado</span>
          <a
            href="https://aw-finder.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
            title="Abrir versão de produção"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <FinderApp />
      </div>
    </div>
  );
}
