-- Adiciona coluna canal: identifica a qual canal/instancia pertence o contato
ALTER TABLE public.controle_bot
  ADD COLUMN IF NOT EXISTS canal TEXT DEFAULT 'resolva_ja';

-- Adiciona coluna arquivado: permite arquivar conversas sem deletar
ALTER TABLE public.controle_bot
  ADD COLUMN IF NOT EXISTS arquivado BOOLEAN DEFAULT FALSE;

-- Adiciona coluna unread_count: contador de mensagens não lidas
ALTER TABLE public.controle_bot
  ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- Adiciona coluna nome: alias para nome_contato (compatibilidade com o frontend)
ALTER TABLE public.controle_bot
  ADD COLUMN IF NOT EXISTS nome TEXT DEFAULT NULL;
