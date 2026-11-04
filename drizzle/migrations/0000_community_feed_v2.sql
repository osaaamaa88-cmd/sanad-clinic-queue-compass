ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.community_comments ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_community_posts_feed_cursor ON public.community_posts (is_hidden, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_feed ON public.community_comments (post_id, is_hidden, created_at);

CREATE TABLE IF NOT EXISTS public.community_saves (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_saves TO authenticated;
GRANT ALL ON public.community_saves TO service_role;
ALTER TABLE public.community_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY community_saves_owner_select ON public.community_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY community_saves_owner_insert ON public.community_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY community_saves_owner_delete ON public.community_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.community_feed AS
SELECT p.id, (p.author_id = auth.uid()) AS is_mine,
  CASE WHEN p.is_anonymous THEN 'عضو مجهول'::text ELSE p.author_name END AS author_name,
  p.is_anonymous, p.clinic_id, p.kind, p.body, p.bg_style, p.font_style, p.image_path, p.specialty_id, p.created_at
FROM public.community_posts p
WHERE p.is_hidden = false;
GRANT SELECT ON public.community_feed TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.community_auto_hide()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT count(DISTINCT reporter_id) INTO n FROM public.community_reports WHERE post_id = NEW.post_id;
    IF n >= 3 THEN UPDATE public.community_posts SET is_hidden = true WHERE id = NEW.post_id; END IF;
  ELSIF NEW.comment_id IS NOT NULL THEN
    SELECT count(DISTINCT reporter_id) INTO n FROM public.community_reports WHERE comment_id = NEW.comment_id;
    IF n >= 3 THEN UPDATE public.community_comments SET is_hidden = true WHERE id = NEW.comment_id; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.community_auto_hide() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_community_auto_hide ON public.community_reports;
CREATE TRIGGER trg_community_auto_hide AFTER INSERT ON public.community_reports
  FOR EACH ROW EXECUTE FUNCTION public.community_auto_hide();

CREATE OR REPLACE FUNCTION public.community_feed_page(
  p_limit integer DEFAULT 10,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_tab text DEFAULT 'for_you',
  p_specialty text DEFAULT NULL,
  p_follower_key text DEFAULT NULL,
  p_answered text DEFAULT 'all',
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid, author_name text, is_anonymous boolean, is_mine boolean, clinic_id uuid,
  doctor_name text, doctor_avatar text, kind text, body text, bg_style text, font_style text,
  image_path text, specialty_id text, created_at timestamptz,
  likes_count bigint, comments_count bigint, my_liked boolean, my_saved boolean,
  answered_by_doctor boolean, top_doctor_comment jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 30);
  v_q text := NULLIF(btrim(COALESCE(p_search, '')), '');
BEGIN
  RETURN QUERY
  WITH fp AS (
    SELECT p.id, p.author_id,
      CASE WHEN p.is_anonymous THEN 'عضو مجهول'::text ELSE p.author_name END AS author_name,
      p.is_anonymous, p.clinic_id, c.doctor AS doctor_name, c.avatar_url AS doctor_avatar,
      p.kind, p.body, p.bg_style, p.font_style, p.image_path, p.specialty_id, p.created_at
    FROM public.community_posts p
    LEFT JOIN public.clinics c ON c.id = p.clinic_id
    WHERE p.is_hidden = false
      AND (p_specialty IS NULL OR p_specialty = 'all' OR p.specialty_id = p_specialty)
      AND (v_q IS NULL OR p.body ILIKE '%' || v_q || '%' OR (NOT p.is_anonymous AND p.author_name ILIKE '%' || v_q || '%') OR c.doctor ILIKE '%' || v_q || '%')
      AND (
        p_tab = 'for_you'
        OR (p_tab = 'questions' AND p.clinic_id IS NULL)
        OR (p_tab = 'doctors' AND p.clinic_id IS NOT NULL AND c.is_verified)
        OR (p_tab = 'following' AND p_follower_key IS NOT NULL AND p.clinic_id IN (
              SELECT cf.clinic_id FROM public.clinic_followers cf WHERE cf.follower_key = p_follower_key))
      )
      AND (
        COALESCE(p_answered, 'all') = 'all'
        OR (p_answered = 'answered' AND EXISTS (SELECT 1 FROM public.community_comments cc JOIN public.clinics cl ON cl.id = cc.clinic_id WHERE cc.post_id = p.id AND NOT cc.is_hidden AND cl.is_verified))
        OR (p_answered = 'unanswered' AND NOT EXISTS (SELECT 1 FROM public.community_comments cc JOIN public.clinics cl ON cl.id = cc.clinic_id WHERE cc.post_id = p.id AND NOT cc.is_hidden AND cl.is_verified))
      )
      AND (p_cursor_created_at IS NULL OR p.created_at < p_cursor_created_at
           OR (p.created_at = p_cursor_created_at AND p.id < p_cursor_id))
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT v_limit
  ),
  tc AS (
    SELECT DISTINCT ON (cc.post_id) cc.post_id,
      jsonb_build_object('id', cc.id, 'author_name', cl.doctor, 'clinic_id', cl.id,
        'avatar_url', cl.avatar_url, 'body', left(cc.body, 140), 'created_at', cc.created_at) AS payload
    FROM public.community_comments cc
    JOIN public.clinics cl ON cl.id = cc.clinic_id
    WHERE cc.post_id IN (SELECT fp.id FROM fp) AND NOT cc.is_hidden AND cl.is_verified
    ORDER BY cc.post_id, cc.created_at ASC
  )
  SELECT fp.id, fp.author_name, fp.is_anonymous,
    (v_uid IS NOT NULL AND fp.author_id = v_uid),
    fp.clinic_id, fp.doctor_name, fp.doctor_avatar, fp.kind, fp.body, fp.bg_style, fp.font_style,
    fp.image_path, fp.specialty_id, fp.created_at,
    (SELECT count(*) FROM public.community_likes l WHERE l.post_id = fp.id),
    (SELECT count(*) FROM public.community_comments m WHERE m.post_id = fp.id AND NOT m.is_hidden),
    (v_uid IS NOT NULL AND EXISTS (SELECT 1 FROM public.community_likes l WHERE l.post_id = fp.id AND l.user_id = v_uid)),
    (v_uid IS NOT NULL AND EXISTS (SELECT 1 FROM public.community_saves s WHERE s.post_id = fp.id AND s.user_id = v_uid)),
    (tc.payload IS NOT NULL), tc.payload
  FROM fp LEFT JOIN tc ON tc.post_id = fp.id
  ORDER BY fp.created_at DESC, fp.id DESC;
END $$;
REVOKE EXECUTE ON FUNCTION public.community_feed_page(integer, timestamptz, uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_feed_page(integer, timestamptz, uuid, text, text, text, text, text) TO anon, authenticated;

DROP POLICY IF EXISTS "community comments readable" ON public.community_comments;
CREATE POLICY "community comments readable" ON public.community_comments FOR SELECT TO anon, authenticated
  USING (NOT is_hidden AND EXISTS (SELECT 1 FROM public.community_feed f WHERE f.id = community_comments.post_id));