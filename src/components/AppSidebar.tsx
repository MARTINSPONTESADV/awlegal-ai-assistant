import { useAuth } from "@/hooks/useAuth";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Briefcase, Newspaper, CalendarDays,
  MessageSquare, BarChart3, FileText, DollarSign, Search,
  Shield, DatabaseBackup, Settings, Scale, Headphones, TrendingUp,
  Zap,
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

const hubJuridico = [
  { title: "Dashboard",    url: "/dashboard",   icon: LayoutDashboard },
  { title: "Clientes",     url: "/clientes",    icon: Users },
  { title: "Processos",    url: "/processos",   icon: Briefcase },
  { title: "Publicações",  url: "/publicacoes", icon: Newspaper },
  { title: "Agenda",       url: "/agenda",      icon: CalendarDays },
  { title: "Diligências",  url: "/diligencias", icon: Search },
  { title: "Relatórios",   url: "/relatorios",  icon: BarChart3 },
  { title: "Gerador Docs", url: "/generator",   icon: FileText },
];

const centralResolvaJa = [
  { title: "Atendimento", url: "/atendimento", icon: MessageSquare },
];

const comercialCrm = [
  { title: "Funil de Vendas", url: "/crm",       icon: TrendingUp },
  { title: "Financeiro",      url: "/financeiro", icon: DollarSign },
];

const configItems = [
  { title: "Exportar", url: "/exportar", icon: DatabaseBackup },
];

type SectionColor = "blue" | "green" | "purple" | "muted";

/** Tailwind CSS colour tokens per section */
const colorMap: Record<SectionColor, { label: string; active: string; dot: string }> = {
  blue:   { label: "text-cyan-400",    active: "bg-cyan-500/15 text-cyan-300",    dot: "bg-cyan-400" },
  green:  { label: "text-emerald-400", active: "bg-emerald-500/15 text-emerald-300", dot: "bg-emerald-400" },
  purple: { label: "text-violet-400",  active: "bg-violet-500/15 text-violet-300",  dot: "bg-violet-400" },
  muted:  { label: "text-muted-foreground", active: "bg-muted text-foreground",  dot: "bg-slate-500" },
};

function SidebarSection({
  label,
  emoji,
  items,
  color,
  collapsed,
}: {
  label: string;
  emoji: string;
  items: typeof hubJuridico;
  color: SectionColor;
  collapsed: boolean;
}) {
  const location = useLocation();
  const { label: labelCls, active: activeCls, dot: dotCls } = colorMap[color];

  return (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel
          className={`text-[9px] uppercase tracking-[0.18em] font-semibold ${labelCls} opacity-70 px-3 pt-3 pb-1 flex items-center gap-1.5`}
        >
          {/* Tiny colour dot */}
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotCls} opacity-80`} />
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              location.pathname === item.url ||
              location.pathname.startsWith(item.url + "/");
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

export function AppSidebar() {
  const { isAdmin } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar
      collapsible="icon"
      className="border-none bg-transparent h-full"
    >
      {/* Logo / brand header */}
      <div className={`flex items-center h-14 shrink-0 border-b border-white/[0.06] ${collapsed ? "justify-center px-2" : "px-4 gap-3"}`}>
        {/* Neon icon backdrop */}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 ring-1 ring-violet-400/30 shrink-0">
          <Scale className="h-4 w-4 text-violet-400" />
        </div>
        {!collapsed && (
          <div className="flex flex-col justify-center">
            <span className="font-bold text-sm tracking-tight text-foreground leading-none">AW LEGAL</span>
            <span className="text-[9px] text-cyan-400/70 uppercase tracking-[0.15em] font-mono leading-none mt-1">Legaltech</span>
          </div>
        )}
      </div>

      <SidebarContent className="py-1 overflow-y-auto scrollbar-hide">
        <SidebarSection label="Hub Jurídico"     emoji="⚖️" items={hubJuridico}     color="blue"   collapsed={collapsed} />
        <SidebarSection label="Central Resolva Já" emoji="💬" items={centralResolvaJa} color="green" collapsed={collapsed} />
        <SidebarSection label="Comercial CRM"    emoji="📈" items={comercialCrm}    color="purple" collapsed={collapsed} />
        <SidebarSection label="Configurações"    emoji="⚙️" items={configItems}     color="muted"  collapsed={collapsed} />

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
              AW Legaltech v2.0
            </p>
          </div>
        ) : (
          <Zap className="h-3 w-3 text-cyan-400/50 mx-auto" />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
