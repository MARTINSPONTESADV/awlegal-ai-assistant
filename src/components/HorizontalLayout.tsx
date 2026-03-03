import { useRef, useState, useCallback, useEffect } from "react";
import { MeshGradientBackground } from "./MeshGradientBackground";
import { UserPanel } from "./UserPanel";
import { HeaderAlerts } from "./HeaderAlerts";
import { GlobalSearch } from "./GlobalSearch";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { LayoutDashboard, Users, Briefcase, CalendarDays, BarChart3, Newspaper, FileText, Shield, DollarSign, Search, DatabaseBackup } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Reorder } from "framer-motion";

const defaultSections = [
  { to: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { to: "/clientes", label: "Clientes", icon: "Users" },
  { to: "/processos", label: "Processos", icon: "Briefcase" },
  { to: "/agenda", label: "Agenda", icon: "CalendarDays" },
  { to: "/financeiro", label: "Financeiro", icon: "DollarSign" },
  { to: "/diligencias", label: "Diligências", icon: "Search" },
  { to: "/relatorios", label: "Relatórios", icon: "BarChart3" },
  { to: "/publicacoes", label: "Publicações", icon: "Newspaper" },
  { to: "/generator", label: "Gerador", icon: "FileText" },
];

const iconMap: Record<string, any> = { LayoutDashboard, Users, Briefcase, CalendarDays, BarChart3, Newspaper, FileText, Shield, DollarSign, Search, DatabaseBackup };

const STORAGE_KEY = "nav-order";

function loadOrder(): typeof defaultSections {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as string[];
      const ordered = parsed
        .map(to => defaultSections.find(s => s.to === to))
        .filter(Boolean) as typeof defaultSections;
      defaultSections.forEach(s => {
        if (!ordered.find(o => o.to === s.to)) ordered.push(s);
      });
      return ordered;
    }
  } catch {}
  return defaultSections;
}

export function HorizontalLayout() {
  const { user, isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState(loadOrder);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections.map(s => s.to)));
  }, [sections]);

  const scrollToSection = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  // Render nav items - on mobile as plain scrollable buttons, on desktop as reorderable
  const renderNavItems = () => {
    if (isMobile) {
      return (
        <div className="flex items-center gap-0">
          {sections.map((section) => {
            const Icon = iconMap[section.icon];
            const active = location.pathname.startsWith(section.to);
            return (
              <button
                key={section.to}
                onClick={() => scrollToSection(section.to)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all whitespace-nowrap select-none border-b-2",
                  active
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {section.label}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <Reorder.Group
        axis="x"
        values={sections}
        onReorder={setSections}
        className="flex items-center gap-0"
        as="div"
      >
        {sections.map((section) => {
          const Icon = iconMap[section.icon];
          const active = location.pathname.startsWith(section.to);
          return (
            <Reorder.Item
              key={section.to}
              value={section}
              as="div"
              className="cursor-grab active:cursor-grabbing"
              whileDrag={{ scale: 1.05, zIndex: 50 }}
            >
              <button
                onClick={() => scrollToSection(section.to)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap select-none border-b-2",
                  active
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {section.label}
              </button>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
    );
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col">
      <MeshGradientBackground />

      {/* Unified White Header */}
      <header className="relative z-10 bg-white shrink-0 border-b border-gray-200">
        {/* Top row: logo + search + user */}
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          <h1
            className="font-body text-xs md:text-sm font-bold tracking-wide cursor-pointer text-gray-900 uppercase truncate"
            onClick={() => navigate("/dashboard")}
          >
            <span className="hidden sm:inline">MARTINS PONTES ADVOCACIA </span>
            <span className="text-purple-700 font-black">AW LEGAL</span>
          </h1>
          <GlobalSearch />
          <div className="flex items-center gap-2 md:gap-3">
            <HeaderAlerts />
            <span className="text-xs text-gray-500 hidden md:inline">{user?.email}</span>
            <UserPanel />
          </div>
        </div>

        {/* Nav tabs - scrollable on mobile, reorderable on desktop */}
        <nav className="flex items-center gap-0 px-4 md:px-6 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
          {renderNavItems()}
          <div className="flex items-center gap-0 ml-auto">
            <button
              onClick={() => scrollToSection("/exportar")}
              className={cn(
                "flex items-center gap-1.5 px-3 md:px-4 py-2.5 text-xs md:text-sm font-medium transition-all whitespace-nowrap border-b-2",
                location.pathname === "/exportar"
                  ? "border-purple-600 text-purple-700"
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
              )}
            >
              <DatabaseBackup className="h-3.5 md:h-4 w-3.5 md:w-4" />
              Exportar
            </button>
            {isAdmin && (
              <button
                onClick={() => scrollToSection("/admin")}
                className={cn(
                  "flex items-center gap-1.5 px-3 md:px-4 py-2.5 text-xs md:text-sm font-medium transition-all whitespace-nowrap border-b-2",
                  location.pathname === "/admin"
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
                )}
              >
                <Shield className="h-3.5 md:h-4 w-3.5 md:w-4" />
                Admin
              </button>
            )}
          </div>
        </nav>
      </header>

      <main ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-full px-4 md:px-8 py-6 md:py-8 mx-auto animate-fade-in" style={{ maxWidth: "1400px" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}