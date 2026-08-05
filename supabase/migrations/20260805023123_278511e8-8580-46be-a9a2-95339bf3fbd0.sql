-- Explicit deny-all so the table is clearly server-only (matches bookings/patients).
CREATE POLICY "clinic_followers_deny_all_direct_access"
ON public.clinic_followers FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

-- Move the storage helper out of the exposed API schema.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

CREATE OR REPLACE FUNCTION private.can_manage_clinic_media(_path text, _user_id uuid)
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
USING (bucket_id = 'clinic-media' AND private.can_manage_clinic_media(name, auth.uid()));

DROP POLICY IF EXISTS "clinic media managers insert" ON storage.objects;
CREATE POLICY "clinic media managers insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'clinic-media' AND private.can_manage_clinic_media(name, auth.uid()));

DROP POLICY IF EXISTS "clinic media managers update" ON storage.objects;
CREATE POLICY "clinic media managers update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'clinic-media' AND private.can_manage_clinic_media(name, auth.uid()))
WITH CHECK (bucket_id = 'clinic-media' AND private.can_manage_clinic_media(name, auth.uid()));

DROP POLICY IF EXISTS "clinic media managers delete" ON storage.objects;
CREATE POLICY "clinic media managers delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'clinic-media' AND private.can_manage_clinic_media(name, auth.uid()));

DROP FUNCTION IF EXISTS public.can_manage_clinic_media(text, uuid);
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_clinic_media(text, uuid) TO authenticated;