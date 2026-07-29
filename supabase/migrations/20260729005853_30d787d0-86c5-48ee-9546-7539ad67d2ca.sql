-- Explicitly deny all direct Data API access to sensitive patient tables.
-- All access happens through trusted server functions using the service role.

REVOKE ALL ON public.bookings FROM anon, authenticated;
REVOKE ALL ON public.patients FROM anon, authenticated;
GRANT ALL ON public.bookings TO service_role;
GRANT ALL ON public.patients TO service_role;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_deny_all_direct_access" ON public.bookings;
CREATE POLICY "bookings_deny_all_direct_access"
  ON public.bookings
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "patients_deny_all_direct_access" ON public.patients;
CREATE POLICY "patients_deny_all_direct_access"
  ON public.patients
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);