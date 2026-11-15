-- lawl world expansion: 300x230 map, houses lawl-23..lawl-46 in Kharum, Glacira and Umbra
CREATE OR REPLACE FUNCTION public.lawl_house_catalog()
 RETURNS TABLE(id text, x integer, y integer, w integer, h integer, dx integer, dy integer, ax integer, ay integer, sqm integer)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$ VALUES
('lawl-1',23,3,8,8,27,10,27,11,36),
('lawl-2',23,14,8,8,27,14,27,13,36),
('lawl-3',32,3,8,8,36,10,36,11,36),
('lawl-4',32,14,8,8,36,14,36,13,36),
('lawl-5',41,3,8,8,45,10,45,11,36),
('lawl-6',41,14,8,8,45,14,45,13,36),
('lawl-7',4,23,8,8,5,30,5,31,36),
('lawl-8',4,32,8,8,10,32,10,31,36),
('lawl-9',14,23,8,8,15,30,15,31,36),
('lawl-10',14,32,8,8,20,32,20,31,36),
('lawl-11',49,23,8,8,50,30,50,31,36),
('lawl-12',49,32,8,8,55,32,55,31,36),
('lawl-13',58,23,8,8,59,30,59,31,36),
('lawl-14',58,32,8,8,64,32,64,31,36),
('lawl-15',23,62,10,8,28,62,28,61,48),
('lawl-16',35,62,10,8,40,62,40,61,48),
('lawl-17',67,23,8,8,68,30,68,31,36),
('lawl-18',67,32,8,8,73,32,73,31,36),
('lawl-19',76,23,8,8,77,30,77,31,36),
('lawl-20',76,32,8,8,82,32,82,31,36),
('lawl-21',85,23,8,8,86,30,86,31,36),
('lawl-22',85,32,8,8,91,32,91,31,36),
('lawl-23',33,176,8,8,37,183,37,184,36),
('lawl-24',42,176,8,8,46,183,46,184,36),
('lawl-25',54,176,8,8,58,183,58,184,36),
('lawl-26',63,176,8,8,67,183,67,184,36),
('lawl-27',33,201,8,8,37,201,37,200,36),
('lawl-28',42,201,8,8,46,201,46,200,36),
('lawl-29',54,201,8,8,58,201,58,200,36),
('lawl-30',63,201,8,8,67,201,67,200,36),
('lawl-31',174,16,8,8,178,23,178,24,36),
('lawl-32',183,16,8,8,187,23,187,24,36),
('lawl-33',195,16,8,8,199,23,199,24,36),
('lawl-34',204,16,8,8,208,23,208,24,36),
('lawl-35',174,41,8,8,178,41,178,40,36),
('lawl-36',183,41,8,8,187,41,187,40,36),
('lawl-37',195,41,8,8,199,41,199,40,36),
('lawl-38',204,41,8,8,208,41,208,40,36),
('lawl-39',174,122,8,8,178,129,178,130,36),
('lawl-40',183,122,8,8,187,129,187,130,36),
('lawl-41',195,122,8,8,199,129,199,130,36),
('lawl-42',204,122,8,8,208,129,208,130,36),
('lawl-43',174,147,8,8,178,147,178,146,36),
('lawl-44',183,147,8,8,187,147,187,146,36),
('lawl-45',195,147,8,8,199,147,199,146,36),
('lawl-46',204,147,8,8,208,147,208,146,36) $function$;

