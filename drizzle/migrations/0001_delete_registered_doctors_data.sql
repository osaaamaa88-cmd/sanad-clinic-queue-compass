DO $$
DECLARE c_ids uuid[] := ARRAY['65eadea2-93e7-4b6b-9138-783648e85536','49474236-a35c-4d0d-a6f8-ef47ea7458f2','930e2e0d-5357-42c8-870f-e8d171673ea4']::uuid[];
DECLARE o_ids uuid[] := ARRAY['4701d97d-1f7e-4ec6-894b-ee3e1176b450','a767dff8-35a2-46f6-92b1-17a399a710e6','e3faa157-d163-4f04-95a9-248de07d8bbc']::uuid[];
BEGIN
  DELETE FROM public.clinic_post_likes WHERE post_id IN (SELECT id FROM public.clinic_posts WHERE clinic_id = ANY(c_ids));
  DELETE FROM public.clinic_post_comments WHERE clinic_id = ANY(c_ids);
  DELETE FROM public.clinic_posts WHERE clinic_id = ANY(c_ids);
  DELETE FROM public.clinic_stories WHERE clinic_id = ANY(c_ids);
  DELETE FROM public.clinic_highlights WHERE clinic_id = ANY(c_ids);
  DELETE FROM public.clinic_followers WHERE clinic_id = ANY(c_ids);
  DELETE FROM public.clinic_reviews WHERE clinic_id = ANY(c_ids);
  DELETE FROM public.notifications WHERE clinic_id = ANY(c_ids);
  DELETE FROM public.bookings WHERE clinic_id = ANY(c_ids);
  DELETE FROM public.clinic_staff WHERE clinic_id = ANY(c_ids);
  DELETE FROM public.clinics WHERE id = ANY(c_ids);
  DELETE FROM auth.users WHERE id = ANY(o_ids);
END $$;