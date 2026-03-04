import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { HeaderAlerts } from "@/components/HeaderAlerts";
import { UserPanel } from "@/components/UserPanel";
import { useAuth } from "@/hooks/useAuth";
import { Outlet } from "react-router-dom";

export function SidebarLayout() {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-4 shrink-0 z-10">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            </div>
            <GlobalSearch />
            <div className="flex items-center gap-2">
              <HeaderAlerts />
              <span className="text-xs text-muted-foreground hidden md:inline">{user?.email}</span>
              <UserPanel />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
