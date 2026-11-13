CREATE FUNCTION public.lawl_house_catalog() RETURNS TABLE(id text,x integer,y integer,w integer,h integer,dx integer,dy integer,ax integer,ay integer,sqm integer) LANGUAGE sql IMMUTABLE SET search_path=public AS $$ VALUES
('lawl-1',23,12,4,4,25,15,25,16,4),
('lawl-2',23,20,4,4,25,20,25,19,4),
('lawl-3',32,12,4,4,34,15,34,16,4),
('lawl-4',32,20,4,4,34,20,34,19,4),
('lawl-5',37,12,4,4,39,15,39,16,4),
('lawl-6',37,20,4,4,39,20,39,19,4),
('lawl-7',42,12,4,4,44,15,44,16,4),
('lawl-8',42,20,4,4,44,20,44,19,4),
('lawl-9',46,12,4,4,48,15,48,16,4),
('lawl-10',46,20,4,4,48,20,48,19,4),
('lawl-11',14,23,4,4,16,26,16,27,4),
('lawl-12',14,33,4,4,16,33,16,32,4),
('lawl-13',19,23,4,4,21,26,21,27,4),
('lawl-14',19,33,4,4,21,33,21,32,4),
('lawl-15',50,25,5,4,50,27,49,27,6),
('lawl-16',50,30,5,4,50,32,49,32,6),
('lawl-17',38,37,4,4,40,40,40,41,4),
('lawl-18',38,44,4,4,40,44,40,43,4),
('lawl-19',43,37,4,4,45,40,45,41,4),
('lawl-20',43,44,4,4,45,44,45,43,4),
('lawl-21',49,37,4,4,51,40,51,41,4),
('lawl-22',49,44,4,4,51,44,51,43,4) $$;
CREATE TABLE public.lawl_house_leases(house_id text PRIMARY KEY,user_id uuid NOT NULL,slot integer NOT NULL,expires_at timestamptz NOT NULL,FOREIGN KEY(user_id,slot) REFERENCES public.lawl_characters(user_id,slot) ON DELETE CASCADE);
GRANT SELECT ON public.lawl_house_leases TO authenticated;
GRANT ALL ON public.lawl_house_leases TO service_role;
ALTER TABLE public.lawl_house_leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own leases" ON public.lawl_house_leases FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.lawl_house_payments(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id uuid NOT NULL,slot integer NOT NULL,house_id text NOT NULL,amount integer NOT NULL,days integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.lawl_house_payments TO authenticated;
GRANT ALL ON public.lawl_house_payments TO service_role;
ALTER TABLE public.lawl_house_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own rent payments" ON public.lawl_house_payments FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE FUNCTION public.lawl_house_save_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE last_id bigint; delta bigint; house record;
BEGIN
SELECT coalesce(max(id),0) INTO last_id FROM public.lawl_house_payments WHERE user_id=NEW.user_id AND slot=NEW.character_slot;
SELECT coalesce(sum(amount),0) INTO delta FROM public.lawl_house_payments WHERE user_id=NEW.user_id AND slot=NEW.character_slot AND id>greatest(0,least(last_id,coalesce((NEW.data->>'housingCursor')::bigint,0)));
NEW.data:=jsonb_set(jsonb_set(NEW.data,'{gems}',to_jsonb(greatest(0,coalesce((NEW.data->>'gems')::bigint,0)-delta))),'{housingCursor}',to_jsonb(last_id));
IF coalesce((NEW.data->>'z')::int,0)=0 THEN
 SELECT * INTO house FROM public.lawl_house_catalog() c WHERE (NEW.data->>'x')::int>c.x AND (NEW.data->>'x')::int<c.x+c.w-1 AND (NEW.data->>'y')::int>c.y AND (NEW.data->>'y')::int<c.y+c.h-1;
 IF FOUND AND NOT EXISTS(SELECT 1 FROM public.lawl_house_leases l WHERE l.house_id=house.id AND l.user_id=NEW.user_id AND l.slot=NEW.character_slot AND l.expires_at>now()) THEN
 NEW.data:=jsonb_set(jsonb_set(NEW.data,'{x}',to_jsonb(house.ax)),'{y}',to_jsonb(house.ay));
 END IF;
