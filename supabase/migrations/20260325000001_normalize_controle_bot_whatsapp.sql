-- Migration: Remove sufixos JID de controle_bot.whatsapp_numero com merge de duplicatas
-- Contexto: controle_bot tem duas rows para o mesmo número físico (JID vs limpo)
-- com canal e nome_contato potencialmente diferentes. Precisamos:
-- 1. Mesclar dados da row JID para a row limpa
-- 2. Deletar a row JID
-- 3. Para JID sem contraparte limpa, apenas remover o sufixo

-- Step 1: Mesclar dados (nome_contato, canal, bot_ativo) de rows JID para rows limpas
UPDATE public.controle_bot AS clean
SET
  nome_contato = COALESCE(clean.nome_contato, jid_data.nome_contato),
  canal = COALESCE(clean.canal, jid_data.canal),
  bot_ativo = COALESCE(clean.bot_ativo, jid_data.bot_ativo)
FROM (
  SELECT
    regexp_replace(whatsapp_numero, '@[^@]+$', '') AS clean_number,
    nome_contato,
    canal,
    bot_ativo
  FROM public.controle_bot
  WHERE whatsapp_numero LIKE '%@%'
) AS jid_data
WHERE clean.whatsapp_numero = jid_data.clean_number
  AND clean.whatsapp_numero NOT LIKE '%@%';

-- Step 2: Deletar rows JID que têm uma row limpa correspondente
DELETE FROM public.controle_bot
WHERE whatsapp_numero LIKE '%@%'
  AND regexp_replace(whatsapp_numero, '@[^@]+$', '') IN (
    SELECT whatsapp_numero FROM public.controle_bot WHERE whatsapp_numero NOT LIKE '%@%'
  );

-- Step 3: Renomear rows JID sem contraparte limpa (seguro agora sem conflito de PK)
UPDATE public.controle_bot
SET whatsapp_numero = regexp_replace(whatsapp_numero, '@[^@]+$', '')
WHERE whatsapp_numero LIKE '%@%';
