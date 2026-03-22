-- Tabela de auditoria de mudanças de estágio no funil comercial
-- Permite calcular quanto tempo cada lead passa em cada fase
CREATE TABLE IF NOT EXISTS public.historico_funil (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_id     TEXT NOT NULL,
  canal           TEXT,
  status_anterior TEXT,
  status_novo     TEXT NOT NULL,
  changed_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.historico_funil ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth can read historico_funil"
  ON public.historico_funil FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth can insert historico_funil"
  ON public.historico_funil FOR INSERT TO authenticated WITH CHECK (true);

-- Índice para consultas por lead
CREATE INDEX IF NOT EXISTS idx_historico_funil_whatsapp_id
  ON public.historico_funil (whatsapp_id, changed_at DESC);
