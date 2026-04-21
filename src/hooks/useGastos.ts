import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GastoStatus = "pago" | "pendente" | "vencido" | "cancelado";
export type GastoFrequencia = "mensal" | "anual" | "trimestral" | "semanal";
export type FormaPagamento =
  | "PIX" | "Cartão de Crédito" | "Cartão de Débito" | "Dinheiro"
  | "Boleto" | "Transferência" | "Débito Automático" | "Outro";

export interface CategoriaGasto {
  id: string;
  nome: string;
  cor: string;
  icone: string;
  ativa: boolean;
  ordem: number;
}

export interface Gasto {
  id: string;
  descricao: string;
  categoria_id: string;
  valor: number;
  data_gasto: string;
  forma_pagamento: FormaPagamento | null;
  recorrente: boolean;
  frequencia: GastoFrequencia | null;
  fornecedor: string | null;
  status: GastoStatus;
  data_vencimento: string | null;
  observacoes: string | null;
  comprovante_url: string | null;
  cliente_id: string | null;
  processo_id: string | null;
  created_at: string;
  updated_at: string;
}

export type GastoInput = Omit<Gasto, "id" | "created_at" | "updated_at">;

export function useGastos() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [gRes, cRes] = await Promise.all([
        (supabase as any).from("gastos").select("*").order("data_gasto", { ascending: false }),
        (supabase as any).from("aux_categorias_gastos").select("*").eq("ativa", true).order("ordem"),
      ]);
      if (gRes.error) throw gRes.error;
      if (cRes.error) throw cRes.error;
      setGastos((gRes.data as Gasto[]) || []);
      setCategorias((cRes.data as CategoriaGasto[]) || []);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar gastos");
      console.error("[useGastos] load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createGasto = useCallback(async (input: Partial<GastoInput>) => {
    const { data, error } = await (supabase as any).from("gastos").insert(input).select().single();
    if (error) throw error;
    await load();
    return data as Gasto;
  }, [load]);

  const updateGasto = useCallback(async (id: string, patch: Partial<GastoInput>) => {
    const { data, error } = await (supabase as any).from("gastos").update(patch).eq("id", id).select().single();
    if (error) throw error;
    await load();
    return data as Gasto;
  }, [load]);

  const deleteGasto = useCallback(async (id: string) => {
    const { error } = await (supabase as any).from("gastos").delete().eq("id", id);
    if (error) throw error;
    await load();
  }, [load]);

  const categoriaById = useMemo(() => {
    const m: Record<string, CategoriaGasto> = {};
    categorias.forEach(c => { m[c.id] = c; });
    return m;
  }, [categorias]);

  // --- Derived metrics ---
  const now = useMemo(() => new Date(), []);
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const currentMonth = monthKey(now);
  const currentYear = now.getFullYear();

  const kpis = useMemo(() => {
    const ativos = gastos.filter(g => g.status !== "cancelado");
    const doMes = ativos.filter(g => g.data_gasto.startsWith(currentMonth));
    const doAno = ativos.filter(g => new Date(g.data_gasto).getFullYear() === currentYear);
    const recorrentesMensais = ativos.filter(g => g.recorrente && g.frequencia === "mensal");
    const pendentes = gastos.filter(g => g.status === "pendente" || g.status === "vencido");

    return {
      totalMes: doMes.reduce((s, g) => s + Number(g.valor), 0),
      countMes: doMes.length,
      totalAno: doAno.reduce((s, g) => s + Number(g.valor), 0),
      recorrenteMensal: recorrentesMensais.reduce((s, g) => s + Number(g.valor), 0),
      countRecorrente: recorrentesMensais.length,
      totalPendentes: pendentes.reduce((s, g) => s + Number(g.valor), 0),
      countPendentes: pendentes.length,
    };
  }, [gastos, currentMonth, currentYear]);

  const trendMensal = useMemo(() => {
    // Last 12 months including current
    const buckets: { month: string; label: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = monthKey(d);
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
      buckets.push({ month: k, label, total: 0 });
    }
    const idx: Record<string, number> = {};
    buckets.forEach((b, i) => { idx[b.month] = i; });
    gastos.filter(g => g.status !== "cancelado").forEach(g => {
      const mk = g.data_gasto.slice(0, 7);
      if (idx[mk] !== undefined) buckets[idx[mk]].total += Number(g.valor);
    });
    return buckets;
  }, [gastos, now]);

  const porCategoriaMes = useMemo(() => {
    const m: Record<string, { categoria_id: string; nome: string; cor: string; total: number }> = {};
    gastos
      .filter(g => g.status !== "cancelado" && g.data_gasto.startsWith(currentMonth))
      .forEach(g => {
        const cat = categoriaById[g.categoria_id];
        const key = g.categoria_id;
        if (!m[key]) m[key] = {
          categoria_id: key,
          nome: cat?.nome || "Sem categoria",
          cor: cat?.cor || "#64748b",
          total: 0,
        };
        m[key].total += Number(g.valor);
      });
    return Object.values(m).sort((a, b) => b.total - a.total);
  }, [gastos, currentMonth, categoriaById]);

  const topFornecedores = useMemo(() => {
    const m: Record<string, number> = {};
    gastos
      .filter(g => g.status !== "cancelado" && g.fornecedor && g.data_gasto.startsWith(currentMonth))
      .forEach(g => {
        const f = g.fornecedor!.trim();
        if (!f) return;
        m[f] = (m[f] || 0) + Number(g.valor);
      });
    return Object.entries(m)
      .map(([fornecedor, total]) => ({ fornecedor, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [gastos, currentMonth]);

  return {
    gastos, categorias, categoriaById,
    loading, error,
    kpis, trendMensal, porCategoriaMes, topFornecedores,
    createGasto, updateGasto, deleteGasto,
    reload: load,
  };
}
