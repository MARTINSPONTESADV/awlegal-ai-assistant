-- Categorias de gastos (maintenance)
CREATE TABLE IF NOT EXISTS public.aux_categorias_gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL DEFAULT '#6366f1',
  icone TEXT NOT NULL DEFAULT 'Receipt',
  ativa BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.aux_categorias_gastos (nome, cor, icone, ordem) VALUES
  ('Software & SaaS', '#6366f1', 'Laptop', 1),
  ('Marketing & Anúncios', '#ec4899', 'Megaphone', 2),
  ('Salários & Pessoal', '#10b981', 'Users', 3),
  ('Escritório & Infraestrutura', '#f59e0b', 'Building2', 4),
  ('Contabilidade & Jurídico', '#8b5cf6', 'FileText', 5),
  ('Impostos & Taxas', '#ef4444', 'Receipt', 6),
  ('Manutenção & Suporte', '#06b6d4', 'Wrench', 7),
  ('Deslocamento & Viagem', '#f97316', 'Car', 8),
  ('Alimentação', '#84cc16', 'Utensils', 9),
  ('Telefonia & Internet', '#3b82f6', 'Wifi', 10),
  ('Bancário & Financeiro', '#a855f7', 'Landmark', 11),
  ('Outros', '#64748b', 'MoreHorizontal', 99)
ON CONFLICT (nome) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  categoria_id UUID NOT NULL REFERENCES public.aux_categorias_gastos(id) ON DELETE RESTRICT,
  valor NUMERIC(14,2) NOT NULL CHECK (valor >= 0),
  data_gasto DATE NOT NULL,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Boleto', 'Transferência', 'Débito Automático', 'Outro')),
  recorrente BOOLEAN NOT NULL DEFAULT false,
  frequencia TEXT CHECK (frequencia IN ('mensal', 'anual', 'trimestral', 'semanal')),
  fornecedor TEXT,
  status TEXT NOT NULL DEFAULT 'pago' CHECK (status IN ('pago', 'pendente', 'vencido', 'cancelado')),
  data_vencimento DATE,
  observacoes TEXT,
  comprovante_url TEXT,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  processo_id UUID REFERENCES public.processos(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gastos_data ON public.gastos(data_gasto DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON public.gastos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_gastos_status ON public.gastos(status);
CREATE INDEX IF NOT EXISTS idx_gastos_recorrente ON public.gastos(recorrente) WHERE recorrente = true;

CREATE TRIGGER update_gastos_updated_at
  BEFORE UPDATE ON public.gastos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.aux_categorias_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categorias gastos: authenticated read"
  ON public.aux_categorias_gastos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Categorias gastos: admin manage"
  ON public.aux_categorias_gastos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Gastos: authenticated read"
  ON public.gastos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gastos: authenticated insert"
  ON public.gastos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Gastos: owner or admin update"
  ON public.gastos
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Gastos: owner or admin delete"
  ON public.gastos
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
