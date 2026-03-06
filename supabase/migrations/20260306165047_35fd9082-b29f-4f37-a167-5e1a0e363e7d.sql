
INSERT INTO storage.buckets (id, name, public) VALUES ('anexos_agenda', 'anexos_agenda', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload to anexos_agenda" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'anexos_agenda');
CREATE POLICY "Anyone can view anexos_agenda" ON storage.objects FOR SELECT USING (bucket_id = 'anexos_agenda');
CREATE POLICY "Authenticated users can delete from anexos_agenda" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'anexos_agenda');
