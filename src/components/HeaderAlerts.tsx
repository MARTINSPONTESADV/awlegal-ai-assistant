import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface AlertItem {
  id: string;
  titulo: string;
  data_prazo: string;
  status: string;
}

export function HeaderAlerts() {
  const [items, setItems] = useState<AlertItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("agenda")
        .select("id, titulo, data_prazo, status")
        .eq("status", "pendente")
        .order("data_prazo", { ascending: true })
        .limit(15);
      if (data) setItems(data);
    };
    fetch();
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const fiveDaysFromNow = new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0];

  const getColor = (dataPrazo: string) => {
    if (dataPrazo <= today) return "text-destructive font-semibold";
    if (dataPrazo <= fiveDaysFromNow) return "text-warning font-medium";
    return "text-success";
  };

  const getBadge = (dataPrazo: string) => {
    if (dataPrazo <= today) return <Badge variant="destructive" className="text-[10px] px-1.5">Urgente</Badge>;
    if (dataPrazo <= fiveDaysFromNow) return <Badge className="bg-warning text-warning-foreground text-[10px] px-1.5">Próximo</Badge>;
    return null;
  };

  const urgentCount = items.filter(i => i.data_prazo <= fiveDaysFromNow).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative text-foreground hover:bg-muted">
          <Bell className="h-4 w-4" />
          {urgentCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
              {urgentCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <p className="font-semibold text-sm">Alertas de Prazos</p>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {items.length > 0 ? items.map(item => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2 border-b border-border last:border-0 hover:bg-accent cursor-pointer" onClick={() => navigate("/agenda")}>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{item.titulo}</p>
                <p className={`text-xs ${getColor(item.data_prazo)}`}>
                  {new Date(item.data_prazo + "T00:00:00").toLocaleDateString("pt-BR")}
                </p>
              </div>
              {getBadge(item.data_prazo)}
            </div>
          )) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sem prazos pendentes</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}