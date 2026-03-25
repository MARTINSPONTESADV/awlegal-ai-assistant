-- Migration: Remove sufixos JID de controle_bot.whatsapp_numero
-- Contexto: O commit f271fc9 limpou historico_mensagens.whatsapp_id mas não limpou controle_bot.whatsapp_numero
-- Essa inconsistência causou duplicação de contatos e nomes desaparecidos
-- Esta migration alinha controle_bot com historico_mensagens (ambos sem JID)

UPDATE public.controle_bot
SET whatsapp_numero = regexp_replace(whatsapp_numero, '@[^@]+$', '')
WHERE whatsapp_numero LIKE '%@%';
