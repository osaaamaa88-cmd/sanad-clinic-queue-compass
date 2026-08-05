-- 1) Clinic registration: remove the permissive public INSERT policy.
DROP POLICY IF EXISTS "anyone can register a clinic" ON public.clinics;
REVOKE INSERT ON public.clinics FROM anon, authenticated;

-- 2) clinic_followers: no public row reads (follower_key is a device identifier).
DROP POLICY IF EXISTS "clinic_followers_public_count" ON public.clinic_followers;
REVOKE SELECT ON public.clinic_followers FROM anon, authenticated;
GRANT ALL ON public.clinic_followers TO service_role;

-- 3) Storage policies for the private clinic-media bucket.
CREATE OR REPLACE FUNCTION public.can_manage_clinic_media(_path text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinics c
    WHERE c.id::text = split_part(_path, '/', 1)
      AND (
        c.owner_id = _user_id
        OR EXISTS (
          SELECT 1 FROM public.clinic_staff s
          WHERE s.clinic_id = c.id AND s.user_id = _user_id
        )
      )
  )
$$;

DROP POLICY IF EXISTS "clinic media managers read" ON storage.objects;
CREATE POLICY "clinic media managers read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'clinic-media' AND public.can_manage_clinic_media(name, auth.uid()));

DROP POLICY IF EXISTS "clinic media managers insert" ON storage.objects;
CREATE POLICY "clinic media managers insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'clinic-media' AND public.can_manage_clinic_media(name, auth.uid()));

DROP POLICY IF EXISTS "clinic media managers update" ON storage.objects;
CREATE POLICY "clinic media managers update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'clinic-media' AND public.can_manage_clinic_media(name, auth.uid()))
WITH CHECK (bucket_id = 'clinic-media' AND public.can_manage_clinic_media(name, auth.uid()));

DROP POLICY IF EXISTS "clinic media managers delete" ON storage.objects;
CREATE POLICY "clinic media managers delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'clinic-media' AND public.can_manage_clinic_media(name, auth.uid()));