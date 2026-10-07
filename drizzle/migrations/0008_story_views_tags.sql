ALTER TABLE public.clinic_stories ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.clinic_stories ADD COLUMN IF NOT EXISTS tag text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS clinic_stories_clinic_created_idx ON public.clinic_stories (clinic_id, created_at DESC);