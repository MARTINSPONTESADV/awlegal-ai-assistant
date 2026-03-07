import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isProcessoEncerrado } from "@/lib/financeiro";

interface CausaData {
  causaTotal: number;
  causaAtivo: number;
  causaInativo: number;
  loading: boolean;
}

export function useTotalCausa(): CausaData {
  const [data, setData] = useState<CausaData>({ causaTotal: 0, causaAtivo: 0, causaInativo: 0, loading: true });

  useEffect(() => {
    const load = async () => {
      const { data: procs } = await supabase
        .from("processos")
        .select("valor_causa, situacao, status_pagamento_honorarios, fase_id, aux_fases(nome)");
      if (!procs) { setData(d => ({ ...d, loading: false })); return; }

      let total = 0, ativo = 0, inativo = 0;
      procs.forEach((p: any) => {
        const val = Number(p.valor_causa || 0);
        total += val;
        const faseName = (p.aux_fases?.nome || "").toLowerCase();
        const encerrado = isProcessoEncerrado(p) || faseName.includes("arquivamento");
        if (encerrado) {
          inativo += val;
        } else {
          ativo += val;
        }
      });
      setData({ causaTotal: total, causaAtivo: ativo, causaInativo: inativo, loading: false });
    };
    load();
  }, []);

  return data;
}
