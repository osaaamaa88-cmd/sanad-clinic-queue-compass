
-- BOOKINGS: lock down entirely; all access via server functions (service_role)
DROP POLICY IF EXISTS "public insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "public read bookings" ON public.bookings;
DROP POLICY IF EXISTS "public update bookings" ON public.bookings;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.bookings FROM anon, authenticated;
GRANT ALL ON public.bookings TO service_role;

-- PATIENTS: lock down entirely; server-only
DROP POLICY IF EXISTS "public insert patients" ON public.patients;
DROP POLICY IF EXISTS "public read patients" ON public.patients;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.patients FROM anon, authenticated;
GRANT ALL ON public.patients TO service_role;

-- CLINICS: remove permissive update; updates go through admin/server functions.
-- Keep public SELECT of verified clinics and anonymous registration (unverified insert).
DROP POLICY IF EXISTS "clinic owners can update by id" ON public.clinics;
REVOKE UPDATE, DELETE ON public.clinics FROM anon, authenticated;
GRANT ALL ON public.clinics TO service_role;
