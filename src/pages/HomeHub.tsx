import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SpotlightCard } from "@/components/SpotlightCard";
import {
  Scale, TrendingUp, Zap, DollarSign,
  Briefcase, Users, MessageSquare, FileSearch,
  ArrowRight,
} from "lucide-react";
import { appConfig, type SubsystemKey } from "@/config/app-config";

interface Stat {
  label: string;
  value: string | number;
}

interface Cube {
  key: SubsystemKey;
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  color: string;
  gradient: string;
  stats: Stat[];
  target: string;
}

export default function HomeHub() {
  useEffect(() => { document.title = `${appConfig.name} — ${appConfig.tagline}`; }, []);
  const navigate = useNavigate();

  const [counts, setCounts] = useState({
    clientes: 0, processos: 0, atendimentos: 0, leadsAtivos: 0, gastosMes: 0,
  });

  useEffect(() => {
    (async () => {
      const [{ count: cli }, { count: proc }, { count: atend }] = await Promise.all([
        supabase.from("clientes").select("*", { count: "exact", head: true }),
        supabase.from("processos").select("*", { count: "exact", head: true }).eq("situacao", "Ativo"),
        supabase.from("controle_bot").select("*", { count: "exact", head: true }).eq("excluido", false),
      ]);
      setCounts(p => ({
        ...p,
        clientes: cli ?? 0,
        processos: proc ?? 0,
        atendimentos: atend ?? 0,
      }));
    })();
  }, []);

  const allCubes: Cube[] = [
    {
      key: "system",
      title: "AW SYSTEM",
      subtitle: "Hub Jurídico",
      description: "Clientes, processos, agenda, publicações, diligências, relatórios e geração de documentos.",
      icon: Scale,
      color: "hsl(210, 80%, 60%)",
      gradient: "from-blue-500/20 via-cyan-500/10 to-transparent",
      stats: [
        { label: "Clientes", value: counts.clientes },
        { label: "Processos ativos", value: counts.processos },
      ],
      target: "/sistema",
    },
    {
      key: "crm",
      title: "AW CRM",
      subtitle: "Comercial",
      description: "Atendimento WhatsApp, funil de vendas, triagem e qualificação de leads.",
      icon: TrendingUp,
      color: "hsl(260, 60%, 60%)",
      gradient: "from-violet-500/20 via-purple-500/10 to-transparent",
      stats: [
        { label: "Leads no funil", value: counts.atendimentos },
      ],
      target: "/crm",
    },
    {
      key: "pre",
      title: "AW PRÉ-PROTOCOLO",
      subtitle: "Automação jurídica",
      description: "AW FINDER (auditoria bancária via OCR) + AW WRITER (confecção automática de iniciais).",
      icon: Zap,
      color: "hsl(142, 71%, 50%)",
      gradient: "from-emerald-500/20 via-green-500/10 to-transparent",
      stats: [
        { label: "Módulos", value: 2 },
      ],
      target: "/pre-protocolo",
    },
    {
      key: "fin",
      title: "AW FIN",
      subtitle: "Financeiro & Dashboards",
      description: "Receita por acordos/execuções, gastos do escritório, métricas avançadas e marketing.",
      icon: DollarSign,
      color: "hsl(30, 80%, 55%)",
      gradient: "from-orange-500/20 via-amber-500/10 to-transparent",
      stats: [
        { label: "Receita (sistema)", value: "—" },
      ],
      target: "/fin",
    },
  ];

  // Filtra só os cubos habilitados pelo tenant via VITE_FEATURES
  const cubes = useMemo(
    () => allCubes.filter(c => appConfig.features.includes(c.key)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [counts]
  );

  return (
    <div className="min-h-full flex flex-col w-full max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight">
          {appConfig.name} <span className="text-violet-400/60 text-2xl font-mono align-middle">// {appConfig.tagline.toLowerCase()}</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Escolha um sub-sistema para começar.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 w-full">
        {cubes.map((cube) => {
          const Icon = cube.icon;
          return (
            <button
              key={cube.key}
              onClick={() => navigate(cube.target)}
              className="group relative text-left"
            >
              <SpotlightCard className="h-full transition-all duration-300 group-hover:scale-[1.02] group-hover:border-white/[0.15]">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${cube.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none`}
                />
                <div className="relative flex flex-col h-full gap-4">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${cube.color}20`, boxShadow: `0 0 20px ${cube.color}20` }}
                    >
                      <Icon className="h-7 w-7" style={{ color: cube.color }} />
                    </div>
                    <ArrowRight
                      className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground"
                    />
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground/70 mb-1">
                      {cube.subtitle}
                    </p>
                    <h2 className="font-display text-2xl font-bold tracking-tight">
                      {cube.title}
                    </h2>
                  </div>

                  <p className="text-sm text-muted-foreground/90 leading-relaxed flex-1">
                    {cube.description}
                  </p>

                  <div className="flex gap-4 pt-3 border-t border-white/[0.06]">
                    {cube.stats.map((s, i) => (
                      <div key={i} className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                          {s.label}
                        </p>
                        <p className="text-xl font-bold tracking-tight truncate" style={{ color: cube.color }}>
                          {s.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </SpotlightCard>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground/40 mt-8 font-mono">
        {appConfig.name} v2.0 · Powered by {appConfig.officeName}
      </p>
    </div>
  );
}
