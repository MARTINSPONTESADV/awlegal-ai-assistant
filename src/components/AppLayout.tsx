import { useAuth } from "@/hooks/useAuth";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, Users, Briefcase, CalendarDays, FileText, Shield, BarChart3, Newspaper } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import { HeaderAlerts } from "@/components/HeaderAlerts";
import { GlobalSearch } from "@/components/GlobalSearch";
import { UserPanel } from "@/components/UserPanel";

const modules = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/processos", label: "Processos", icon: Briefcase },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/publicacoes", label: "Publicações", icon: Newspaper },
  { to: "/generator", label: "Gerador de Docs", icon: FileText },
];

export function AppLayout() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-primary text-primary-foreground shrink-0">
        <div className="container flex h-14 items-center justify-between">
          <h1
            className="font-display text-lg font-bold tracking-wide cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            Martins Pontes Advocacia
          </h1>
          <GlobalSearch />
          <div className="flex items-center gap-2">
            <HeaderAlerts />
            <span className="text-sm opacity-80 hidden sm:inline">{user?.email}</span>
            <UserPanel />
          </div>
        </div>
      </header>

      {/* Navigation bar */}
      <nav className="border-b border-border bg-card shrink-0">
        <div className="container flex items-center gap-1 overflow-x-auto py-1">
          {modules.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground whitespace-nowrap"
              activeClassName="bg-accent text-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground whitespace-nowrap ml-auto"
              activeClassName="bg-accent text-foreground"
            >
              <Shield className="h-4 w-4" />
              Administração
            </NavLink>
          )}
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1">
        <div className="container py-6 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}