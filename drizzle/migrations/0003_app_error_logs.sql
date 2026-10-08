CREATE TABLE public.app_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  screen text,
  message text NOT NULL,
  summary_ar text,
  solution_ar text,
  analyzed_at timestamptz,
  resolved boolean NOT NULL DEFAULT false
);
GRANT ALL ON public.app_error_logs TO service_role;
ALTER TABLE public.app_error_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX app_error_logs_created_idx ON public.app_error_logs (created_at DESC);