CREATE OR REPLACE FUNCTION public.lawl_gm_execute(p_action text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid:=auth.uid(); d jsonb:=coalesce(p_payload,'{}'::jsonb); res_out jsonb; tgt jsonb; kind text; mins integer; reason text; ev public.lawl_gm_events;
BEGIN
 IF uid IS NULL OR NOT public.lawl_is_gm() THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF jsonb_typeof(d)<>'object' THEN RAISE EXCEPTION 'Invalid payload'; END IF;
 IF p_action='invisible' THEN
  IF jsonb_typeof(d->'on')<>'boolean' THEN RAISE EXCEPTION 'Invalid payload'; END IF;
  res_out:=jsonb_build_object('on',d->'on');
 ELSIF p_action IN ('teleport','spawn','summon') THEN
  IF NOT (public.lawl_jint(d->'x',0,299) AND public.lawl_jint(d->'y',0,229) AND public.lawl_jint(d->'z',0,1)) THEN RAISE EXCEPTION 'Invalid position'; END IF;
  res_out:=jsonb_build_object('x',d->'x','y',d->'y','z',d->'z');
  IF p_action='spawn' THEN
   IF NOT (public.lawl_jint(d->'index',0,168) AND public.lawl_jint(d->'quantity',1,10)) THEN RAISE EXCEPTION 'Invalid monster'; END IF;
   res_out:=res_out||jsonb_build_object('index',d->'index','quantity',d->'quantity');
  ELSIF p_action='summon' THEN
   tgt:=public.lawl_gm_resolve(d->>'target');
   res_out:=res_out||jsonb_build_object('target',tgt->>'id','name',tgt->>'name');
  END IF;
 ELSIF p_action='item' THEN
  kind:=coalesce(d->>'kind','equip');
  IF kind='equip' AND public.lawl_jint(d->'index',0,999) AND public.lawl_jint(d->'quantity',1,20) THEN res_out:=jsonb_build_object('kind',kind,'index',d->'index','quantity',d->'quantity');
  ELSIF kind='loot' AND jsonb_typeof(d->'name')='string' AND length(btrim(d->>'name')) BETWEEN 1 AND 40 AND public.lawl_jint(d->'quantity',1,1000) THEN res_out:=jsonb_build_object('kind',kind,'name',d->'name','quantity',d->'quantity');
  ELSIF kind='potion' AND coalesce(d->>'potion','') ~ '^[a-z0-9]{1,16}$' AND public.lawl_jint(d->'quantity',1,1000) THEN res_out:=jsonb_build_object('kind',kind,'potion',d->'potion','quantity',d->'quantity');
  ELSIF kind='rune' AND coalesce(d->>'rune','') ~ '^[a-z0-9]{1,16}$' AND public.lawl_jint(d->'quantity',1,1000) THEN res_out:=jsonb_build_object('kind',kind,'rune',d->'rune','quantity',d->'quantity');
  ELSIF kind='gold' AND public.lawl_jint(d->'quantity',1,10000000) THEN res_out:=jsonb_build_object('kind',kind,'quantity',d->'quantity');
  ELSE RAISE EXCEPTION 'Invalid item'; END IF;
 ELSIF p_action='announce' THEN
  IF jsonb_typeof(d->'text')<>'string' OR length(btrim(d->>'text')) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Invalid announcement'; END IF;
  res_out:=jsonb_build_object('text',btrim(d->>'text'));
 ELSIF p_action IN ('mute','suspend') THEN
  IF NOT public.lawl_jint(d->'minutes',1,10080) THEN RAISE EXCEPTION 'Invalid duration'; END IF;
  tgt:=public.lawl_gm_resolve(d->>'target'); mins:=(d->>'minutes')::int; reason:=left(btrim(coalesce(d->>'reason','')),200);
  IF p_action='mute' THEN
   INSERT INTO public.lawl_moderation(user_id,muted_until,reason,updated_at) VALUES((tgt->>'id')::uuid,now()+make_interval(mins=>mins),reason,now())
   ON CONFLICT(user_id) DO UPDATE SET muted_until=EXCLUDED.muted_until,reason=EXCLUDED.reason,updated_at=now();
  ELSE
   INSERT INTO public.lawl_moderation(user_id,suspended_until,reason,updated_at) VALUES((tgt->>'id')::uuid,now()+make_interval(mins=>mins),reason,now())
   ON CONFLICT(user_id) DO UPDATE SET suspended_until=EXCLUDED.suspended_until,reason=EXCLUDED.reason,updated_at=now();
  END IF;
  res_out:=jsonb_build_object('target',tgt->>'id','name',tgt->>'name','minutes',mins,'reason',reason);
 ELSIF p_action='release' THEN
  tgt:=public.lawl_gm_resolve(d->>'target');
  UPDATE public.lawl_moderation SET muted_until=NULL,suspended_until=NULL,reason='',updated_at=now() WHERE user_id=(tgt->>'id')::uuid;
  res_out:=jsonb_build_object('target',tgt->>'id','name',tgt->>'name');
 ELSIF p_action='grant' THEN
  IF NOT (public.lawl_jint(d->'levels',0,500) AND public.lawl_jint(d->'amount',0,200)) OR coalesce(d->>'skill','') NOT IN ('sword','distance','magic','shielding') OR (d->>'levels')::int+(d->>'amount')::int=0 THEN RAISE EXCEPTION 'Invalid grant'; END IF;
  tgt:=public.lawl_gm_resolve(d->>'target');
  res_out:=jsonb_build_object('target',tgt->>'id','name',tgt->>'name','levels',d->'levels','amount',d->'amount','skill',d->'skill');
 ELSE RAISE EXCEPTION 'Invalid action';
 END IF;
 INSERT INTO public.lawl_gm_events(actor_id,action,payload) VALUES(uid,p_action,res_out) RETURNING * INTO ev;
 RETURN to_jsonb(ev);
END $function$;