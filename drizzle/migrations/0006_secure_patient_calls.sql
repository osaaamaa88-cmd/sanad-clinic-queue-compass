ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS patient_user_id uuid;

CREATE INDEX IF NOT EXISTS bookings_patient_user_id_idx
  ON public.bookings (patient_user_id)
  WHERE patient_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_patient_booking(
  p_clinic_id uuid,
  p_code text,
  p_patient_name text,
  p_patient_phone text,
  p_day_label text,
  p_slot text,
  p_visit_type text,
  p_patient_user_id uuid
)
RETURNS TABLE(id uuid, code text, queue_number int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH created AS MATERIALIZED (
    SELECT *
    FROM public.create_booking(
      p_clinic_id,
      p_code,
      p_patient_name,
      p_patient_phone,
      p_day_label,
      p_slot,
      p_visit_type
    )
  )
  UPDATE public.bookings AS booking
  SET patient_user_id = p_patient_user_id
  FROM created
  WHERE booking.id = created.id
  RETURNING booking.id, booking.code, booking.queue_number;
END;
$$;

REVOKE ALL ON FUNCTION public.create_patient_booking(uuid,text,text,text,text,text,text,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_patient_booking(uuid,text,text,text,text,text,text,uuid)
  TO service_role;

CREATE TABLE IF NOT EXISTS public.patient_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  booking_code text NOT NULL,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_user_id uuid NOT NULL,
  room text DEFAULT 'غرفة الكشف الرئيسية',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_calls_patient_created_idx
  ON public.patient_calls (patient_user_id, created_at DESC);

ALTER TABLE public.patient_calls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.patient_calls FROM anon, authenticated;
GRANT SELECT ON TABLE public.patient_calls TO authenticated;
GRANT ALL ON TABLE public.patient_calls TO service_role;

DROP POLICY IF EXISTS "Patients can read their own calls" ON public.patient_calls;
CREATE POLICY "Patients can read their own calls"
  ON public.patient_calls
  FOR SELECT
  TO authenticated
  USING (patient_user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.create_patient_call_on_booking_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'in'
    AND OLD.status IS DISTINCT FROM NEW.status
    AND NEW.patient_user_id IS NOT NULL
  THEN
    INSERT INTO public.patient_calls (
      booking_id,
      booking_code,
      clinic_id,
      patient_user_id
    )
    VALUES (
      NEW.id,
      NEW.code,
      NEW.clinic_id,
      NEW.patient_user_id
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_patient_call_on_booking_status()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS booking_status_creates_patient_call ON public.bookings;
CREATE TRIGGER booking_status_creates_patient_call
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_patient_call_on_booking_status();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'patient_calls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_calls;
  END IF;
END;
$$;