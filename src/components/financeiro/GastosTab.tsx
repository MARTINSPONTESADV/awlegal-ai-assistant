import { useMemo, useState } from "react";
import { SpotlightCard } from "@/components/SpotlightCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, TrendingDown, Receipt, Repeat, AlertCircle, Pencil, Trash2, Search,
  BarChart3, PieChart as PieIcon, RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { fmtBRL } from "@/lib/financeiro";
import { useGastos, type Gasto } from "@/hooks/useGastos";
import GastoFormDialog from "./GastoFormDialog";
import { toast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  pago: "hsl(142, 71%, 45%)",
  pendente: "hsl(45, 80%, 50%)",
  vencido: "hsl(0, 60%, 50%)",
  cancelado: "hsl(0, 0%, 50%)",
};

function KPICard({
  label, value, subtitle, icon: Icon, color,
}: { label: string; value: string; subtitle?: string; icon: any; color: string }) {
  return (
    <SpotlightCard>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl shrink-0" style={{ backgroundColor: `${color}20` }}>
          <Icon className="h-7 w-7" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold tracking-tight truncate">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </SpotlightCard>
  );
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: any; className?: string }> = {
    pago: { label: "Pago", variant: "default" },
    pendente: { label: "Pendente", variant: "secondary" },
    vencido: { label: "Vencido", variant: "destructive" },
    cancelado: { label: "Cancelado", variant: "outline" },
  };
  const cfg = map[status] || map.pago;
  return <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>;
}

