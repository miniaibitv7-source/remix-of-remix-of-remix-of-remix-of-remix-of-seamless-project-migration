-- Guild system: lawl_guild_action (create for 500 gems, invites, leader / vice-leader / member ranks, up to 200 members) and a guild chat channel.
ALTER TABLE public.lawl_market_purchases DROP CONSTRAINT IF EXISTS lawl_market_purchases_action_check;
ALTER TABLE public.lawl_market_purchases ADD CONSTRAINT lawl_market_purchases_action_check CHECK (action IN ('xp','home','blessing','rename','guild'));

CREATE TABLE public.lawl_guilds(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 name text NOT NULL CHECK (length(name) BETWEEN 3 AND 20),
 motd text NOT NULL DEFAULT '' CHECK (length(motd)<=200),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX lawl_guilds_name_key ON public.lawl_guilds(lower(name));

CREATE TABLE public.lawl_guild_members(
 user_id uuid NOT NULL,
 slot integer NOT NULL,
 guild_id bigint NOT NULL REFERENCES public.lawl_guilds(id) ON DELETE CASCADE,
 rank text NOT NULL DEFAULT 'member' CHECK (rank IN ('leader','vice','member')),
 title text NOT NULL DEFAULT '' CHECK (length(title)<=20),
 joined_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,slot),
 FOREIGN KEY(user_id,slot) REFERENCES public.lawl_characters(user_id,slot) ON DELETE CASCADE
);
CREATE INDEX lawl_guild_members_guild ON public.lawl_guild_members(guild_id);
CREATE UNIQUE INDEX lawl_guild_one_leader ON public.lawl_guild_members(guild_id) WHERE rank='leader';

