-- View historico_mensagens_preview: inclui tipos em PT (imagem, documento) + ptt
-- Antes: só reconhecia EN (audio/image/document), então docs salvos como 'documento' (workflow n8n)
-- vazavam o base64 completo no preview, inflando payload do sidebar /atendimento.

CREATE OR REPLACE VIEW historico_mensagens_preview AS
SELECT id,
       whatsapp_id,
       CASE
         WHEN tipo_midia = ANY (ARRAY[
           'audio'::text, 'ptt'::text,
           'image'::text, 'imagem'::text,
           'document'::text, 'documento'::text,
           'video'::text, 'sticker'::text
         ])
           THEN NULL::text
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
FROM historico_mensagens;