export default function GastosTab() {
  const g = useGastos();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Gasto | null>(null);
  const [toDelete, setToDelete] = useState<Gasto | null>(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPeriodo, setFilterPeriodo] = useState<"mes" | "3m" | "ano" | "all">("mes");
  const [onlyRecorrente, setOnlyRecorrente] = useState(false);

  const filtered = useMemo(() => {
    const now = new Date();
    const cutoffMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const cutoff3m = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10);
    const cutoffYear = `${now.getFullYear()}-01-01`;

    return g.gastos.filter(gasto => {
      if (filterPeriodo === "mes" && !gasto.data_gasto.startsWith(cutoffMonth)) return false;
      if (filterPeriodo === "3m" && gasto.data_gasto < cutoff3m) return false;
      if (filterPeriodo === "ano" && gasto.data_gasto < cutoffYear) return false;
      if (filterCat !== "all" && gasto.categoria_id !== filterCat) return false;
      if (filterStatus !== "all" && gasto.status !== filterStatus) return false;
      if (onlyRecorrente && !gasto.recorrente) return false;
      if (search && !`${gasto.descricao} ${gasto.fornecedor || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [g.gastos, filterPeriodo, filterCat, filterStatus, onlyRecorrente, search]);

  const filteredTotal = useMemo(() => filtered.reduce((s, x) => s + Number(x.valor), 0), [filtered]);

  const handleCreate = () => { setEditing(null); setFormOpen(true); };
  const handleEdit = (gasto: Gasto) => { setEditing(gasto); setFormOpen(true); };

  const handleSubmit = async (input: any) => {
    if (editing) {
      await g.updateGasto(editing.id, input);
    } else {
      await g.createGasto(input);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await g.deleteGasto(toDelete.id);
      toast({ title: "Gasto removido" });
      setToDelete(null);
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    }
  };

  if (g.loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Carregando gastos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header: título + CTA */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold">Controle de Gastos</h3>
          <p className="text-xs text-muted-foreground">Métricas e registros de despesas do escritório</p>
        </div>
        <Button onClick={handleCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo gasto</Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Gasto do mês"
          value={fmtBRL(g.kpis.totalMes)}
          subtitle={`${g.kpis.countMes} lançamento${g.kpis.countMes === 1 ? "" : "s"}`}
          icon={TrendingDown} color="hsl(0, 60%, 50%)"
        />
        <KPICard
          label="Acumulado do ano"
          value={fmtBRL(g.kpis.totalAno)}
          icon={Receipt} color="hsl(30, 80%, 50%)"
        />
        <KPICard
          label="Recorrente mensal"
          value={fmtBRL(g.kpis.recorrenteMensal)}
          subtitle={`${g.kpis.countRecorrente} fixo${g.kpis.countRecorrente === 1 ? "" : "s"}`}
          icon={Repeat} color="hsl(260, 60%, 55%)"
        />
        <KPICard
          label="Pendentes / vencidos"
          value={fmtBRL(g.kpis.totalPendentes)}
          subtitle={`${g.kpis.countPendentes} aguardando pagamento`}
          icon={AlertCircle} color="hsl(45, 80%, 50%)"
        />
      </div>

      {/* Charts: trend + category */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <SpotlightCard className="lg:col-span-2">
          <h3 className="text-base font-semibold mb-4 text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Evolução mensal (últimos 12 meses)
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={g.trendMensal} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={50} />
              <RTooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [fmtBRL(v), "Gasto"]}
              />
              <Bar dataKey="total" fill="hsl(0, 60%, 50%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SpotlightCard>

        <SpotlightCard>
          <h3 className="text-base font-semibold mb-4 text-muted-foreground flex items-center gap-2">
            <PieIcon className="h-5 w-5" /> Por categoria (mês atual)
          </h3>
          {g.porCategoriaMes.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">Sem dados este mês</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={g.porCategoriaMes}
                  dataKey="total"
                  nameKey="nome"
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {g.porCategoriaMes.map((entry) => (
                    <Cell key={entry.categoria_id} fill={entry.cor} />
                  ))}
                </Pie>
                <RTooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [fmtBRL(v), "Total"]}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SpotlightCard>
      </div>

      {/* Top fornecedores (if any) */}
      {g.topFornecedores.length > 0 && (
        <SpotlightCard>
          <h3 className="text-base font-semibold mb-4 text-muted-foreground">Top fornecedores (mês atual)</h3>
          <div className="space-y-2">
            {g.topFornecedores.map((f, i) => (
              <div key={f.fornecedor} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4">#{i + 1}</span>
                <span className="text-sm font-medium flex-1 truncate">{f.fornecedor}</span>
                <span className="text-sm font-semibold">{fmtBRL(f.total)}</span>
              </div>
            ))}
          </div>
        </SpotlightCard>
      )}

      {/* Filters */}
      <SpotlightCard>
        <div className="flex items-center flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição ou fornecedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={filterPeriodo} onValueChange={(v: any) => setFilterPeriodo(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Mês atual</SelectItem>
              <SelectItem value="3m">Últimos 3 meses</SelectItem>
              <SelectItem value="ano">Ano atual</SelectItem>
              <SelectItem value="all">Tudo</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {g.categorias.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: c.cor }} />
                    {c.nome}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch id="onlyrec" checked={onlyRecorrente} onCheckedChange={setOnlyRecorrente} />
            <label htmlFor="onlyrec" className="text-xs text-muted-foreground cursor-pointer">Só recorrentes</label>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
          <span>{filtered.length} {filtered.length === 1 ? "lançamento" : "lançamentos"}</span>
          <span>•</span>
          <span>Total filtrado: <strong className="text-foreground">{fmtBRL(filteredTotal)}</strong></span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 px-2 font-medium">Data</th>
                <th className="py-2 px-2 font-medium">Descrição</th>
                <th className="py-2 px-2 font-medium">Categoria</th>
                <th className="py-2 px-2 font-medium text-right">Valor</th>
                <th className="py-2 px-2 font-medium">Pagamento</th>
                <th className="py-2 px-2 font-medium">Status</th>
                <th className="py-2 px-2 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-xs">Nenhum gasto no filtro atual.</td></tr>
              )}
              {filtered.map(gasto => {
                const cat = g.categoriaById[gasto.categoria_id];
                return (
                  <tr key={gasto.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-2 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(gasto.data_gasto)}</td>
                    <td className="py-2 px-2">
                      <div className="font-medium truncate max-w-[220px]">{gasto.descricao}</div>
                      {gasto.fornecedor && <div className="text-[11px] text-muted-foreground/70 truncate max-w-[220px]">{gasto.fornecedor}</div>}
                    </td>
                    <td className="py-2 px-2">
                      {cat && (
                        <span className="inline-flex items-center gap-1.5 text-[11px]">
                          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: cat.cor }} />
                          {cat.nome}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold whitespace-nowrap">{fmtBRL(Number(gasto.valor))}</td>
                    <td className="py-2 px-2 text-xs text-muted-foreground whitespace-nowrap">
                      {gasto.forma_pagamento || "—"}
                      {gasto.recorrente && <Badge variant="outline" className="ml-1 text-[9px] py-0 px-1">{gasto.frequencia || "rec"}</Badge>}
                    </td>
                    <td className="py-2 px-2"><StatusBadge status={gasto.status} /></td>
                    <td className="py-2 px-2 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(gasto)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setToDelete(gasto)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SpotlightCard>

      {/* Form Dialog */}
      <GastoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categorias={g.categorias}
        gasto={editing}
        onSubmit={handleSubmit}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente o lançamento <strong>{toDelete?.descricao}</strong> ({fmtBRL(Number(toDelete?.valor || 0))}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
