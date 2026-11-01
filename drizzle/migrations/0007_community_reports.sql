CREATE TABLE public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid(),
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'medical_misinformation', 'privacy', 'other')),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_reports_exactly_one_target
    CHECK (num_nonnulls(post_id, comment_id) = 1)
);

CREATE UNIQUE INDEX community_reports_post_reporter_idx
  ON public.community_reports (reporter_id, post_id)
  WHERE post_id IS NOT NULL;

CREATE UNIQUE INDEX community_reports_comment_reporter_idx
  ON public.community_reports (reporter_id, comment_id)
  WHERE comment_id IS NOT NULL;

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_reports FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.community_reports TO authenticated;

CREATE POLICY community_reports_visible_target_insert
  ON public.community_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reporter_id
    AND (
      (post_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.community_feed f WHERE f.id = post_id
      ))
      OR
      (comment_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.community_comments c
        JOIN public.community_feed f ON f.id = c.post_id
        WHERE c.id = comment_id
      ))
    )
  );
