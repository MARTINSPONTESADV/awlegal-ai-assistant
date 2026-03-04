
-- Enable RLS on publicacoes
ALTER TABLE public.publicacoes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can view publicacoes"
ON public.publicacoes FOR SELECT
TO authenticated
USING (true);

-- Allow anon inserts for import edge function
CREATE POLICY "Allow inserts for import"
ON public.publicacoes FOR INSERT
WITH CHECK (true);

-- Allow authenticated users to update (mark as read)
CREATE POLICY "Authenticated users can update publicacoes"
ON public.publicacoes FOR UPDATE
TO authenticated
USING (true);
