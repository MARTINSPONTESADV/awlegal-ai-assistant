-- Permite excluir logicamente contatos do sistema sem deletar dados históricos
ALTER TABLE public.controle_bot
  ADD COLUMN IF NOT EXISTS excluido boolean DEFAULT false;
