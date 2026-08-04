ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS avatar_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.clinic_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  caption text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clinic_posts TO anon;
GRANT SELECT ON public.clinic_posts TO authenticated;
GRANT ALL ON public.clinic_posts TO service_role;
ALTER TABLE public.clinic_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_posts_public_read" ON public.clinic_posts FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS clinic_posts_clinic_idx ON public.clinic_posts (clinic_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.clinic_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  follower_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, follower_key)
);
GRANT SELECT ON public.clinic_followers TO anon;
GRANT SELECT ON public.clinic_followers TO authenticated;
GRANT ALL ON public.clinic_followers TO service_role;
ALTER TABLE public.clinic_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_followers_public_count" ON public.clinic_followers FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.clinic_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clinic_reviews TO anon;
GRANT SELECT ON public.clinic_reviews TO authenticated;
GRANT ALL ON public.clinic_reviews TO service_role;
ALTER TABLE public.clinic_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_reviews_public_read" ON public.clinic_reviews FOR SELECT TO anon, authenticated USING (true);