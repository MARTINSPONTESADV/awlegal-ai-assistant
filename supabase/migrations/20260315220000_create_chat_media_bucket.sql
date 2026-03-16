
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload to chat-media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Authenticated can read chat-media" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'chat-media');

CREATE POLICY "Anon can read chat-media" ON storage.objects
FOR SELECT TO anon
USING (bucket_id = 'chat-media');
