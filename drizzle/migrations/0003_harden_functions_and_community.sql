-- Server-only functions
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text,int,int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_booking(uuid,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text,int,int) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid,text,text,text,text,text,text) TO service_role;
-- Trigger-only functions
REVOKE EXECUTE ON FUNCTION public.community_check_clinic() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_clinic_new_booking() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_followers_new_story() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_patient_clinic_reply() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_clinic_message() FROM PUBLIC, anon, authenticated;
-- Policy helpers: signed-in only
REVOKE EXECUTE ON FUNCTION public.is_clinic_member(uuid,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_conversation(uuid,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_send_kind(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_clinic_member(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_conversation(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_send_kind(uuid,uuid,text) TO authenticated, service_role;

-- Community: comments/likes readable only for posts visible in the feed
DROP POLICY IF EXISTS "community comments readable" ON public.community_comments;
CREATE POLICY "community comments readable" ON public.community_comments FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.community_feed f WHERE f.id = community_comments.post_id));
DROP POLICY IF EXISTS "community likes readable" ON public.community_likes;
CREATE POLICY "community likes readable" ON public.community_likes FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.community_feed f WHERE f.id = community_likes.post_id));

-- Community images: only files attached to a published post
DROP POLICY IF EXISTS "community images read" ON storage.objects;
CREATE POLICY "community images read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'community' AND EXISTS (SELECT 1 FROM public.community_feed f WHERE f.image_path = storage.objects.name));
GRANT SELECT ON public.community_feed TO anon, authenticated;