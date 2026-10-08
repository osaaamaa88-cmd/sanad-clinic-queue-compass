CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event text NOT NULL CHECK (event IN ('login','medical_query','profile_access','appointment_booked')),
  user_id uuid,
  ip_address text,
  details text NOT NULL DEFAULT ''
);
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX audit_logs_created_idx ON public.audit_logs (created_at DESC);