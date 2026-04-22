import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { jsonToCsv, downloadCsv } from "@/lib/exportCsv";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

const tables = [
  { key: "clientes", label: "Exportar Clientes" },
  { key: "processos", label: "Exportar Processos" },
  { key: "agenda", label: "Exportar Agenda" },
  { key: "honorarios", label: "Exportar Honorários" },
] as const;

const auxTables = ["aux_comarcas", "aux_fases", "aux_assuntos"] as const;

export default function Exportar() {
  useEffect(() => { document.title = "Exportar — AW ECO"; }, []);
  const [loading, setLoading] = useState<string | null>(null);

  const exportTable = async (table: string) => {
    setLoading(table);
    try {
      const { data, error } = await supabase.from(table as any).select("*");
      if (error) throw error;
      if (!data?.length) { toast.error(`Tabela ${table} está vazia`); return; }
      downloadCsv(table, jsonToCsv(data));
      toast.success(`${table}.csv baixado!`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao exportar");
    } finally {
      setLoading(null);
    }
  };

  const exportAux = async () => {
    setLoading("aux");
    try {
      for (const t of auxTables) {
        const { data, error } = await supabase.from(t).select("*");
        if (error) throw error;
        if (data?.length) downloadCsv(t, jsonToCsv(data));
      }
      toast.success("Tabelas auxiliares exportadas!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao exportar auxiliares");
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <h2 className="font-display text-3xl font-bold mb-6">Exportar Dados</h2>
      <p className="text-muted-foreground mb-6">Baixe os dados de cada tabela em formato CSV para migração.</p>
      <Card>
        <CardHeader><CardTitle>Tabelas Principais</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {tables.map(t => (
            <Button key={t.key} onClick={() => exportTable(t.key)} disabled={loading !== null} variant="outline">
              {loading === t.key ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              {t.label}
            </Button>
          ))}
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader><CardTitle>Tabelas Auxiliares</CardTitle></CardHeader>
        <CardContent>
          <Button onClick={exportAux} disabled={loading !== null} variant="outline">
            {loading === "aux" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Exportar Tabelas Auxiliares
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
