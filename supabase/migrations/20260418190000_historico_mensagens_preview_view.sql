-- Cria view de PREVIEW pra historico_mensagens.
-- Motivo: campo `conteudo` armazena data URI base64 pra audio/image/document
-- (media de 28KB até 20MB por row). As queries da aba /atendimento pra listar
-- os últimos contatos estavam puxando dezenas de MB, levando 6-10s de rede.
--
-- A view retorna NULL no `conteudo` quando é mídia (frontend já mostra "🎵 Áudio"
-- etc a partir de `tipo_midia`) e trunca textos em 200 chars (preview suficiente
-- pra lista). Queries do chat aberto continuam usando a tabela completa.
--
-- security_invoker=true garante que a RLS da tabela subjacente seja respeitada
-- (impede bypass de policy via view).

CREATE OR REPLACE VIEW public.historico_mensagens_preview
WITH (security_invoker = true) AS
SELECT
  id,
  whatsapp_id,
  CASE
    WHEN tipo_midia IN ('audio', 'image', 'document', 'video', 'sticker') THEN NULL
    ELSE LEFT(conteudo, 200)
  END AS conteudo,
  tipo_midia,
  direcao,
  created_at,
  origem,
  id_whatsapp,
  canal,
  nome,
  media_url
FROM public.historico_mensagens;

-- Concede SELECT pros roles do Supabase (anon, authenticated).
GRANT SELECT ON public.historico_mensagens_preview TO anon, authenticated;
