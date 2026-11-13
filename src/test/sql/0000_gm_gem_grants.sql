CREATE OR REPLACE FUNCTION public.lawl_guard_gm_gems_save() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE delta bigint; cursor_id bigint;
BEGIN
 IF TG_OP='UPDATE' AND (to_jsonb(OLD)->>'character_slot') IS NOT DISTINCT FROM (to_jsonb(NEW)->>'character_slot') THEN
  cursor_id := coalesce((OLD.data->>'gmGemCursor')::bigint,0);
  IF coalesce((NEW.data->>'gmGemCursor')::bigint,0) < cursor_id THEN
   SELECT coalesce(sum((payload->>'amount')::bigint),0) INTO delta FROM public.lawl_gm_events
    WHERE action='gems' AND payload->>'target'=NEW.user_id::text AND id>coalesce((NEW.data->>'gmGemCursor')::bigint,0) AND id<=cursor_id;
   NEW.data := jsonb_set(jsonb_set(NEW.data,'{gems}',to_jsonb(coalesce((NEW.data->>'gems')::bigint,0)+delta)),'{gmGemCursor}',to_jsonb(cursor_id));
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS lawl_guard_gm_gems_save ON public.game_saves;
CREATE TRIGGER lawl_guard_gm_gems_save BEFORE UPDATE ON public.game_saves FOR EACH ROW EXECUTE FUNCTION public.lawl_guard_gm_gems_save();
CREATE OR REPLACE FUNCTION public.lawl_gm_gems(p_target text,p_amount integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); tid uuid; n integer; ev public.lawl_gm_events; t text:=btrim(coalesce(p_target,''));
BEGIN
 IF uid IS NULL OR NOT public.lawl_is_gm() THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF p_amount IS NULL OR p_amount<1 OR p_amount>1000000 THEN RAISE EXCEPTION 'Invalid gem amount'; END IF;
 IF t ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN SELECT user_id INTO tid FROM public.game_saves WHERE user_id=t::uuid; END IF;
 IF tid IS NULL THEN
  SELECT count(*),min(user_id::text) INTO n,t FROM public.game_saves WHERE lower(data->>'name')=lower(btrim(coalesce(p_target,'')));
  IF n=1 THEN tid:=t::uuid; END IF;
 END IF;
 IF tid IS NULL THEN RAISE EXCEPTION 'Player not found'; END IF;
 INSERT INTO public.lawl_gm_events(actor_id,action,payload) VALUES(uid,'gems',jsonb_build_object('target',tid::text,'amount',p_amount)) RETURNING * INTO ev;
 UPDATE public.game_saves SET data=jsonb_set(jsonb_set(data,'{gems}',to_jsonb(coalesce((data->>'gems')::bigint,0)+p_amount)),'{gmGemCursor}',to_jsonb(ev.id)) WHERE user_id=tid;
 RETURN to_jsonb(ev);
END $$;
REVOKE ALL ON FUNCTION public.lawl_gm_gems(text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lawl_gm_gems(text,integer) TO authenticated;
