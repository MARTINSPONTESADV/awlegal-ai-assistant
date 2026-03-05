
INSERT INTO storage.buckets (id, name, public)
VALUES ('mensagens_audio', 'mensagens_audio', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload audio" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'mensagens_audio');

CREATE POLICY "Anyone can read audio" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'mensagens_audio');

CREATE POLICY "Anon can read audio" ON storage.objects
FOR SELECT TO anon
USING (bucket_id = 'mensagens_audio');
