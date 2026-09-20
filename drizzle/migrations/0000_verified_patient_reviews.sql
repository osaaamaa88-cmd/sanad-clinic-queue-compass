ALTER TABLE public.clinic_reviews
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS patient_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS visited boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS clinic_reviews_booking_id_key
  ON public.clinic_reviews (booking_id) WHERE booking_id IS NOT NULL;

GRANT SELECT ON public.clinic_reviews TO anon, authenticated;
GRANT ALL ON public.clinic_reviews TO service_role;