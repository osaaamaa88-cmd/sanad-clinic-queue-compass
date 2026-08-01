ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS clinic_status text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS delay_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bookings_closed boolean NOT NULL DEFAULT false;

ALTER TABLE public.clinics
  ADD CONSTRAINT clinics_clinic_status_check CHECK (clinic_status IN ('normal','delayed','paused'));

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS visit_type text NOT NULL DEFAULT 'new';

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_visit_type_check CHECK (visit_type IN ('new','followup'));

ALTER TABLE public.clinics REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clinics;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;