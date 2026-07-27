ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS is_disabled boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "public read verified clinics" ON public.clinics;
CREATE POLICY "public read active verified clinics"
ON public.clinics
FOR SELECT
TO anon, authenticated
USING (is_verified = true AND is_disabled = false);