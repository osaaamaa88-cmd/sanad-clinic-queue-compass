CREATE TABLE public.governmental_hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  hospital_type text NOT NULL DEFAULT 'moh',
  governorate text NOT NULL,
  district text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  emergency_phone text NOT NULL DEFAULT '',
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  emergency_24h boolean NOT NULL DEFAULT true,
  has_icu boolean NOT NULL DEFAULT false,
  has_nicu boolean NOT NULL DEFAULT false,
  departments text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.governmental_hospitals TO anon, authenticated;
GRANT ALL ON public.governmental_hospitals TO service_role;
ALTER TABLE public.governmental_hospitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read hospitals" ON public.governmental_hospitals FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX governmental_hospitals_gov_idx ON public.governmental_hospitals (governorate);