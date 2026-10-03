CREATE OR REPLACE FUNCTION public.is_clinic_member(_clinic_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.clinics WHERE id = _clinic_id AND owner_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.clinic_staff WHERE clinic_id = _clinic_id AND user_id = _user_id)
$$;

CREATE TABLE public.clinic_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  patient_name text NOT NULL DEFAULT '',
  last_message text NOT NULL DEFAULT '',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, patient_id)
);
GRANT SELECT, INSERT, UPDATE ON public.clinic_conversations TO authenticated;
GRANT ALL ON public.clinic_conversations TO service_role;
ALTER TABLE public.clinic_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv read" ON public.clinic_conversations FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "conv patient create" ON public.clinic_conversations FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE TABLE public.clinic_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.clinic_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL DEFAULT 'patient',
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.clinic_messages (conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.clinic_messages TO authenticated;
GRANT ALL ON public.clinic_messages TO service_role;
ALTER TABLE public.clinic_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_conversation(_conv uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.clinic_conversations c WHERE c.id = _conv
    AND (c.patient_id = _user OR public.is_clinic_member(c.clinic_id, _user)))
$$;

CREATE POLICY "msg read" ON public.clinic_messages FOR SELECT TO authenticated
  USING (public.can_access_conversation(conversation_id, auth.uid()));
CREATE POLICY "msg send" ON public.clinic_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.can_access_conversation(conversation_id, auth.uid())
    AND length(body) BETWEEN 1 AND 2000);
CREATE POLICY "msg mark read" ON public.clinic_messages FOR UPDATE TO authenticated
  USING (public.can_access_conversation(conversation_id, auth.uid()) AND sender_id <> auth.uid());

CREATE OR REPLACE FUNCTION public.on_clinic_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record;
BEGIN
  SELECT * INTO c FROM public.clinic_conversations WHERE id = NEW.conversation_id;
  IF c.patient_id = NEW.sender_id THEN NEW.sender_role := 'patient'; ELSE NEW.sender_role := 'clinic'; END IF;
  UPDATE public.clinic_conversations SET last_message = left(NEW.body, 120), last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_clinic_message_trg BEFORE INSERT ON public.clinic_messages
  FOR EACH ROW EXECUTE FUNCTION public.on_clinic_message();

ALTER PUBLICATION supabase_realtime ADD TABLE public.clinic_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clinic_conversations;