CREATE TABLE public.lawl_guild_invites(
 guild_id bigint NOT NULL REFERENCES public.lawl_guilds(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 slot integer NOT NULL,
 invited_by text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(guild_id,user_id,slot),
 FOREIGN KEY(user_id,slot) REFERENCES public.lawl_characters(user_id,slot) ON DELETE CASCADE
);
CREATE INDEX lawl_guild_invites_target ON public.lawl_guild_invites(user_id,slot);

CREATE TABLE public.lawl_guild_log(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 guild_id bigint NOT NULL REFERENCES public.lawl_guilds(id) ON DELETE CASCADE,
 body text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lawl_guild_log_guild ON public.lawl_guild_log(guild_id,id);

REVOKE ALL ON public.lawl_guilds, public.lawl_guild_members, public.lawl_guild_invites, public.lawl_guild_log FROM anon, authenticated;
GRANT ALL ON public.lawl_guilds, public.lawl_guild_members, public.lawl_guild_invites, public.lawl_guild_log TO service_role;
ALTER TABLE public.lawl_guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawl_guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawl_guild_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawl_guild_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.lawl_guild_note(p_guild bigint, p_body text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 INSERT INTO public.lawl_guild_log(guild_id,body) VALUES(p_guild,left(p_body,200));
 DELETE FROM public.lawl_guild_log WHERE guild_id=p_guild AND id<(SELECT id FROM public.lawl_guild_log WHERE guild_id=p_guild ORDER BY id DESC OFFSET 99 LIMIT 1);
END $$;

-- When a leader's character disappears (deleted), the oldest vice-leader, else the oldest member, takes over; an empty guild is dissolved.
CREATE OR REPLACE FUNCTION public.lawl_guild_member_gone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE nxt public.lawl_guild_members; nm text;
BEGIN
 IF OLD.rank='leader' AND EXISTS(SELECT 1 FROM public.lawl_guilds WHERE id=OLD.guild_id)
  AND NOT EXISTS(SELECT 1 FROM public.lawl_guild_members WHERE guild_id=OLD.guild_id AND rank='leader') THEN
  SELECT * INTO nxt FROM public.lawl_guild_members WHERE guild_id=OLD.guild_id ORDER BY (rank='vice') DESC, joined_at, user_id LIMIT 1;
  IF nxt.user_id IS NULL THEN
   DELETE FROM public.lawl_guilds WHERE id=OLD.guild_id;
  ELSE
   UPDATE public.lawl_guild_members SET rank='leader' WHERE user_id=nxt.user_id AND slot=nxt.slot;
   SELECT coalesce(data->>'name','') INTO nm FROM public.lawl_characters WHERE user_id=nxt.user_id AND slot=nxt.slot;
   PERFORM public.lawl_guild_note(OLD.guild_id,coalesce(nm,'')||' assumiu a liderança.');
  END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER lawl_guild_member_gone AFTER DELETE ON public.lawl_guild_members FOR EACH ROW EXECUTE FUNCTION public.lawl_guild_member_gone();

CREATE OR REPLACE FUNCTION public.lawl_guild_state(p_uid uuid, p_slot integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me public.lawl_guild_members; g public.lawl_guilds;
BEGIN
 SELECT * INTO me FROM public.lawl_guild_members WHERE user_id=p_uid AND slot=p_slot;
 IF me.guild_id IS NULL THEN
  RETURN jsonb_build_object('guild',NULL,'cost',500,'max',200,'invitations',coalesce((
   SELECT jsonb_agg(jsonb_build_object('guild',gi.id,'name',gi.name,'by',i.invited_by,'at',i.created_at,
    'members',(SELECT count(*) FROM public.lawl_guild_members x WHERE x.guild_id=gi.id)) ORDER BY i.created_at DESC)
   FROM public.lawl_guild_invites i JOIN public.lawl_guilds gi ON gi.id=i.guild_id WHERE i.user_id=p_uid AND i.slot=p_slot),'[]'::jsonb));
 END IF;
 SELECT * INTO g FROM public.lawl_guilds WHERE id=me.guild_id;
 RETURN jsonb_build_object('cost',500,'max',200,
  'guild',jsonb_build_object('id',g.id,'name',g.name,'motd',g.motd,'created',g.created_at),
  'me',jsonb_build_object('user',p_uid::text,'slot',p_slot,'rank',me.rank,'title',me.title),
  'members',coalesce((SELECT jsonb_agg(jsonb_build_object('user',m.user_id::text,'slot',m.slot,'name',coalesce(c.data->>'name',''),'voc',coalesce(c.data->>'voc',''),
     'level',greatest(1,floor(coalesce(public.lawl_jnum(c.data->'level'),1)))::int,'rank',m.rank,'title',m.title,'joined',m.joined_at,
     'online',EXISTS(SELECT 1 FROM public.game_saves s WHERE s.user_id=m.user_id AND s.character_slot=m.slot AND s.updated_at>now()-interval '2 minutes'))
    ORDER BY CASE m.rank WHEN 'leader' THEN 0 WHEN 'vice' THEN 1 ELSE 2 END, lower(coalesce(c.data->>'name','')))
   FROM public.lawl_guild_members m LEFT JOIN public.lawl_characters c ON c.user_id=m.user_id AND c.slot=m.slot WHERE m.guild_id=g.id),'[]'::jsonb),
  'invites',CASE WHEN me.rank IN ('leader','vice') THEN coalesce((SELECT jsonb_agg(jsonb_build_object('user',i.user_id::text,'slot',i.slot,'name',coalesce(c.data->>'name',''),'by',i.invited_by,'at',i.created_at) ORDER BY i.created_at DESC)
   FROM public.lawl_guild_invites i LEFT JOIN public.lawl_characters c ON c.user_id=i.user_id AND c.slot=i.slot WHERE i.guild_id=g.id),'[]'::jsonb) ELSE '[]'::jsonb END,
  'log',coalesce((SELECT jsonb_agg(jsonb_build_object('at',l.created_at,'text',l.body) ORDER BY l.id DESC)
   FROM (SELECT * FROM public.lawl_guild_log WHERE guild_id=g.id ORDER BY id DESC LIMIT 30) l),'[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.lawl_guild_action(p_action text, p_slot integer, p_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid:=auth.uid(); d jsonb:=coalesce(p_data,'{}'::jsonb); active integer; sv jsonb; me public.lawl_guild_members; tgt public.lawl_guild_members;
 my_name text; nm text; tname text; t_user uuid; t_slot integer; gid bigint; n integer; gems numeric; seqv bigint; extra jsonb:='{}'::jsonb; txt text;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Entre na sua conta.'; END IF;
 IF jsonb_typeof(d)<>'object' THEN RAISE EXCEPTION 'Pedido inválido.'; END IF;
 IF p_action IS DISTINCT FROM 'state' THEN PERFORM pg_advisory_xact_lock(hashtextextended('lawl-guilds',0)); END IF;
 SELECT character_slot,data INTO active,sv FROM public.game_saves WHERE user_id=uid;
 IF sv IS NULL OR active IS DISTINCT FROM p_slot THEN RAISE EXCEPTION 'Selecione novamente seu personagem.'; END IF;
 IF EXISTS(SELECT 1 FROM public.lawl_moderation WHERE user_id=uid AND suspended_until>now()) THEN RAISE EXCEPTION 'Conta suspensa.'; END IF;
 my_name:=coalesce(sv->>'name','');
 SELECT * INTO me FROM public.lawl_guild_members WHERE user_id=uid AND slot=p_slot;
 IF jsonb_typeof(d->'user')='string' AND d->>'user' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN t_user:=(d->>'user')::uuid; END IF;
 IF public.lawl_jint(d->'slot',1,5) THEN t_slot:=(d->>'slot')::int; END IF;

 IF p_action IN ('cancel_invite','leave','kick','promote','demote','transfer','title','motd','disband') AND me.guild_id IS NULL THEN
  RAISE EXCEPTION 'Você não está em uma guilda.';
 END IF;
 IF p_action IN ('kick','promote','demote','transfer','title') THEN
  SELECT * INTO tgt FROM public.lawl_guild_members WHERE user_id=t_user AND slot=t_slot AND guild_id=me.guild_id;
  IF tgt.user_id IS NULL THEN RAISE EXCEPTION 'Membro não encontrado.'; END IF;
  SELECT coalesce(data->>'name','') INTO tname FROM public.lawl_characters WHERE user_id=tgt.user_id AND slot=tgt.slot;
  tname:=coalesce(tname,'');
 END IF;

 IF p_action='state' THEN
  NULL;
 ELSIF p_action='create' THEN
  IF me.guild_id IS NOT NULL THEN RAISE EXCEPTION 'Você já faz parte de uma guilda.'; END IF;
  nm:=regexp_replace(btrim(coalesce(d->>'name','')),'\s+',' ','g');
  IF nm !~ '^[[:alpha:]][[:alpha:] ]{2,19}$' THEN RAISE EXCEPTION 'Nome da guilda: use de 3 a 20 letras e espaços.'; END IF;
  IF lower(replace(nm,' ','')) LIKE '%gamemaster%' THEN RAISE EXCEPTION 'Este nome é reservado.'; END IF;
  IF EXISTS(SELECT 1 FROM public.lawl_guilds WHERE lower(name)=lower(nm)) THEN RAISE EXCEPTION 'Já existe uma guilda com este nome.'; END IF;
  IF EXISTS(SELECT 1 FROM public.lawl_trades WHERE (user_a=uid::text OR user_b=uid::text) AND (status='pending' OR (user_a=uid::text AND NOT a_ack) OR (user_b=uid::text AND NOT b_ack)))
   OR jsonb_typeof(sv->'tradeEscrow')='object' THEN RAISE EXCEPTION 'Finalize a troca antes de criar a guilda.'; END IF;
  gems:=coalesce(floor(public.lawl_jnum(sv->'gems')),0);
  IF gems<500 THEN RAISE EXCEPTION 'Gemas insuficientes: criar uma guilda custa 500 gemas.'; END IF;
  INSERT INTO public.lawl_guilds(name) VALUES(nm) RETURNING id INTO gid;
  INSERT INTO public.lawl_guild_members(user_id,slot,guild_id,rank) VALUES(uid,p_slot,gid,'leader');
  DELETE FROM public.lawl_guild_invites WHERE user_id=uid AND slot=p_slot;
  INSERT INTO public.lawl_market_purchases(id,user_id,slot,action,cost,result) VALUES(gen_random_uuid(),uid,p_slot,'guild',500,jsonb_build_object('guild',gid)) RETURNING seq INTO seqv;
  sv:=jsonb_set(jsonb_set(sv,'{gems}',to_jsonb(gems-500)),'{marketCursor}',to_jsonb(seqv));
  PERFORM set_config('lawl.market_write','on',true);
  UPDATE public.game_saves SET data=sv,updated_at=now() WHERE user_id=uid;
  PERFORM set_config('lawl.market_write','',true);
  SELECT data INTO sv FROM public.game_saves WHERE user_id=uid;
  extra:=jsonb_build_object('gems',sv->'gems','marketCursor',sv->'marketCursor');
  PERFORM public.lawl_guild_note(gid,my_name||' fundou a guilda '||nm||'.');
 ELSIF p_action='invite' THEN
  IF me.rank IS DISTINCT FROM 'leader' AND me.rank IS DISTINCT FROM 'vice' THEN RAISE EXCEPTION 'Só o líder e os vice-líderes podem convidar.'; END IF;
  tname:=btrim(coalesce(d->>'name',''));
  SELECT count(*) INTO n FROM public.lawl_characters WHERE lower(data->>'name')=lower(tname);
  IF tname='' OR n<>1 THEN RAISE EXCEPTION 'Personagem não encontrado.'; END IF;
  SELECT user_id,slot,data->>'name' INTO t_user,t_slot,tname FROM public.lawl_characters WHERE lower(data->>'name')=lower(tname);
  IF EXISTS(SELECT 1 FROM public.lawl_guild_members WHERE user_id=t_user AND slot=t_slot) THEN RAISE EXCEPTION '% já faz parte de uma guilda.',tname; END IF;
  IF EXISTS(SELECT 1 FROM public.lawl_guild_invites WHERE guild_id=me.guild_id AND user_id=t_user AND slot=t_slot) THEN RAISE EXCEPTION '% já foi convidado.',tname; END IF;
  IF (SELECT count(*) FROM public.lawl_guild_members WHERE guild_id=me.guild_id)>=200 THEN RAISE EXCEPTION 'A guilda está cheia (200 de 200 membros).'; END IF;
  IF (SELECT count(*) FROM public.lawl_guild_invites WHERE guild_id=me.guild_id)>=50 THEN RAISE EXCEPTION 'Limite de 50 convites pendentes.'; END IF;
  INSERT INTO public.lawl_guild_invites(guild_id,user_id,slot,invited_by) VALUES(me.guild_id,t_user,t_slot,my_name);
  PERFORM public.lawl_guild_note(me.guild_id,my_name||' convidou '||tname||'.');
 ELSIF p_action='cancel_invite' THEN
  IF me.rank IS DISTINCT FROM 'leader' AND me.rank IS DISTINCT FROM 'vice' THEN RAISE EXCEPTION 'Só o líder e os vice-líderes podem cancelar convites.'; END IF;
  DELETE FROM public.lawl_guild_invites WHERE guild_id=me.guild_id AND user_id=t_user AND slot=t_slot;
  IF NOT FOUND THEN RAISE EXCEPTION 'Convite não encontrado.'; END IF;
  SELECT coalesce(data->>'name','') INTO tname FROM public.lawl_characters WHERE user_id=t_user AND slot=t_slot;
  PERFORM public.lawl_guild_note(me.guild_id,my_name||' cancelou o convite de '||coalesce(tname,'')||'.');
 ELSIF p_action IN ('accept','reject') THEN
  IF NOT public.lawl_jint(d->'guild',1,9223372036854775807) THEN RAISE EXCEPTION 'Convite não encontrado.'; END IF;
  gid:=(d->>'guild')::bigint;
  IF NOT EXISTS(SELECT 1 FROM public.lawl_guild_invites WHERE guild_id=gid AND user_id=uid AND slot=p_slot) THEN RAISE EXCEPTION 'Convite não encontrado.'; END IF;
  IF p_action='reject' THEN
   DELETE FROM public.lawl_guild_invites WHERE guild_id=gid AND user_id=uid AND slot=p_slot;
   PERFORM public.lawl_guild_note(gid,my_name||' recusou o convite.');
  ELSE
   IF me.guild_id IS NOT NULL THEN RAISE EXCEPTION 'Você já faz parte de uma guilda.'; END IF;
   IF (SELECT count(*) FROM public.lawl_guild_members WHERE guild_id=gid)>=200 THEN RAISE EXCEPTION 'A guilda está cheia (200 de 200 membros).'; END IF;
   INSERT INTO public.lawl_guild_members(user_id,slot,guild_id,rank) VALUES(uid,p_slot,gid,'member');
   DELETE FROM public.lawl_guild_invites WHERE user_id=uid AND slot=p_slot;
   PERFORM public.lawl_guild_note(gid,my_name||' entrou na guilda.');
  END IF;
 ELSIF p_action='leave' THEN
  IF me.rank='leader' THEN RAISE EXCEPTION 'Transfira a liderança ou dissolva a guilda antes de sair.'; END IF;
  DELETE FROM public.lawl_guild_members WHERE user_id=uid AND slot=p_slot;
  PERFORM public.lawl_guild_note(me.guild_id,my_name||' saiu da guilda.');
 ELSIF p_action='kick' THEN
  IF tgt.user_id=uid AND tgt.slot=p_slot THEN RAISE EXCEPTION 'Use Sair da guilda para sair.'; END IF;
  IF NOT (me.rank='leader' OR (me.rank='vice' AND tgt.rank='member')) THEN RAISE EXCEPTION 'Você não pode expulsar este membro.'; END IF;
  DELETE FROM public.lawl_guild_members WHERE user_id=tgt.user_id AND slot=tgt.slot;
  PERFORM public.lawl_guild_note(me.guild_id,my_name||' expulsou '||tname||'.');
 ELSIF p_action='promote' THEN
  IF me.rank<>'leader' THEN RAISE EXCEPTION 'Só o líder pode promover.'; END IF;
  IF tgt.rank<>'member' THEN RAISE EXCEPTION 'Só membros podem ser promovidos a vice-líder.'; END IF;
  UPDATE public.lawl_guild_members SET rank='vice' WHERE user_id=tgt.user_id AND slot=tgt.slot;
  PERFORM public.lawl_guild_note(me.guild_id,my_name||' promoveu '||tname||' a vice-líder.');
 ELSIF p_action='demote' THEN
  IF me.rank<>'leader' THEN RAISE EXCEPTION 'Só o líder pode rebaixar.'; END IF;
  IF tgt.rank<>'vice' THEN RAISE EXCEPTION 'Só vice-líderes podem ser rebaixados.'; END IF;
  UPDATE public.lawl_guild_members SET rank='member' WHERE user_id=tgt.user_id AND slot=tgt.slot;
  PERFORM public.lawl_guild_note(me.guild_id,my_name||' rebaixou '||tname||' a membro.');
 ELSIF p_action='transfer' THEN
  IF me.rank<>'leader' THEN RAISE EXCEPTION 'Só o líder pode passar a liderança.'; END IF;
  IF tgt.user_id=uid AND tgt.slot=p_slot THEN RAISE EXCEPTION 'Escolha outro membro.'; END IF;
  UPDATE public.lawl_guild_members SET rank='vice' WHERE user_id=uid AND slot=p_slot;
  UPDATE public.lawl_guild_members SET rank='leader' WHERE user_id=tgt.user_id AND slot=tgt.slot;
  PERFORM public.lawl_guild_note(me.guild_id,my_name||' passou a liderança para '||tname||'.');
 ELSIF p_action='title' THEN
  txt:=regexp_replace(btrim(coalesce(d->>'title','')),'\s+',' ','g');
  IF txt !~ '^[[:alnum:] ]{0,20}$' THEN RAISE EXCEPTION 'Título: até 20 letras, números e espaços.'; END IF;
  IF NOT (me.rank='leader' OR (me.rank='vice' AND (tgt.rank='member' OR (tgt.user_id=uid AND tgt.slot=p_slot)))) THEN RAISE EXCEPTION 'Você não pode mudar o título deste membro.'; END IF;
  UPDATE public.lawl_guild_members SET title=txt WHERE user_id=tgt.user_id AND slot=tgt.slot;
 ELSIF p_action='motd' THEN
  IF me.rank IS DISTINCT FROM 'leader' AND me.rank IS DISTINCT FROM 'vice' THEN RAISE EXCEPTION 'Só o líder e os vice-líderes podem mudar a mensagem.'; END IF;
  txt:=btrim(coalesce(d->>'motd',''));
  IF length(txt)>200 OR txt ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'Mensagem: até 200 caracteres em uma linha.'; END IF;
  UPDATE public.lawl_guilds SET motd=txt WHERE id=me.guild_id;
  PERFORM public.lawl_guild_note(me.guild_id,my_name||' atualizou a mensagem da guilda.');
 ELSIF p_action='disband' THEN
  IF me.rank<>'leader' THEN RAISE EXCEPTION 'Só o líder pode dissolver a guilda.'; END IF;
  DELETE FROM public.lawl_guilds WHERE id=me.guild_id;
 ELSE
  RAISE EXCEPTION 'Ação inválida.';
 END IF;
 RETURN public.lawl_guild_state(uid,p_slot)||extra;
END $$;

REVOKE EXECUTE ON FUNCTION public.lawl_guild_note(bigint,text), public.lawl_guild_member_gone(), public.lawl_guild_state(uuid,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lawl_guild_note(bigint,text), public.lawl_guild_member_gone(), public.lawl_guild_state(uuid,integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.lawl_guild_action(text,integer,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lawl_guild_action(text,integer,jsonb) TO authenticated, service_role;

-- Guild chat channel: only members of the same guild read and write it.
ALTER TABLE public.lawl_chat_messages ADD COLUMN IF NOT EXISTS guild_id bigint;
ALTER TABLE public.lawl_chat_messages DROP CONSTRAINT IF EXISTS lawl_chat_messages_channel_check;
ALTER TABLE public.lawl_chat_messages ADD CONSTRAINT lawl_chat_messages_channel_check CHECK (channel IN ('local','world','help','advertising','private','guild'));
CREATE INDEX IF NOT EXISTS lawl_chat_messages_guild ON public.lawl_chat_messages(guild_id,id) WHERE channel='guild';

CREATE OR REPLACE FUNCTION public.lawl_chat_send(p_slot integer, p_channel text, p_body text, p_target text DEFAULT ''::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid:=auth.uid(); s public.game_saves; last_msg public.lawl_chat_messages; target public.lawl_characters; msg public.lawl_chat_messages; txt text:=btrim(p_body); at_time timestamptz:=clock_timestamp(); gid bigint;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Entre na sua conta.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(uid::text));
 SELECT * INTO s FROM public.game_saves WHERE user_id=uid;
 IF s.user_id IS NULL OR s.character_slot<>p_slot OR coalesce(s.data->>'name','')='' THEN RAISE EXCEPTION 'Selecione novamente seu personagem.'; END IF;
 IF EXISTS(SELECT 1 FROM public.lawl_moderation WHERE user_id=uid AND (muted_until>at_time OR suspended_until>at_time)) THEN RAISE EXCEPTION 'Você está silenciado ou suspenso.'; END IF;
 IF p_channel IS NULL OR p_channel NOT IN ('local','world','help','advertising','private','guild') THEN RAISE EXCEPTION 'Canal inválido.'; END IF;
 IF txt IS NULL OR length(txt) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'Use entre 1 e 255 caracteres.'; END IF;
 IF txt ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'Envie uma linha por mensagem.'; END IF;
 IF p_channel='guild' THEN
  SELECT guild_id INTO gid FROM public.lawl_guild_members WHERE user_id=uid AND slot=p_slot;
  IF gid IS NULL THEN RAISE EXCEPTION 'Você não está em uma guilda.'; END IF;
 END IF;
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
 INSERT INTO public.lawl_chat_messages(user_id,slot,name,channel,recipient_id,recipient_slot,recipient_name,body,x,y,z,created_at,guild_id)
 VALUES(uid,p_slot,s.data->>'name',p_channel,target.user_id,target.slot,target.data->>'name',txt,coalesce(floor(public.lawl_jnum(s.data->'x'))::int,0),coalesce(floor(public.lawl_jnum(s.data->'y'))::int,0),coalesce(floor(public.lawl_jnum(s.data->'z'))::int,0),at_time,gid) RETURNING * INTO msg;
 RETURN to_jsonb(msg);
END $function$;

CREATE OR REPLACE FUNCTION public.lawl_chat_read(p_slot integer, p_channel text, p_after bigint DEFAULT 0)
 RETURNS SETOF public.lawl_chat_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid:=auth.uid(); s public.game_saves; gid bigint;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Entre na sua conta.'; END IF;
 SELECT * INTO s FROM public.game_saves WHERE user_id=uid;
 IF s.user_id IS NULL OR s.character_slot<>p_slot THEN RAISE EXCEPTION 'Selecione novamente seu personagem.'; END IF;
 IF EXISTS(SELECT 1 FROM public.lawl_moderation WHERE user_id=uid AND suspended_until>now()) THEN RAISE EXCEPTION 'Conta suspensa.'; END IF;
 SELECT guild_id INTO gid FROM public.lawl_guild_members WHERE user_id=uid AND slot=p_slot;
 RETURN QUERY SELECT m.* FROM public.lawl_chat_messages m WHERE m.channel=p_channel AND m.id>greatest(0,p_after)
  AND m.created_at>now()-interval '24 hours'
  AND NOT EXISTS(SELECT 1 FROM public.lawl_chat_blocks b WHERE b.user_id=uid AND b.blocked_id=m.user_id)
  AND (m.channel<>'private' OR (m.user_id=uid AND m.slot=p_slot) OR (m.recipient_id=uid AND m.recipient_slot=p_slot))
  AND (m.channel<>'guild' OR m.guild_id=gid)
  AND (m.channel<>'local' OR (m.z=coalesce(floor(public.lawl_jnum(s.data->'z'))::int,0) AND abs(m.x-coalesce(floor(public.lawl_jnum(s.data->'x'))::int,0))<=12 AND abs(m.y-coalesce(floor(public.lawl_jnum(s.data->'y'))::int,0))<=12))
  ORDER BY m.id DESC LIMIT 100;
END $function$;

CREATE OR REPLACE FUNCTION public.lawl_chat_report(p_slot integer, p_message bigint, p_reason text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.lawl_chat_read(p_slot,'local',greatest(0,p_message-1)) WHERE id=p_message)
 AND NOT EXISTS(SELECT 1 FROM public.lawl_chat_read(p_slot,'world',greatest(0,p_message-1)) WHERE id=p_message)
 AND NOT EXISTS(SELECT 1 FROM public.lawl_chat_read(p_slot,'help',greatest(0,p_message-1)) WHERE id=p_message)
 AND NOT EXISTS(SELECT 1 FROM public.lawl_chat_read(p_slot,'advertising',greatest(0,p_message-1)) WHERE id=p_message)
 AND NOT EXISTS(SELECT 1 FROM public.lawl_chat_read(p_slot,'private',greatest(0,p_message-1)) WHERE id=p_message)
 AND NOT EXISTS(SELECT 1 FROM public.lawl_chat_read(p_slot,'guild',greatest(0,p_message-1)) WHERE id=p_message) THEN RAISE EXCEPTION 'Mensagem indisponível.'; END IF;
 IF length(btrim(p_reason)) NOT BETWEEN 3 AND 200 THEN RAISE EXCEPTION 'Informe o motivo (3 a 200 caracteres).'; END IF;
 INSERT INTO public.lawl_chat_reports(reporter_id,message_id,reason) VALUES(auth.uid(),p_message,btrim(p_reason)) ON CONFLICT DO NOTHING;
END $function$;
