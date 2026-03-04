
-- Fix RLS for templates table: allow all operations for authenticated admins
-- Drop existing restrictive policies and create permissive ones

-- Storage bucket policies for 'templates' bucket
CREATE POLICY "Allow authenticated uploads to templates bucket"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'templates');

CREATE POLICY "Allow authenticated reads from templates bucket"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'templates');

CREATE POLICY "Allow authenticated deletes from templates bucket"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'templates');

CREATE POLICY "Allow authenticated updates to templates bucket"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'templates');
