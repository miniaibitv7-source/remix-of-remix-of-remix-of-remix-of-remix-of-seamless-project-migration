CREATE OR REPLACE FUNCTION public.lawl_owner_email() RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT 'wesleybdmguara@gmail.com'::text $$;
CREATE OR REPLACE FUNCTION public.lawl_is_gm() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM auth.users u JOIN public.game_saves s ON s.user_id=u.id
  WHERE u.id=auth.uid() AND lower(u.email)=public.lawl_owner_email() AND u.email_confirmed_at IS NOT NULL AND s.data->>'name'='GameMaster')
$$;
CREATE OR REPLACE FUNCTION public.lawl_guard_gm_role() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=NEW.user_id AND lower(u.email)=public.lawl_owner_email() AND u.email_confirmed_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Confirmed GameMaster owner required';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS lawl_guard_gm_role ON public.lawl_gm_roles;
CREATE TRIGGER lawl_guard_gm_role BEFORE INSERT OR UPDATE ON public.lawl_gm_roles FOR EACH ROW EXECUTE FUNCTION public.lawl_guard_gm_role();
CREATE OR REPLACE FUNCTION public.lawl_sync_gm_owner(p_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p_user_id AND lower(u.email)=public.lawl_owner_email() AND u.email_confirmed_at IS NOT NULL) THEN
  BEGIN INSERT INTO public.lawl_gm_roles(user_id) VALUES(p_user_id) ON CONFLICT DO NOTHING; EXCEPTION WHEN check_violation THEN NULL; END;
 ELSE DELETE FROM public.lawl_gm_roles WHERE user_id=p_user_id;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.lawl_sync_gm_owner(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lawl_guard_gm_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lawl_is_gm() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lawl_is_gm() TO authenticated;
