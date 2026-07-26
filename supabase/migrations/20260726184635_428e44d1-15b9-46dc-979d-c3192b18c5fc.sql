
-- CLINICS
CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor TEXT NOT NULL,
  specialty_id TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  reviews INTEGER NOT NULL DEFAULT 0,
  available_now BOOLEAN NOT NULL DEFAULT false,
  distance_km NUMERIC(6,2) NOT NULL DEFAULT 0,
  now_serving INTEGER NOT NULL DEFAULT 0,
  your_number INTEGER NOT NULL DEFAULT 0,
  waiting_count INTEGER NOT NULL DEFAULT 0,
  lat NUMERIC(9,6) NOT NULL DEFAULT 30.0444,
  lng NUMERIC(9,6) NOT NULL DEFAULT 31.2357,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.clinics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read verified clinics" ON public.clinics FOR SELECT USING (is_verified = true);
CREATE POLICY "anyone can register a clinic" ON public.clinics FOR INSERT WITH CHECK (is_verified = false);
CREATE POLICY "clinic owners can update by id" ON public.clinics FOR UPDATE USING (true) WITH CHECK (is_verified = false);

-- PATIENTS
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.patients TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public insert patients" ON public.patients FOR INSERT WITH CHECK (true);
CREATE POLICY "public read patients" ON public.patients FOR SELECT USING (true);

-- BOOKINGS
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL DEFAULT '',
  day_label TEXT NOT NULL DEFAULT '',
  slot TEXT NOT NULL DEFAULT '',
  queue_number INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "public insert bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "public update bookings" ON public.bookings FOR UPDATE USING (true) WITH CHECK (true);

-- EMERGENCY
CREATE TABLE public.emergency_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  distance_km NUMERIC(6,2) NOT NULL DEFAULT 0,
  open_24h BOOLEAN NOT NULL DEFAULT false,
  open_now BOOLEAN NOT NULL DEFAULT true,
  lat NUMERIC(9,6) NOT NULL DEFAULT 30.0444,
  lng NUMERIC(9,6) NOT NULL DEFAULT 31.2357,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.emergency_facilities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_facilities TO authenticated;
GRANT ALL ON public.emergency_facilities TO service_role;
ALTER TABLE public.emergency_facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read emergency" ON public.emergency_facilities FOR SELECT USING (true);
