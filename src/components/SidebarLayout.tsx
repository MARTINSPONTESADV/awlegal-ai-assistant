import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { HeaderAlerts } from "@/components/HeaderAlerts";
import { UserPanel } from "@/components/UserPanel";
import { useAuth } from "@/hooks/useAuth";
import { Outlet, useLocation } from "react-router-dom";

// Rotas que preenchem a tela inteira (sem padding do layout)
const FULLBLEED_ROUTES = ["/atendimento", "/crm"];

export function SidebarLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const isFullBleed = FULLBLEED_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <SidebarProvider>
      {/* Full-screen deep space canvas */}
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* Ambient light orbs in background */}
        <div className="mesh-blob mesh-blob-1 pointer-events-none" />
        <div className="mesh-blob mesh-blob-2 pointer-events-none" />
        <div className="mesh-blob mesh-blob-3 pointer-events-none" />

        {/* Floating sidebar – margin + rounded corners to "detach" it from screen edge */}
        <div className="relative z-20 flex flex-col p-3 shrink-0">
          <div className="h-full rounded-2xl overflow-hidden glass-sidebar border border-white/[0.06]">
            <AppSidebar />
          </div>
        </div>

        {/* Main content column */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 z-10 overflow-hidden">
          {/* Glassy topbar header */}
          <header className="h-14 flex items-center justify-between px-4 shrink-0 z-30
            glass-card border-b border-white/[0.06] backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
            </div>
            <GlobalSearch />
            <div className="flex items-center gap-2">
              <HeaderAlerts />
              <span className="text-xs text-muted-foreground hidden md:inline font-mono">
                {user?.email}
              </span>
              <UserPanel />
            </div>
          </header>

          {/* Page content – overflow-y-auto for normal pages (Dashboard, Financeiro, etc.)
              relative allows Atendimento to position absolute and escape the scroll. */}
          <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
            <div className={`flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden ${isFullBleed ? "" : "px-3 py-3 sm:px-6 sm:py-6"}`}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
