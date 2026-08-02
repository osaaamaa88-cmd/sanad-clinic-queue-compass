DROP POLICY IF EXISTS "owner or staff can read own clinic" ON public.clinics;

CREATE POLICY "owner or staff can read own clinic"
ON public.clinics FOR SELECT TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.clinic_staff s
    WHERE s.clinic_id = public.clinics.id AND s.user_id = auth.uid()
  )
);

DROP FUNCTION IF EXISTS public.can_manage_clinic(uuid, uuid);