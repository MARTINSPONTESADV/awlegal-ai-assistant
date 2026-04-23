import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SpotlightCard } from "@/components/SpotlightCard";
import { FileSearch, PenLine, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PreProtocolo() {
  useEffect(() => { document.title = "Pré-Protocolo — AW ECO"; }, []);
  const navigate = useNavigate();

  const modules = [
    {
      key: "finder",
      title: "AW FINDER",
      subtitle: "Auditor de cobranças",
      description: "Analisa extratos bancários (PDF/imagem) via OCR, detecta cobranças indevidas por categoria e gera relatórios prontos para protocolo.",
      icon: FileSearch,
      color: "hsl(200, 80%, 55%)",
      target: "/pre-protocolo/finder",
    },
    {
      key: "writer",
      title: "AW WRITER",
      subtitle: "Confecção de iniciais",
      description: "Gera petições iniciais automaticamente a partir de templates + dados do cliente + fundamentação jurídica.",
      icon: PenLine,
      color: "hsl(280, 60%, 60%)",
      target: "/pre-protocolo/writer",
    },
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/home")} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Voltar ao hub
        </Button>
      </div>
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-widest font-mono text-emerald-400/70 mb-1">
          Automação jurídica
        </p>
        <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">
          AW PRÉ-PROTOCOLO
        </h1>
        <p className="text-muted-foreground mt-2">
          Ferramentas para pré-análise e confecção antes do protocolo.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 w-full">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              onClick={() => navigate(m.target)}
              className="group text-left"
            >
              <SpotlightCard className="h-full transition-all duration-300 group-hover:scale-[1.02]">
                <div className="flex flex-col h-full gap-4">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${m.color}20` }}
                    >
                      <Icon className="h-7 w-7" style={{ color: m.color }} />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 group-hover:text-foreground transition-all" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground/70 mb-1">
                      {m.subtitle}
                    </p>
                    <h2 className="font-display text-2xl font-bold">{m.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground/90 leading-relaxed">
                    {m.description}
                  </p>
                </div>
              </SpotlightCard>
            </button>
          );
        })}
      </div>
    </div>
  );
}
