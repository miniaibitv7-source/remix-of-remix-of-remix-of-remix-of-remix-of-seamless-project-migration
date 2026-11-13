CREATE OR REPLACE FUNCTION public.lawl_chat_reports_read() RETURNS SETOF jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.lawl_is_gm() THEN RAISE EXCEPTION 'Acesso exclusivo do GameMaster.'; END IF;
 RETURN QUERY SELECT jsonb_build_object('id',r.id,'reason',r.reason,'message',to_jsonb(m)) FROM public.lawl_chat_reports r JOIN public.lawl_chat_messages m ON m.id=r.message_id ORDER BY r.id DESC LIMIT 100;
END $$;
REVOKE ALL ON FUNCTION public.lawl_chat_reports_read() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lawl_chat_reports_read() TO authenticated;