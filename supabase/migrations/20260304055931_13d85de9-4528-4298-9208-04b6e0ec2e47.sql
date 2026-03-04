
-- RLS for controle_atendimento
ALTER TABLE public.controle_atendimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view controle_atendimento"
ON public.controle_atendimento FOR SELECT
TO authenticated
USING (get_approval_status(auth.uid()) = 'approved'::approval_status);

CREATE POLICY "Approved users can insert controle_atendimento"
ON public.controle_atendimento FOR INSERT
TO authenticated
WITH CHECK (get_approval_status(auth.uid()) = 'approved'::approval_status);

CREATE POLICY "Approved users can update controle_atendimento"
ON public.controle_atendimento FOR UPDATE
TO authenticated
USING (get_approval_status(auth.uid()) = 'approved'::approval_status);

CREATE POLICY "Admins can delete controle_atendimento"
ON public.controle_atendimento FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for controle_bot
ALTER TABLE public.controle_bot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view controle_bot"
ON public.controle_bot FOR SELECT
TO authenticated
USING (get_approval_status(auth.uid()) = 'approved'::approval_status);

CREATE POLICY "Approved users can update controle_bot"
ON public.controle_bot FOR UPDATE
TO authenticated
USING (get_approval_status(auth.uid()) = 'approved'::approval_status);

CREATE POLICY "Approved users can insert controle_bot"
ON public.controle_bot FOR INSERT
TO authenticated
WITH CHECK (get_approval_status(auth.uid()) = 'approved'::approval_status);

-- RLS for historico_mensagens
ALTER TABLE public.historico_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view historico_mensagens"
ON public.historico_mensagens FOR SELECT
TO authenticated
USING (get_approval_status(auth.uid()) = 'approved'::approval_status);

CREATE POLICY "Approved users can insert historico_mensagens"
ON public.historico_mensagens FOR INSERT
TO authenticated
WITH CHECK (get_approval_status(auth.uid()) = 'approved'::approval_status);

CREATE POLICY "Allow anon inserts historico_mensagens"
ON public.historico_mensagens FOR INSERT
TO anon
WITH CHECK (true);

-- Audio storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-audio', 'chat-audio', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-audio');

CREATE POLICY "Anyone can view chat audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-audio');
