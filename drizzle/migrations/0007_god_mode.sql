CREATE TABLE public.app_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  maintenance boolean NOT NULL DEFAULT false,
  broadcast text NOT NULL DEFAULT '',
  broadcast_tone text NOT NULL DEFAULT 'info',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_bookings_created ON public.bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.clinic_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_created ON public.clinic_stories (created_at DESC);