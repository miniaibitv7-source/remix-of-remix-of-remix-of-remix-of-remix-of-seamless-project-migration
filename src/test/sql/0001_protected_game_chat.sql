CREATE TABLE public.lawl_chat_messages (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL, slot integer NOT NULL CHECK(slot BETWEEN 1 AND 5), name text NOT NULL,
 channel text NOT NULL CHECK(channel IN ('local','world','help','advertising','private')),
 recipient_id uuid, recipient_slot integer, recipient_name text,
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 255),
 x integer NOT NULL, y integer NOT NULL, z integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((channel='private' AND recipient_id IS NOT NULL AND recipient_slot BETWEEN 1 AND 5) OR (channel<>'private' AND recipient_id IS NULL AND recipient_slot IS NULL))
);
GRANT ALL ON public.lawl_chat_messages TO service_role;
ALTER TABLE public.lawl_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX lawl_chat_recent ON public.lawl_chat_messages(channel,id DESC);
CREATE INDEX lawl_chat_sender ON public.lawl_chat_messages(user_id,created_at DESC);
CREATE TABLE public.lawl_chat_reports (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, reporter_id uuid NOT NULL,
 message_id bigint NOT NULL REFERENCES public.lawl_chat_messages(id),
 reason text NOT NULL CHECK(length(reason) BETWEEN 3 AND 200), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(reporter_id,message_id)
);
GRANT SELECT ON public.lawl_chat_reports TO authenticated;
GRANT ALL ON public.lawl_chat_reports TO service_role;
ALTER TABLE public.lawl_chat_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gm reads chat reports" ON public.lawl_chat_reports FOR SELECT TO authenticated USING(public.lawl_is_gm());
CREATE TABLE public.lawl_chat_blocks (
 user_id uuid NOT NULL, blocked_id uuid NOT NULL, PRIMARY KEY(user_id,blocked_id), CHECK(user_id<>blocked_id)
);
GRANT SELECT,INSERT,DELETE ON public.lawl_chat_blocks TO authenticated;
GRANT ALL ON public.lawl_chat_blocks TO service_role;
ALTER TABLE public.lawl_chat_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chat blocks" ON public.lawl_chat_blocks FOR ALL TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
CREATE OR REPLACE FUNCTION public.lawl_chat_send(p_slot integer,p_channel text,p_body text,p_target text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); s public.game_saves; last_msg public.lawl_chat_messages; target public.lawl_characters; msg public.lawl_chat_messages; txt text:=btrim(p_body); at_time timestamptz:=clock_timestamp();
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Entre na sua conta.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(uid::text));
 SELECT * INTO s FROM public.game_saves WHERE user_id=uid;
 IF s.user_id IS NULL OR s.character_slot<>p_slot OR coalesce(s.data->>'name','')='' THEN RAISE EXCEPTION 'Selecione novamente seu personagem.'; END IF;
 IF EXISTS(SELECT 1 FROM public.lawl_moderation WHERE user_id=uid AND (muted_until>at_time OR suspended_until>at_time)) THEN RAISE EXCEPTION 'Você está silenciado ou suspenso.'; END IF;
 IF p_channel IS NULL OR p_channel NOT IN ('local','world','help','advertising','private') THEN RAISE EXCEPTION 'Canal inválido.'; END IF;
 IF txt IS NULL OR length(txt) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'Use entre 1 e 255 caracteres.'; END IF;
 IF txt ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'Envie uma linha por mensagem.'; END IF;
 SELECT * INTO last_msg FROM public.lawl_chat_messages WHERE user_id=uid ORDER BY id DESC LIMIT 1;
 IF last_msg.created_at>at_time-interval '2.5 seconds' THEN RAISE EXCEPTION 'Aguarde 2,5 segundos entre mensagens.'; END IF;
 IF EXISTS(SELECT 1 FROM public.lawl_chat_messages WHERE user_id=uid AND lower(body)=lower(txt) AND created_at>at_time-interval '30 seconds') THEN RAISE EXCEPTION 'Não repita a mesma mensagem por 30 segundos.'; END IF;
 IF p_channel='advertising' AND EXISTS(SELECT 1 FROM public.lawl_chat_messages WHERE user_id=uid AND channel='advertising' AND created_at>at_time-interval '2 minutes') THEN RAISE EXCEPTION 'Anúncios: aguarde 2 minutos entre publicações.'; END IF;
 IF p_channel='private' THEN
  IF (SELECT count(*) FROM public.lawl_characters WHERE lower(data->>'name')=lower(btrim(p_target)))<>1 THEN RAISE EXCEPTION 'Personagem não encontrado ou nome duplicado.'; END IF;
  SELECT * INTO target FROM public.lawl_characters WHERE lower(data->>'name')=lower(btrim(p_target));
  IF target.user_id=uid THEN RAISE EXCEPTION 'Escolha outro jogador.'; END IF;
  IF EXISTS(SELECT 1 FROM public.lawl_chat_blocks WHERE (user_id=uid AND blocked_id=target.user_id) OR (user_id=target.user_id AND blocked_id=uid)) THEN RAISE EXCEPTION 'Esta conversa está bloqueada.'; END IF;
 END IF;
 INSERT INTO public.lawl_chat_messages(user_id,slot,name,channel,recipient_id,recipient_slot,recipient_name,body,x,y,z,created_at)
 VALUES(uid,p_slot,s.data->>'name',p_channel,target.user_id,target.slot,target.data->>'name',txt,coalesce((s.data->>'x')::int,0),coalesce((s.data->>'y')::int,0),coalesce((s.data->>'z')::int,0),at_time) RETURNING * INTO msg;
 RETURN to_jsonb(msg);
