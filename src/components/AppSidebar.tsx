import { useAuth } from "@/hooks/useAuth";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Briefcase, Newspaper, CalendarDays,
  MessageSquare, BarChart3, FileText, DollarSign, Search,
  Shield, DatabaseBackup, Settings, Scale, Headphones, TrendingUp,
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
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Processos", url: "/processos", icon: Briefcase },
  { title: "Publicações", url: "/publicacoes", icon: Newspaper },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Diligências", url: "/diligencias", icon: Search },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Gerador Docs", url: "/generator", icon: FileText },
];

const centralResolvaJa = [
  { title: "Atendimento", url: "/atendimento", icon: MessageSquare },
];

const comercialCrm = [
  { title: "Funil de Vendas", url: "/crm", icon: TrendingUp },
];

const configItems = [
  { title: "Exportar", url: "/exportar", icon: DatabaseBackup },
];

type SectionColor = "blue" | "green" | "purple" | "muted";

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

  const colorMap: Record<SectionColor, string> = {
    blue: "text-blue-400",
    green: "text-emerald-400",
    purple: "text-purple-400",
    muted: "text-muted-foreground",
  };

  const activeBgMap: Record<SectionColor, string> = {
    blue: "bg-blue-500/15 text-blue-400",
    green: "bg-emerald-500/15 text-emerald-400",
    purple: "bg-purple-500/15 text-purple-400",
    muted: "bg-muted text-foreground",
  };

  return (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className={`text-[10px] uppercase tracking-widest ${colorMap[color]} opacity-80`}>
          {emoji} {label}
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
                  className={isActive ? activeBgMap[color] : "text-sidebar-foreground hover:bg-sidebar-accent"}
                >
                  <NavLink to={item.url} end className="" activeClassName="">
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar-background">
      <div className="flex items-center h-14 px-3 border-b border-sidebar-border shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-purple-400" />
            <span className="font-bold text-sm tracking-wide text-foreground">AW LEGAL</span>
          </div>
        ) : (
          <Scale className="h-5 w-5 text-purple-400 mx-auto" />
        )}
      </div>

      <SidebarContent className="py-2">
        <SidebarSection label="Hub Jurídico" emoji="⚖️" items={hubJuridico} color="blue" collapsed={collapsed} />
        <SidebarSection label="Central Resolva Já" emoji="💬" items={centralResolvaJa} color="green" collapsed={collapsed} />
        <SidebarSection label="Comercial CRM" emoji="📈" items={comercialCrm} color="purple" collapsed={collapsed} />
        <SidebarSection label="Configurações" emoji="⚙️" items={configItems} color="muted" collapsed={collapsed} />

        {isAdmin && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-red-400/80">
                🛡️ Admin
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Administração"
                    className={location.pathname === "/admin" ? "bg-red-500/15 text-red-400" : "text-sidebar-foreground hover:bg-sidebar-accent"}
                  >
                    <NavLink to="/admin" end className="" activeClassName="">
                      <Shield className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>Administração</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        {!collapsed && (
          <p className="text-[10px] text-muted-foreground text-center">AW LegalTech v2.0</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
