/**
 * Utility functions for financial calculations: honorários vs repasse
 */

/** Format currency as BRL with exactly 2 decimal places */
export const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

/** Calculate the office's share (honorários) */
export const calcEscritorio = (valorBruto: number, percentual: number) =>
  valorBruto * (percentual / 100);

/** Calculate client's repasse */
export const calcRepasse = (valorBruto: number, percentual: number) =>
  valorBruto - calcEscritorio(valorBruto, percentual);

/** Determine if a processo is considered "ativo" for financial purposes.
 *  A processo is ativo if situacao is exactly "Ativo" OR null/empty (legacy data). */
export const isProcessoAtivo = (situacao: string | null | undefined): boolean => {
  if (!situacao) return true; // legacy rows without situacao count as active
  return situacao === "Ativo";
};

/** Determine if a processo is financially encerrado (opposite of ativo) */
export const isProcessoEncerrado = (p: { situacao?: string | null; status_pagamento_honorarios?: string | null }): boolean => {
  if (p.status_pagamento_honorarios === "Pago") return true;
  const sit = (p.situacao || "").toLowerCase();
  if (sit === "inativo" || sit === "encerrado") return true;
  return false;
};

export interface ProcessoFinanceiro {
  id: string;
  numero_cnj: string | null;
  numero_processo: string | null;
  prognostico: string | null;
  fase: string | null;
  fase_id: string | null;
  status_processual: string | null;
  valor_causa: number | null;
  valor_execucao: number | null;
  valor_acordo: number | null;
  valor_sentenca: number | null;
  honorarios_percentual: number | null;
  status_pagamento_honorarios: string | null;
  cliente_id: string;
  situacao: string | null;
}