END $$;
REVOKE ALL ON FUNCTION public.lawl_chat_send(integer,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lawl_chat_send(integer,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.lawl_chat_read(p_slot integer,p_channel text,p_after bigint DEFAULT 0) RETURNS SETOF public.lawl_chat_messages
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); s public.game_saves;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Entre na sua conta.'; END IF;
 SELECT * INTO s FROM public.game_saves WHERE user_id=uid;
 IF s.user_id IS NULL OR s.character_slot<>p_slot THEN RAISE EXCEPTION 'Selecione novamente seu personagem.'; END IF;
 IF EXISTS(SELECT 1 FROM public.lawl_moderation WHERE user_id=uid AND suspended_until>now()) THEN RAISE EXCEPTION 'Conta suspensa.'; END IF;
 RETURN QUERY SELECT m.* FROM public.lawl_chat_messages m WHERE m.channel=p_channel AND m.id>greatest(0,p_after)
 AND m.created_at>now()-interval '24 hours'
 AND NOT EXISTS(SELECT 1 FROM public.lawl_chat_blocks b WHERE b.user_id=uid AND b.blocked_id=m.user_id)
 AND (m.channel<>'private' OR (m.user_id=uid AND m.slot=p_slot) OR (m.recipient_id=uid AND m.recipient_slot=p_slot))
 AND (m.channel<>'local' OR (m.z=coalesce((s.data->>'z')::int,0) AND abs(m.x-coalesce((s.data->>'x')::int,0))<=12 AND abs(m.y-coalesce((s.data->>'y')::int,0))<=12))
 ORDER BY m.id DESC LIMIT 100;
END $$;
REVOKE ALL ON FUNCTION public.lawl_chat_read(integer,text,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lawl_chat_read(integer,text,bigint) TO authenticated;
CREATE OR REPLACE FUNCTION public.lawl_chat_report(p_slot integer,p_message bigint,p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.lawl_chat_read(p_slot,'local',greatest(0,p_message-1)) WHERE id=p_message)
 AND NOT EXISTS(SELECT 1 FROM public.lawl_chat_read(p_slot,'world',greatest(0,p_message-1)) WHERE id=p_message)
 AND NOT EXISTS(SELECT 1 FROM public.lawl_chat_read(p_slot,'help',greatest(0,p_message-1)) WHERE id=p_message)
 AND NOT EXISTS(SELECT 1 FROM public.lawl_chat_read(p_slot,'advertising',greatest(0,p_message-1)) WHERE id=p_message)
 AND NOT EXISTS(SELECT 1 FROM public.lawl_chat_read(p_slot,'private',greatest(0,p_message-1)) WHERE id=p_message) THEN RAISE EXCEPTION 'Mensagem indisponível.'; END IF;
 IF length(btrim(p_reason)) NOT BETWEEN 3 AND 200 THEN RAISE EXCEPTION 'Informe o motivo (3 a 200 caracteres).'; END IF;
 INSERT INTO public.lawl_chat_reports(reporter_id,message_id,reason) VALUES(auth.uid(),p_message,btrim(p_reason)) ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.lawl_chat_report(integer,bigint,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lawl_chat_report(integer,bigint,text) TO authenticated;