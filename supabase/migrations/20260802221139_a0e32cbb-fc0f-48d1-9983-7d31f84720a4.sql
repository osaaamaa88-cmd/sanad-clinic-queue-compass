-- shared updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- 1) link clinics to auth.users
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS clinics_owner_id_idx ON public.clinics(owner_id);

-- 2) clinic staff (secretaries / doctors)
CREATE TABLE IF NOT EXISTS public.clinic_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'secretary' CHECK (role IN ('doctor','secretary')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, user_id)
);

GRANT SELECT ON public.clinic_staff TO authenticated;
GRANT ALL ON public.clinic_staff TO service_role;

ALTER TABLE public.clinic_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff can read own membership" ON public.clinic_staff;
CREATE POLICY "staff can read own membership"
ON public.clinic_staff FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_clinic_staff_updated_at ON public.clinic_staff;
CREATE TRIGGER update_clinic_staff_updated_at
BEFORE UPDATE ON public.clinic_staff
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) helper: is this user the clinic owner or clinic staff?
CREATE OR REPLACE FUNCTION public.can_manage_clinic(_clinic_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinics c WHERE c.id = _clinic_id AND c.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.clinic_staff s WHERE s.clinic_id = _clinic_id AND s.user_id = _user_id
  );
$$;

-- 4) owner/staff can read their own clinic row even while unverified
GRANT SELECT ON public.clinics TO authenticated;

DROP POLICY IF EXISTS "owner or staff can read own clinic" ON public.clinics;
CREATE POLICY "owner or staff can read own clinic"
ON public.clinics FOR SELECT TO authenticated
USING (public.can_manage_clinic(id, auth.uid()));