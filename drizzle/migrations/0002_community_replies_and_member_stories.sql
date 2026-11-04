ALTER TABLE public.community_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS community_comments_parent_idx ON public.community_comments(parent_id);

CREATE OR REPLACE FUNCTION public.community_check_reply_parent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.community_comments p WHERE p.id = NEW.parent_id AND p.post_id = NEW.post_id
  ) THEN
    RAISE EXCEPTION 'reply parent must belong to the same post';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS community_check_reply_parent_trg ON public.community_comments;
CREATE TRIGGER community_check_reply_parent_trg BEFORE INSERT ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.community_check_reply_parent();

CREATE TABLE public.member_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT '',
  image_path text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  bg_style text NOT NULL DEFAULT 'navy',
  font_style text NOT NULL DEFAULT 'alexandria',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT member_stories_caption_len CHECK (char_length(caption) <= 280)
);
GRANT SELECT, INSERT, DELETE ON public.member_stories TO authenticated;
GRANT ALL ON public.member_stories TO service_role;
ALTER TABLE public.member_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read live stories" ON public.member_stories FOR SELECT TO authenticated
  USING (expires_at > now() OR author_id = auth.uid());
CREATE POLICY "members add own stories" ON public.member_stories FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());
CREATE POLICY "members delete own stories" ON public.member_stories FOR DELETE TO authenticated
  USING (author_id = auth.uid());
CREATE INDEX member_stories_live_idx ON public.member_stories(expires_at DESC);

CREATE OR REPLACE FUNCTION public.member_stories_fix_expiry()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.created_at := now();
  NEW.expires_at := now() + interval '24 hours';
  RETURN NEW;
END $$;
CREATE TRIGGER member_stories_fix_expiry_trg BEFORE INSERT ON public.member_stories
FOR EACH ROW EXECUTE FUNCTION public.member_stories_fix_expiry();

CREATE TABLE public.member_story_views (
  story_id uuid NOT NULL REFERENCES public.member_stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL,
  viewer_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);
GRANT SELECT, INSERT ON public.member_story_views TO authenticated;
GRANT ALL ON public.member_story_views TO service_role;
ALTER TABLE public.member_story_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "viewer records own view" ON public.member_story_views FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid());
CREATE POLICY "owner or viewer reads views" ON public.member_story_views FOR SELECT TO authenticated
  USING (viewer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.member_stories s WHERE s.id = story_id AND s.author_id = auth.uid()));