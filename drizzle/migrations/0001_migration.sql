CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT '',
  is_anonymous boolean NOT NULL DEFAULT false,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','card','image')),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 2000),
  bg_style text NOT NULL DEFAULT '',
  font_style text NOT NULL DEFAULT '',
  image_path text NOT NULL DEFAULT '',
  specialty_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(body) > 0 OR image_path <> '')
);
CREATE INDEX community_posts_created_idx ON public.community_posts (created_at DESC);

CREATE TABLE public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT '',
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX community_comments_post_idx ON public.community_comments (post_id, created_at);

CREATE TABLE public.community_likes (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE OR REPLACE FUNCTION public.community_check_clinic()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.clinic_id IS NOT NULL AND NOT (
    public.is_clinic_member(NEW.clinic_id, NEW.author_id)
    AND EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = NEW.clinic_id AND c.is_verified AND NOT c.is_disabled)
  ) THEN
    NEW.clinic_id := NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER community_posts_clinic BEFORE INSERT OR UPDATE ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.community_check_clinic();
CREATE TRIGGER community_comments_clinic BEFORE INSERT OR UPDATE ON public.community_comments FOR EACH ROW EXECUTE FUNCTION public.community_check_clinic();

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.community_comments, public.community_likes TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_posts TO authenticated;
GRANT INSERT, DELETE ON public.community_comments, public.community_likes TO authenticated;

CREATE POLICY "community posts own read" ON public.community_posts FOR SELECT TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "community posts own insert" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "community posts own delete" ON public.community_posts FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY "community comments readable" ON public.community_comments FOR SELECT USING (true);
CREATE POLICY "community comments own insert" ON public.community_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "community comments own delete" ON public.community_comments FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY "community likes readable" ON public.community_likes FOR SELECT USING (true);
CREATE POLICY "community likes own insert" ON public.community_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community likes own delete" ON public.community_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Public feed hides who wrote anonymous posts
CREATE VIEW public.community_feed WITH (security_barrier = true) AS
SELECT p.id,
  (p.author_id = auth.uid()) AS is_mine,
  CASE WHEN p.is_anonymous THEN 'عضو مجهول' ELSE p.author_name END AS author_name,
  p.is_anonymous, p.clinic_id, p.kind, p.body, p.bg_style, p.font_style, p.image_path, p.specialty_id, p.created_at
FROM public.community_posts p;
GRANT SELECT ON public.community_feed TO anon, authenticated;

CREATE POLICY "community images read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'community');
CREATE POLICY "community images own upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'community' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "community images own delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'community' AND (storage.foldername(name))[1] = auth.uid()::text);