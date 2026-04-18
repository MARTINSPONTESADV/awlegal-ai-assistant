-- Atendimento performance: índices para acelerar carregamento da aba /atendimento.
-- As 3 queries críticas do load inicial (canal=martins_pontes, canal=resolva_ja, .in whatsapp_id)
-- faziam seq scan em historico_mensagens. Estes índices transformam em index scan.

-- Acelera queries filtrando por canal + ordenação decrescente por data.
CREATE INDEX IF NOT EXISTS idx_historico_mensagens_canal_created
  ON public.historico_mensagens (canal, created_at DESC);

-- Acelera busca de preview batch (.in whatsapp_id) + chat individual (.or like) + ordenação.
CREATE INDEX IF NOT EXISTS idx_historico_mensagens_whatsapp_created
  ON public.historico_mensagens (whatsapp_id, created_at DESC);

-- Acelera filtro .eq excluido=true em controle_bot (partial index, só linhas excluídas).
CREATE INDEX IF NOT EXISTS idx_controle_bot_excluido
  ON public.controle_bot (excluido)
  WHERE excluido = true;
