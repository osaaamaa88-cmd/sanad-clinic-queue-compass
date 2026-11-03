-- Auto-hide column: rows hidden by the moderator or automatically by threshold.
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.community_comments ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- Community report moderation: admin SELECT/UPDATE + auto-hide threshold.
-- Threshold lives in one function so app and DB stay in sync (default: 3 distinct reporters).

CREATE OR REPLACE FUNCTION public.community_auto_hide_threshold()
RETURNS integer LANGUAGE sql STABLE
SET search_path = public
AS $$ SELECT 3 $$;

-- Distinct-reporter counts for posts and comments (materialized on write via trigger below).
CREATE TABLE IF NOT EXISTS public.community_moderation_state (
  post_id uuid PRIMARY KEY REFERENCES public.community_posts(id) ON DELETE CASCADE,
  reporter_count integer NOT NULL DEFAULT 0,
  hidden_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_comment_moderation_state (
  comment_id uuid PRIMARY KEY REFERENCES public.community_comments(id) ON DELETE CASCADE,
  reporter_count integer NOT NULL DEFAULT 0,
  hidden_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Admin determination (adjusts automatically to the project's admin list).
CREATE OR REPLACE FUNCTION public.is_sanad_admin(uid uuid)
RETURNS boolean LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_admins WHERE user_id = uid
  )
$$;

ALTER TABLE public.community_moderation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comment_moderation_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_moderation_state FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.community_comment_moderation_state FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.community_moderation_state TO authenticated;
GRANT SELECT ON public.community_comment_moderation_state TO authenticated;
GRANT ALL ON public.community_moderation_state TO service_role;
GRANT ALL ON public.community_comment_moderation_state TO service_role;

CREATE POLICY community_moderation_admin_read
  ON public.community_moderation_state FOR SELECT
  TO authenticated USING (public.is_sanad_admin(auth.uid()));
CREATE POLICY community_comment_moderation_admin_read
  ON public.community_comment_moderation_state FOR SELECT
  TO authenticated USING (public.is_sanad_admin(auth.uid()));

-- Admin report queue: read + moderation actions (update hidden/restored state).
CREATE POLICY community_reports_admin_select
  ON public.community_reports FOR SELECT
  TO authenticated USING (public.is_sanad_admin(auth.uid()));
CREATE POLICY community_reports_admin_update
  ON public.community_reports FOR UPDATE
  TO authenticated USING (public.is_sanad_admin(auth.uid()))
  WITH CHECK (public.is_sanad_admin(auth.uid()));

-- Auto-hide counters maintained on report insert.
CREATE OR REPLACE FUNCTION public.bump_community_moderation_state()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  threshold integer := public.community_auto_hide_threshold();
  distinct_reporters integer;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT count(DISTINCT r.reporter_id) INTO distinct_reporters
      FROM public.community_reports r WHERE r.post_id = NEW.post_id;
    INSERT INTO public.community_moderation_state (post_id, reporter_count, hidden_at)
      VALUES (NEW.post_id, distinct_reporters,
        CASE WHEN distinct_reporters >= threshold THEN now() END)
      ON CONFLICT (post_id) DO UPDATE
        SET reporter_count = excluded.reporter_count,
            hidden_at = CASE
              WHEN community_moderation_state.hidden_at IS NOT NULL
                THEN community_moderation_state.hidden_at
              WHEN excluded.reporter_count >= threshold THEN now()
              ELSE NULL END,
            updated_at = now();
  ELSE
    SELECT count(DISTINCT r.reporter_id) INTO distinct_reporters
      FROM public.community_reports r WHERE r.comment_id = NEW.comment_id;
    INSERT INTO public.community_comment_moderation_state (comment_id, reporter_count, hidden_at)
      VALUES (NEW.comment_id, distinct_reporters,
        CASE WHEN distinct_reporters >= threshold THEN now() END)
      ON CONFLICT (comment_id) DO UPDATE
        SET reporter_count = excluded.reporter_count,
            hidden_at = CASE
              WHEN community_comment_moderation_state.hidden_at IS NOT NULL
                THEN community_comment_moderation_state.hidden_at
              WHEN excluded.reporter_count >= threshold THEN now()
              ELSE NULL END,
            updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_reports_moderation_bump ON public.community_reports;
CREATE TRIGGER community_reports_moderation_bump
  AFTER INSERT ON public.community_reports
  FOR EACH ROW EXECUTE FUNCTION public.bump_community_moderation_state();
