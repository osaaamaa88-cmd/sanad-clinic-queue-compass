CREATE TABLE public.clinic_post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.clinic_posts(id) ON DELETE CASCADE,
  liker_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (post_id, liker_key)
);

GRANT ALL ON public.clinic_post_likes TO service_role;
ALTER TABLE public.clinic_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_post_likes_deny_all_direct_access"
  ON public.clinic_post_likes FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE TABLE public.clinic_post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.clinic_posts(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  author_key text NOT NULL,
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL,
  is_clinic_reply boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.clinic_post_comments TO service_role;
ALTER TABLE public.clinic_post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_post_comments_deny_all_direct_access"
  ON public.clinic_post_comments FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE INDEX clinic_post_likes_post_idx ON public.clinic_post_likes(post_id);
CREATE INDEX clinic_post_comments_post_idx ON public.clinic_post_comments(post_id, created_at);

CREATE TRIGGER update_clinic_post_comments_updated_at
  BEFORE UPDATE ON public.clinic_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();