END IF;
RETURN NEW; END $$;
CREATE TRIGGER lawl_house_save_guard BEFORE INSERT OR UPDATE ON public.game_saves FOR EACH ROW EXECUTE FUNCTION public.lawl_house_save_guard();
CREATE FUNCTION public.lawl_house_action(p_action text,p_slot integer,p_house text DEFAULT '',p_days integer DEFAULT 7) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); saved jsonb; active integer; house record; lease public.lawl_house_leases; cost integer; receipt bigint; result jsonb;
BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Entre no jogo para acessar casas.'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
SELECT data,character_slot INTO saved,active FROM public.game_saves WHERE user_id=uid FOR UPDATE;
IF saved IS NULL OR active IS DISTINCT FROM p_slot THEN RAISE EXCEPTION 'Reabra seu personagem.'; END IF;
IF EXISTS(SELECT 1 FROM public.lawl_moderation WHERE user_id=uid AND suspended_until>now()) THEN RAISE EXCEPTION 'Conta suspensa.'; END IF;
IF p_action='list' THEN
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'mine',coalesce(l.user_id=uid AND l.slot=p_slot,false),'expires',l.expires_at,'occupied',coalesce(l.expires_at>now(),false))),'[]'::jsonb) INTO result FROM public.lawl_house_catalog() c LEFT JOIN public.lawl_house_leases l ON l.house_id=c.id AND l.expires_at>now(); RETURN result;
END IF;
IF p_action NOT IN ('rent','enter') THEN RAISE EXCEPTION 'Ação inválida.'; END IF;
SELECT * INTO house FROM public.lawl_house_catalog() WHERE id=p_house;
IF NOT FOUND THEN RAISE EXCEPTION 'Casa não encontrada.'; END IF;
IF coalesce((saved->>'z')::int,0)<>0 OR NOT (((saved->>'x')::int=house.ax AND (saved->>'y')::int=house.ay) OR ((saved->>'x')::int>house.x AND (saved->>'x')::int<house.x+house.w-1 AND (saved->>'y')::int>house.y AND (saved->>'y')::int<house.y+house.h-1)) THEN RAISE EXCEPTION 'Fique em frente à porta.'; END IF;
IF EXISTS(SELECT 1 FROM public.lawl_trades WHERE (user_a=uid::text OR user_b=uid::text) AND (status='pending' OR (user_a=uid::text AND NOT a_ack) OR (user_b=uid::text AND NOT b_ack))) OR saved ? 'tradeEscrow' THEN RAISE EXCEPTION 'Finalize a troca antes de acessar a casa.'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended('house:'||p_house,0));
SELECT * INTO lease FROM public.lawl_house_leases WHERE house_id=p_house FOR UPDATE;
IF p_action='rent' THEN
 IF p_days IS NULL OR p_days NOT IN (7,30) THEN RAISE EXCEPTION 'Período inválido.'; END IF;
 IF lease.expires_at>now() AND (lease.user_id<>uid OR lease.slot<>p_slot) THEN RAISE EXCEPTION 'Esta casa já está alugada.'; END IF;
 cost:=house.sqm*CASE WHEN p_days=7 THEN 1 ELSE 4 END;
 IF coalesce((saved->>'gems')::bigint,0)<cost THEN RAISE EXCEPTION 'Gemas insuficientes.'; END IF;
 INSERT INTO public.lawl_house_leases VALUES(p_house,uid,p_slot,CASE WHEN lease.user_id=uid AND lease.slot=p_slot THEN greatest(now(),lease.expires_at) ELSE now() END+make_interval(days=>p_days)) ON CONFLICT(house_id) DO UPDATE SET user_id=EXCLUDED.user_id,slot=EXCLUDED.slot,expires_at=EXCLUDED.expires_at;
 INSERT INTO public.lawl_house_payments(user_id,slot,house_id,amount,days) VALUES(uid,p_slot,p_house,cost,p_days) RETURNING id INTO receipt;
 saved:=jsonb_set(jsonb_set(saved,'{gems}',to_jsonb((saved->>'gems')::bigint-cost)),'{housingCursor}',to_jsonb(receipt));
 ELSE
 IF lease.user_id IS DISTINCT FROM uid OR lease.slot IS DISTINCT FROM p_slot OR lease.expires_at IS NULL OR lease.expires_at<=now() THEN RAISE EXCEPTION 'Você não tem uma chave válida para esta porta.'; END IF;
 saved:=jsonb_set(jsonb_set(saved,'{x}',to_jsonb(house.dx+(house.dx-house.ax))),'{y}',to_jsonb(house.dy+(house.dy-house.ay)));
END IF;
UPDATE public.game_saves SET data=saved,updated_at=now() WHERE user_id=uid;
SELECT data INTO saved FROM public.game_saves WHERE user_id=uid;
SELECT * INTO lease FROM public.lawl_house_leases WHERE house_id=p_house;
RETURN jsonb_build_object('gems',saved->'gems','cursor',saved->'housingCursor','x',saved->'x','y',saved->'y','lease',jsonb_build_object('id',p_house,'mine',true,'occupied',true,'expires',lease.expires_at));
END $$;
REVOKE ALL ON FUNCTION public.lawl_house_catalog(),public.lawl_house_save_guard(),public.lawl_house_action(text,integer,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lawl_house_action(text,integer,text,integer) TO authenticated;
