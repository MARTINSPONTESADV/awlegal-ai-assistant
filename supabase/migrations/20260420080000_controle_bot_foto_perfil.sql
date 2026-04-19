-- Adiciona colunas de foto de perfil WhatsApp em controle_bot
-- Populado pelos workflows n8n (RESOLVAJA bot + MP Captura) ao receber msg nova
-- URLs da CDN WhatsApp (pps.whatsapp.net) expiram em ~1 semana — workflow revalida.

ALTER TABLE public.controle_bot
  ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_perfil_atualizada_em TIMESTAMPTZ;

COMMENT ON COLUMN public.controle_bot.foto_perfil_url IS 'URL da foto de perfil WhatsApp via Evolution /chat/fetchProfilePictureUrl. Expira em ~1 semana; workflow revalida ao receber msg.';
COMMENT ON COLUMN public.controle_bot.foto_perfil_atualizada_em IS 'Quando a foto_perfil_url foi atualizada pela última vez.';
