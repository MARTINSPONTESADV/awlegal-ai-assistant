import { useAuth } from "@/hooks/useAuth";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { appConfig, isFeatureEnabled } from "@/config/app-config";
import {
  LayoutDashboard, Users, Briefcase, Newspaper, CalendarDays,
  MessageSquare, BarChart3, FileText, DollarSign, Search,
  Shield, DatabaseBackup, Scale, TrendingUp, Zap,
  FileSearch, PenLine, ArrowRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────
// Sub-systems + items
// ────────────────────────────────────────────────────────────
type SubsystemId = "system" | "crm" | "pre" | "fin";

interface NavItem { title: string; url: string; icon: any }

const SUBSYSTEMS: Record<SubsystemId, {
  label: string;
  color: SectionColor;
  home: string; // rota principal
  items: NavItem[];
}> = {
  system: {
    label: "AW System",
    color: "blue",
    home: "/dashboard",
    items: [
      { title: "Dashboard",    url: "/dashboard",   icon: LayoutDashboard },
      { title: "Clientes",     url: "/clientes",    icon: Users },
      { title: "Processos",    url: "/processos",   icon: Briefcase },
      { title: "Publicações",  url: "/publicacoes", icon: Newspaper },
      { title: "Agenda",       url: "/agenda",      icon: CalendarDays },
      { title: "Diligências",  url: "/diligencias", icon: Search },
      { title: "Relatórios",   url: "/relatorios",  icon: BarChart3 },
      { title: "Gerador Docs", url: "/generator",   icon: FileText },
    ],
  },
  crm: {
    label: "AW CRM",
    color: "purple",
    home: "/atendimento",
    items: [
      { title: "Atendimento",     url: "/atendimento", icon: MessageSquare },
      { title: "Funil de Vendas", url: "/crm",        icon: TrendingUp },
    ],
  },
  pre: {
    label: "AW Pré-Protocolo",
    color: "green",
    home: "/pre-protocolo",
    items: [
      { title: "AW Finder", url: "/pre-protocolo/finder", icon: FileSearch },
      { title: "AW Writer", url: "/pre-protocolo/writer", icon: PenLine },
    ],
  },
  fin: {
    label: "AW Fin",
    color: "orange",
    home: "/financeiro",
    items: [
      { title: "Financeiro", url: "/financeiro", icon: DollarSign },
    ],
  },
};

const configItems: NavItem[] = [
  { title: "Exportar", url: "/exportar", icon: DatabaseBackup },
];

// ────────────────────────────────────────────────────────────
// Color tokens
// ────────────────────────────────────────────────────────────
type SectionColor = "blue" | "green" | "purple" | "orange" | "muted";

const colorMap: Record<SectionColor, { label: string; active: string; dot: string; switcher: string }> = {
  blue:   { label: "text-cyan-400",    active: "bg-cyan-500/15 text-cyan-300",       dot: "bg-cyan-400",    switcher: "hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-300" },
  green:  { label: "text-emerald-400", active: "bg-emerald-500/15 text-emerald-300", dot: "bg-emerald-400", switcher: "hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-300" },
  purple: { label: "text-violet-400",  active: "bg-violet-500/15 text-violet-300",   dot: "bg-violet-400",  switcher: "hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-300" },
  orange: { label: "text-amber-400",   active: "bg-amber-500/15 text-amber-300",     dot: "bg-amber-400",   switcher: "hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-300" },
  muted:  { label: "text-muted-foreground", active: "bg-muted text-foreground",      dot: "bg-slate-500",   switcher: "hover:bg-white/[0.05]" },
};

// ────────────────────────────────────────────────────────────
// Route → subsystem resolver
// ────────────────────────────────────────────────────────────
function detectSubsystem(pathname: string): SubsystemId | null {
  if (pathname.startsWith("/pre-protocolo")) return "pre";
  if (pathname.startsWith("/financeiro") || pathname.startsWith("/fin")) return "fin";
  if (pathname.startsWith("/atendimento") || pathname.startsWith("/crm")) return "crm";
  if (pathname.startsWith("/home")) return null;
  // default subsystem for /dashboard, /clientes, /processos, /agenda, /publicacoes, /diligencias, /relatorios, /generator, /sistema
  return "system";
}

/** Filtra lista de sub-sistemas pelo que está habilitado no tenant */
function filterByFeatures<T extends { [K in SubsystemId]?: unknown }>(map: T): Partial<T> {
  const out: Partial<T> = {};
  (Object.keys(map) as SubsystemId[]).forEach((k) => {
    if (isFeatureEnabled(k)) out[k] = map[k];
  });
  return out;
}

// ────────────────────────────────────────────────────────────
// Section component (vertical list)
// ────────────────────────────────────────────────────────────
function SidebarSection({
  label,
  items,
  color,
  collapsed,
}: {
  label: string;
  items: NavItem[];
  color: SectionColor;
  collapsed: boolean;
}) {
  const location = useLocation();
  const { label: labelCls, active: activeCls, dot: dotCls } = colorMap[color];

  return (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className={`text-[9px] uppercase tracking-[0.18em] font-semibold ${labelCls} opacity-70 px-3 pt-3 pb-1 flex items-center gap-1.5`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotCls} opacity-80`} />
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = location.pathname === item.url || location.pathname.startsWith(item.url + "/");
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className={
                    isActive
                      ? `${activeCls} rounded-xl mx-1`
                      : "text-sidebar-foreground hover:bg-white/[0.06] hover:text-foreground rounded-xl mx-1 transition-colors"
                  }
                >
                  <NavLink to={item.url} end className="" activeClassName="">
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="text-sm">{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

// ────────────────────────────────────────────────────────────
// Subsystem switcher (other systems list)
// ────────────────────────────────────────────────────────────
function SubsystemSwitcher({ current, collapsed }: { current: SubsystemId | null; collapsed: boolean }) {
  const navigate = useNavigate();
  const others = (Object.entries(SUBSYSTEMS) as [SubsystemId, typeof SUBSYSTEMS.system][])
    .filter(([id]) => id !== current && isFeatureEnabled(id));
  if (others.length === 0) return null;

  return (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.18em] font-semibold text-muted-foreground/70 px-3 pt-3 pb-1.5">
          Outros sistemas
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <div className={collapsed ? "flex flex-col gap-1" : "flex flex-col gap-1.5 px-1"}>
          {others.map(([id, def]) => {
            const tk = colorMap[def.color];
            return (
              <button
                key={id}
                onClick={() => navigate(def.home)}
                className={cn(
                  "group flex items-center gap-2 rounded-xl transition-all",
                  collapsed ? "justify-center h-9 mx-auto" : "px-3 py-2 border border-white/[0.05] bg-white/[0.02] hover:scale-[1.02]",
                  !collapsed && tk.switcher,
                )}
                title={def.label}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", tk.dot)} />
                {!collapsed && (
                  <>
                    <span className="text-xs font-semibold tracking-tight flex-1 text-left">{def.label}</span>
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </>
                )}
              </button>
            );
          })}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

// ────────────────────────────────────────────────────────────
// Main sidebar
// ────────────────────────────────────────────────────────────
export function AppSidebar() {
  const { isAdmin } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const currentSubsystem = useMemo(() => {
    const detected = detectSubsystem(location.pathname);
    // Se o sub-sistema detectado está desabilitado pelo tenant, não mostra a seção
    if (detected && !isFeatureEnabled(detected)) return null;
    return detected;
  }, [location.pathname]);
  const currentDef = currentSubsystem ? SUBSYSTEMS[currentSubsystem] : null;

  return (
    <Sidebar collapsible="icon" className="border-none bg-transparent h-full">
      {/* Logo / brand header — click to go home */}
      <button
        onClick={() => navigate("/home")}
        className={`flex items-center h-14 shrink-0 border-b border-white/[0.06] transition-colors hover:bg-white/[0.02] ${collapsed ? "justify-center px-2" : "px-4 gap-3"}`}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 ring-1 ring-violet-400/30 shrink-0">
          <Scale className="h-4 w-4 text-violet-400" />
        </div>
        {!collapsed && (
          <div className="flex flex-col justify-center text-left">
            <span className="font-bold text-sm tracking-tight text-foreground leading-none">{appConfig.name}</span>
            <span className="text-[9px] text-cyan-400/70 uppercase tracking-[0.15em] font-mono leading-none mt-1">{appConfig.tagline}</span>
          </div>
        )}
      </button>

      <SidebarContent className="py-1 overflow-y-auto scrollbar-thin">
        {/* Current subsystem items (or portal welcome if /home) */}
        {currentDef ? (
          <SidebarSection
            label={currentDef.label}
            items={currentDef.items}
            color={currentDef.color}
            collapsed={collapsed}
          />
        ) : (
          !collapsed && (
            <div className="px-3 pt-4 pb-2">
              <p className="text-[11px] text-muted-foreground/70">
                Você está no portal. Escolha um sub-sistema abaixo ou pelos cards da direita.
              </p>
            </div>
          )
        )}

        {/* Switcher: other subsystems */}
        <SubsystemSwitcher current={currentSubsystem} collapsed={collapsed} />

        {/* Configurações */}
        <SidebarSection label="Configurações" items={configItems} color="muted" collapsed={collapsed} />

        {/* Admin */}
        {isAdmin && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.18em] font-semibold text-red-400/70 px-3 pt-3 pb-1 flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400 opacity-80" />
                Admin
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Administração"
                    className={
                      location.pathname === "/admin"
                        ? "bg-red-500/15 text-red-300 rounded-xl mx-1"
                        : "text-sidebar-foreground hover:bg-white/[0.06] hover:text-foreground rounded-xl mx-1 transition-colors"
                    }
                  >
                    <NavLink to="/admin" end className="" activeClassName="">
                      <Shield className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">Administração</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-white/[0.05] p-3">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3 text-cyan-400/60 shrink-0" />
            <p className="text-[9px] text-muted-foreground font-mono tracking-widest uppercase">
              {appConfig.name} v2.0
            </p>
          </div>
        ) : (
          <Zap className="h-3 w-3 text-cyan-400/50 mx-auto" />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
