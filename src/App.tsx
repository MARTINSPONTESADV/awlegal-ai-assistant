import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { HorizontalLayout } from "@/components/HorizontalLayout";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route element={<HorizontalLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/clientes/:id" element={<ClienteDetail />} />
                <Route path="/processos" element={<Processos />} />
                <Route path="/processos/:id" element={<ProcessoDetail />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/publicacoes" element={<Publicacoes />} />
                <Route path="/diligencias" element={<Diligencias />} />
                <Route path="/generator" element={<Generator />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/exportar" element={<Exportar />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;