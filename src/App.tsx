import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { SidebarLayout } from "@/components/SidebarLayout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Processos from "./pages/Processos";
import Agenda from "./pages/Agenda";
import Generator from "./pages/Generator";
import Admin from "./pages/Admin";
import ClienteDetail from "./pages/ClienteDetail";
import ProcessoDetail from "./pages/ProcessoDetail";
import Relatorios from "./pages/Relatorios";
import Publicacoes from "./pages/Publicacoes";
import Financeiro from "./pages/Financeiro";
import Diligencias from "./pages/Diligencias";
import Exportar from "./pages/Exportar";
import Atendimento from "./pages/Atendimento";
import CRM from "./pages/CRM";
import NotFound from "./pages/NotFound";
import HomeHub from "./pages/HomeHub";
import PreProtocolo from "./pages/PreProtocolo";
import WriterApp from "./pages/apps/Writer";
import FinderPage from "./pages/apps/Finder";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000, // 24h
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "awlegal-query-cache-v1",
  throttleTime: 1000,
});

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      maxAge: 24 * 60 * 60 * 1000,
      buster: "v1",
    }}
  >
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route element={<SidebarLayout />}>
                <Route path="/home" element={<HomeHub />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/clientes/:id" element={<ClienteDetail />} />
                <Route path="/processos" element={<Processos />} />
                <Route path="/processos/:id" element={<ProcessoDetail />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/fin" element={<Financeiro />} />
                <Route path="/publicacoes" element={<Publicacoes />} />
                <Route path="/diligencias" element={<Diligencias />} />
                <Route path="/generator" element={<Generator />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/exportar" element={<Exportar />} />
                <Route path="/atendimento" element={<Atendimento />} />
                <Route path="/crm" element={<CRM />} />
                <Route path="/sistema" element={<Dashboard />} />
                <Route path="/pre-protocolo" element={<PreProtocolo />} />
                <Route path="/pre-protocolo/writer" element={<WriterApp />} />
                <Route path="/pre-protocolo/finder" element={<FinderPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </PersistQueryClientProvider>
);

export default App;
