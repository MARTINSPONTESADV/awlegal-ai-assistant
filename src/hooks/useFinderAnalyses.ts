import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type FinderAnalysisRow = Database["public"]["Tables"]["finder_analyses"]["Row"];
type FinderAnalysisInsert = Database["public"]["Tables"]["finder_analyses"]["Insert"];

export interface FinderAnalysisWithCliente extends FinderAnalysisRow {
  cliente: {
    id: string;
    nome_completo: string;
    cpf: string | null;
  } | null;
}

export function useFinderAnalyses() {
  return useQuery<FinderAnalysisWithCliente[]>({
    queryKey: ["finder_analyses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finder_analyses")
        .select("*, cliente:clientes(id, nome_completo, cpf)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as FinderAnalysisWithCliente[];
    },
  });
}

export function useFinderAnalysis(id: string | null | undefined) {
  return useQuery<FinderAnalysisWithCliente | null>({
    queryKey: ["finder_analyses", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("finder_analyses")
        .select("*, cliente:clientes(id, nome_completo, cpf)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as FinderAnalysisWithCliente | null;
    },
  });
}

export interface CreateFinderAnalysisInput {
  cliente_id: string;
  banco: string;
  agencia?: string | null;
  conta?: string | null;
  periodo_label?: string | null;
  data_inicio_descontos?: string | null;
  data_fim_descontos?: string | null;
  valor_total_descontos?: number | null;
  valor_dobro?: number | null;
  rubricas?: string[];
  raw_grouped?: unknown;
  xlsxBlob?: Blob | null;
  xlsxFilename?: string | null;
}

export function useCreateFinderAnalysis() {
  const qc = useQueryClient();
  return useMutation<FinderAnalysisRow, Error, CreateFinderAnalysisInput>({
    mutationFn: async (input) => {
      let xlsxPath: string | null = null;

      const insertPayload: FinderAnalysisInsert = {
        cliente_id: input.cliente_id,
        banco: input.banco,
        agencia: input.agencia ?? null,
        conta: input.conta ?? null,
        periodo_label: input.periodo_label ?? null,
        data_inicio_descontos: input.data_inicio_descontos ?? null,
        data_fim_descontos: input.data_fim_descontos ?? null,
        valor_total_descontos: input.valor_total_descontos ?? null,
        valor_dobro: input.valor_dobro ?? null,
        rubricas: (input.rubricas ?? []) as unknown as FinderAnalysisInsert["rubricas"],
        raw_grouped: (input.raw_grouped ?? null) as FinderAnalysisInsert["raw_grouped"],
        xlsx_filename: input.xlsxFilename ?? null,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("finder_analyses")
        .insert(insertPayload)
        .select()
        .single();
      if (insertErr) throw insertErr;

      if (input.xlsxBlob) {
        xlsxPath = `${inserted.id}.xlsx`;
        const { error: uploadErr } = await supabase.storage
          .from("finder-analyses")
          .upload(xlsxPath, input.xlsxBlob, {
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            upsert: true,
          });
        if (uploadErr) throw uploadErr;

        const { data: updated, error: updateErr } = await supabase
          .from("finder_analyses")
          .update({ xlsx_storage_path: xlsxPath })
          .eq("id", inserted.id)
          .select()
          .single();
        if (updateErr) throw updateErr;
        return updated;
      }

      return inserted;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finder_analyses"] });
    },
  });
}

export async function fetchFinderAnalysisXlsxBase64(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("finder-analyses")
    .download(path);
  if (error || !data) return null;
  const buffer = await data.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
