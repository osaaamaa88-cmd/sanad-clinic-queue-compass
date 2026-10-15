CREATE TABLE public.rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_limit int, p_window_seconds int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c int;
BEGIN
  INSERT INTO public.rate_limits AS r (key, count, window_start) VALUES (p_key, 1, now())
  ON CONFLICT (key) DO UPDATE SET
    count = CASE WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN 1 ELSE r.count + 1 END,
    window_start = CASE WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN now() ELSE r.window_start END
  RETURNING count INTO c;
  IF random() < 0.01 THEN DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day'; END IF;
  RETURN c <= p_limit;
END $$;
REVOKE ALL ON FUNCTION public.check_rate_limit(text,int,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text,int,int) TO service_role;

CREATE OR REPLACE FUNCTION public.create_booking(
  p_clinic_id uuid, p_code text, p_patient_name text, p_patient_phone text,
  p_day_label text, p_slot text, p_visit_type text)
RETURNS TABLE(id uuid, code text, queue_number int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q int; b public.bookings;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('booking:' || p_clinic_id::text));
  SELECT COALESCE(max(x.queue_number), 0) + 1 INTO q FROM public.bookings x WHERE x.clinic_id = p_clinic_id;
  INSERT INTO public.bookings (code, clinic_id, patient_name, patient_phone, day_label, slot, queue_number, visit_type, status)
  VALUES (p_code, p_clinic_id, p_patient_name, p_patient_phone, p_day_label, p_slot, q, p_visit_type, 'waiting')
  RETURNING * INTO b;
  RETURN QUERY SELECT b.id, b.code, b.queue_number;
END $$;
REVOKE ALL ON FUNCTION public.create_booking(uuid,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid,text,text,text,text,text,text) TO service_role;