CREATE TABLE IF NOT EXISTS public.save_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,
  message text NOT NULL,
  path text
);
GRANT ALL ON public.save_failures TO service_role;
ALTER TABLE public.save_failures ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS save_failures_created_idx ON public.save_failures (created_at DESC);