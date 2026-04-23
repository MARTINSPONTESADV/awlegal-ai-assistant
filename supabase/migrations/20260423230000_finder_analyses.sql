-- finder_analyses: vincula análises do AW Finder a clientes do ERP
-- Usado pelo fluxo pré-protocolo: Matheus analisa extrato no Finder (AW-ECO)
-- e vincula ao cliente, depois Writer pré-preenche peça com esses dados.

CREATE TABLE IF NOT EXISTS public.finder_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,

  -- Metadados do extrato
  banco TEXT NOT NULL,
  agencia TEXT,
  conta TEXT,
  periodo_label TEXT,

  -- Valores computados pelo Finder
  data_inicio_descontos DATE,
  data_fim_descontos DATE,
  valor_total_descontos NUMERIC(12,2),
  valor_dobro NUMERIC(12,2),

  -- Rubricas detectadas (array de strings)
  rubricas JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Caminho no Storage do XLSX exportado pelo Finder
  xlsx_storage_path TEXT,
  xlsx_filename TEXT,

  -- Auditoria — snapshot dos grupos classificados pelo Finder
  raw_grouped JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_finder_analyses_cliente
  ON public.finder_analyses(cliente_id);
CREATE INDEX IF NOT EXISTS idx_finder_analyses_created
  ON public.finder_analyses(created_at DESC);

CREATE TRIGGER update_finder_analyses_updated_at
  BEFORE UPDATE ON public.finder_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.finder_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can SELECT finder_analyses"
  ON public.finder_analyses FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "authenticated can INSERT finder_analyses"
  ON public.finder_analyses FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated can UPDATE finder_analyses"
  ON public.finder_analyses FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "authenticated can DELETE finder_analyses"
  ON public.finder_analyses FOR DELETE
  TO authenticated USING (true);

-- Storage bucket pra XLSX exportados pelo Finder
INSERT INTO storage.buckets (id, name, public)
VALUES ('finder-analyses', 'finder-analyses', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated can SELECT finder-analyses bucket"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'finder-analyses');

CREATE POLICY "authenticated can INSERT finder-analyses bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'finder-analyses');

CREATE POLICY "authenticated can UPDATE finder-analyses bucket"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'finder-analyses');

CREATE POLICY "authenticated can DELETE finder-analyses bucket"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'finder-analyses');
