-- Migration: Remove sufixos JID de controle_bot.whatsapp_numero com merge de duplicatas
-- Executado manualmente via Supabase MCP em 2026-03-25
-- Contexto: controle_bot tinha rows com JID (@s.whatsapp.net, @lid, @c.us) e
-- duplicatas por 9-prefix brasileiro (559299722659 vs 5592999722659).
-- Merge usa últimos 8 dígitos (phoneKey) para identificar o mesmo telefone.

-- Step 1: Deletar variantes @lid duplicadas (manter row com menor length)
DELETE FROM controle_bot
WHERE whatsapp_numero IN (
  SELECT whatsapp_numero FROM (
    SELECT whatsapp_numero,
      ROW_NUMBER() OVER (
        PARTITION BY regexp_replace(whatsapp_numero, '@[^@]+$', '')
        ORDER BY length(whatsapp_numero)
      ) AS rn
    FROM controle_bot
    WHERE whatsapp_numero LIKE '%@%'
  ) sub WHERE rn > 1
);

-- Step 2: Merge dados de JID rows para clean rows (match por últimos 8 dígitos)
UPDATE controle_bot AS clean
SET
  nome_contato = COALESCE(clean.nome_contato, jid.nome_contato),
  canal = COALESCE(clean.canal, jid.canal),
  bot_ativo = COALESCE(clean.bot_ativo, jid.bot_ativo)
FROM (
  SELECT whatsapp_numero, nome_contato, canal, bot_ativo,
    right(regexp_replace(whatsapp_numero, '@[^@]+$', ''), 8) AS phone8
  FROM controle_bot WHERE whatsapp_numero LIKE '%@%'
) AS jid
WHERE clean.whatsapp_numero NOT LIKE '%@%'
  AND length(clean.whatsapp_numero) > 0
  AND right(clean.whatsapp_numero, 8) = jid.phone8;

-- Step 3: Deletar JID rows que foram mergeadas em clean rows
DELETE FROM controle_bot
WHERE whatsapp_numero LIKE '%@%'
  AND right(regexp_replace(whatsapp_numero, '@[^@]+$', ''), 8) IN (
    SELECT right(whatsapp_numero, 8)
    FROM controle_bot
    WHERE whatsapp_numero NOT LIKE '%@%' AND length(whatsapp_numero) > 0
  );

-- Step 4: Renomear JID rows restantes (sem conflito de PK)
UPDATE controle_bot
SET whatsapp_numero = regexp_replace(whatsapp_numero, '@[^@]+$', '')
WHERE whatsapp_numero LIKE '%@%';

-- Step 5: Deletar row com PK vazia (lixo)
DELETE FROM controle_bot WHERE whatsapp_numero = '';
