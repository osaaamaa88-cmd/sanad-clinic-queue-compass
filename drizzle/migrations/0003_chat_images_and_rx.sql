ALTER TABLE public.clinic_conversations ADD COLUMN IF NOT EXISTS allow_images boolean NOT NULL DEFAULT false;
ALTER TABLE public.clinic_messages ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text';
ALTER TABLE public.clinic_messages ADD COLUMN IF NOT EXISTS attachment_path text NOT NULL DEFAULT '';
ALTER TABLE public.clinic_messages ADD COLUMN IF NOT EXISTS payload jsonb;

GRANT UPDATE (allow_images) ON public.clinic_conversations TO authenticated;
CREATE POLICY "conv clinic update" ON public.clinic_conversations FOR UPDATE TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid())) WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.can_send_kind(_conv uuid, _user uuid, _kind text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN _kind = 'text' THEN true
    WHEN _kind = 'rx' THEN EXISTS (SELECT 1 FROM clinic_conversations c WHERE c.id=_conv AND public.is_clinic_member(c.clinic_id,_user))
    WHEN _kind = 'image' THEN EXISTS (SELECT 1 FROM clinic_conversations c WHERE c.id=_conv AND (c.allow_images OR public.is_clinic_member(c.clinic_id,_user)))
    ELSE false END
$$;

DROP POLICY IF EXISTS "msg send" ON public.clinic_messages;
CREATE POLICY "msg send" ON public.clinic_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.can_access_conversation(conversation_id, auth.uid())
    AND length(body) BETWEEN 1 AND 2000 AND public.can_send_kind(conversation_id, auth.uid(), kind));

CREATE POLICY "chat media read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='chat-media' AND public.can_access_conversation(((storage.foldername(name))[1])::uuid, auth.uid()));
CREATE POLICY "chat media upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='chat-media' AND public.can_access_conversation(((storage.foldername(name))[1])::uuid, auth.uid())
    AND public.can_send_kind(((storage.foldername(name))[1])::uuid, auth.uid(), 'image'));