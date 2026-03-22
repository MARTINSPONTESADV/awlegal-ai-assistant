-- Bug 1: Arquivamento independente por canal
-- A tabela controle_bot tem 1 row por telefone (PK = whatsapp_numero).
-- Para o canal Martins Pontes ter arquivo separado do Resolva Já,
-- adicionamos a coluna arquivado_mp.
ALTER TABLE public.controle_bot
  ADD COLUMN IF NOT EXISTS arquivado_mp boolean DEFAULT false;
