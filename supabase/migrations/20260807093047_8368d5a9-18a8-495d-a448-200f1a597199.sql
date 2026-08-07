REVOKE ALL ON FUNCTION public.notify_clinic_new_booking() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.notify_patient_clinic_reply() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.notify_followers_new_story() FROM anon, authenticated, public;