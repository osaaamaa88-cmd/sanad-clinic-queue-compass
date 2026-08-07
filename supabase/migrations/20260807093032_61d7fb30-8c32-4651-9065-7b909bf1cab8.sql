-- Highlights
CREATE TABLE public.clinic_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  title text NOT NULL,
  emoji text NOT NULL DEFAULT '✨',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.clinic_highlights TO service_role;
ALTER TABLE public.clinic_highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinic_highlights_deny_all_direct_access ON public.clinic_highlights
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER update_clinic_highlights_updated_at BEFORE UPDATE ON public.clinic_highlights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stories (24h)
CREATE TABLE public.clinic_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  highlight_id uuid REFERENCES public.clinic_highlights(id) ON DELETE SET NULL,
  media_url text NOT NULL DEFAULT '',
  media_type text NOT NULL DEFAULT 'image',
  caption text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'story',
  is_pinned boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinic_stories_clinic_idx ON public.clinic_stories (clinic_id, created_at DESC);
GRANT ALL ON public.clinic_stories TO service_role;
ALTER TABLE public.clinic_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinic_stories_deny_all_direct_access ON public.clinic_stories
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience text NOT NULL DEFAULT 'patient',
  recipient_key text NOT NULL DEFAULT '',
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_patient_idx ON public.notifications (recipient_key, created_at DESC);
CREATE INDEX notifications_clinic_idx ON public.notifications (clinic_id, created_at DESC);
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_deny_all_direct_access ON public.notifications
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- New booking -> notify clinic
CREATE OR REPLACE FUNCTION public.notify_clinic_new_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (audience, clinic_id, title, body, url, kind)
  VALUES ('clinic', NEW.clinic_id, 'حجز جديد 🎉',
    NEW.patient_name || ' حجز ' || COALESCE(NULLIF(NEW.day_label, ''), 'موعد') ||
    CASE WHEN COALESCE(NEW.slot,'') <> '' THEN ' الساعة ' || NEW.slot ELSE '' END ||
    ' — رقم الدور ' || NEW.queue_number,
    '/reception', 'booking');
  RETURN NEW;
END; $$;
CREATE TRIGGER notify_clinic_new_booking_trg AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_clinic_new_booking();

-- Clinic reply -> notify the patient who wrote the parent comment thread
CREATE OR REPLACE FUNCTION public.notify_patient_clinic_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_clinic_reply THEN
    INSERT INTO public.notifications (audience, recipient_key, clinic_id, title, body, url, kind)
    SELECT 'patient', c.author_key, NEW.clinic_id, 'العيادة ردّت على تعليقك 💬',
      left(NEW.body, 120), '/p/' || NEW.post_id, 'reply'
    FROM public.clinic_post_comments c
    WHERE c.post_id = NEW.post_id
      AND c.is_clinic_reply = false
      AND c.author_key <> ''
    GROUP BY c.author_key;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER notify_patient_clinic_reply_trg AFTER INSERT ON public.clinic_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_patient_clinic_reply();

-- New story -> notify followers
CREATE OR REPLACE FUNCTION public.notify_followers_new_story()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE doc text;
BEGIN
  SELECT doctor INTO doc FROM public.clinics WHERE id = NEW.clinic_id;
  INSERT INTO public.notifications (audience, recipient_key, clinic_id, title, body, url, kind)
  SELECT 'patient', f.follower_key, NEW.clinic_id,
    CASE WHEN NEW.kind = 'urgent' THEN 'تنبيه عاجل من ' || COALESCE(doc, 'العيادة') || ' ⚠️'
         ELSE 'ستوري جديدة من ' || COALESCE(doc, 'العيادة') || ' 📸' END,
    left(NEW.caption, 120), '/patient/clinic/' || NEW.clinic_id,
    CASE WHEN NEW.kind = 'urgent' THEN 'urgent' ELSE 'story' END
  FROM public.clinic_followers f
  WHERE f.clinic_id = NEW.clinic_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER notify_followers_new_story_trg AFTER INSERT ON public.clinic_stories
  FOR EACH ROW EXECUTE FUNCTION public.notify_followers_new_story();