import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, X, Shield, Flag, Ban, Reply, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

type Message = { id: number; user_id: string; name: string; channel: string; recipient_name: string | null; body: string; created_at: string };
type ChatWindow = Window & { lawlChatSend?: (text: string) => Promise<void>; lawlOpenChat?: (channel?: string) => void; lawlChatUnread?: number; lawlSystemLog?: (text: string) => void };
const channels = [['system','Servidor'],['local','Local'],['world','Mundo'],['help','Ajuda'],['advertising','Anúncios'],['private','Privado'],['guild','Guilda']] as const;

export function GameChat({ userId, slot }: { userId: string; slot: number }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState('local');
  const [anchor, setAnchor] = useState<{ left: number; top: number; height: number } | null>(null);
  const [hud, setHud] = useState(false);
  useEffect(() => {
    // Keep the closed chat button just above the game's health heart, wherever the game layout puts it.
    const place = () => {
      const doc = document.querySelector<HTMLIFrameElement>('iframe[title="Reinos de Lawl"]')?.contentDocument;
      // The game's full-screen HUD has its own Chat button, so the floating one hides while it is on screen.
      const game = doc?.getElementById('game');
      const hasHud = !!doc?.getElementById('hudChat') && !!game && !game.classList.contains('hidden');
      setHud(hasHud);
      const hp = doc?.querySelector('.bars')?.getBoundingClientRect(), id = doc?.querySelector('#identity')?.getBoundingClientRect();
      if (!hp || !hp.width) return setAnchor(null);
      const top = Math.round(Math.max(id ? id.bottom + 1 : 0, hp.top - 26)), height = Math.max(16, Math.min(24, Math.round(hp.top - top - 1))), left = Math.round(hp.left);
      setAnchor(a => (a && a.left === left && a.top === top && a.height === height ? a : { left, top, height }));
    };
    place(); const t = window.setInterval(place, 500); window.addEventListener('resize', place);
    return () => { window.clearInterval(t); window.removeEventListener('resize', place); };
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rules, setRules] = useState(false);
  const [unread, setUnread] = useState(0);
  const [blocks, setBlocks] = useState<Array<{ blocked_id: string }>>([]);
  const [report, setReport] = useState<Message | null>(null);
  const [reason, setReason] = useState('');
  const [gm, setGm] = useState(false);
  const [muteMins, setMuteMins] = useState(60);
  const [reports, setReports] = useState<Array<{ id: number; reason: string; message: Message }>>([]);
  const lastPrivate = useRef(0);
  const [sysLog, setSysLog] = useState<Array<{ id: number; at: number; text: string }>>([]);
  const sysId = useRef(0);
  useEffect(() => {
    const w = window as ChatWindow;
    w.lawlSystemLog = text => { const t = String(text ?? '').slice(0, 300); if (!t) return; setSysLog(l => [...l.slice(-99), { id: ++sysId.current, at: Date.now(), text: t }]); };
    return () => { delete w.lawlSystemLog; };
  }, []);
  const log = useRef<HTMLDivElement>(null);
  const refresh = async () => {
    if (channel === 'system') return;
    const { data, error } = await supabase.rpc('lawl_chat_read', { p_slot: slot, p_channel: channel });
    if (error) { setError(error.message); return; }
    setMessages((data ?? []).reverse());
  };
  const send = async (text: string, destination = channel) => {
    setError('');
    const { error } = await supabase.rpc('lawl_chat_send', { p_slot: slot, p_channel: destination, p_body: text, p_target: target });
    if (error) throw new Error(error.message);
  };
  useEffect(() => {
    const w = window as ChatWindow;
    w.lawlChatSend = async text => { try { await send(text, 'local'); } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao enviar.'); setOpen(true); } };
    return () => { delete w.lawlChatSend; };
  }, [slot]);
  useEffect(() => {
    const w = window as ChatWindow;
    w.lawlOpenChat = ch => { if (ch && channels.some(([id]) => id === ch)) { setChannel(ch); setError(''); setRules(false); } setOpen(true); };
    return () => { delete w.lawlOpenChat; delete w.lawlChatUnread; };
  }, []);
  useEffect(() => { (window as ChatWindow).lawlChatUnread = unread; }, [unread]);
  useEffect(() => {
    let alive = true, running = false;
    const poll = async () => {
      if (running || document.hidden) return;
      running = true;
      try {
        if (open && channel !== 'system') {
          const { data, error } = await supabase.rpc('lawl_chat_read', { p_slot: slot, p_channel: channel });
          if (alive) { if (error) setError(error.message); else setMessages((data ?? []).reverse()); }
        }
        const { data } = await supabase.rpc('lawl_chat_read', { p_slot: slot, p_channel: 'private' });
        if (alive && data?.length) {
          const latest = Math.max(...data.map(m => m.id));
          if (lastPrivate.current && latest > lastPrivate.current && (!open || channel !== 'private'))
            setUnread(n => n + data.filter(m => m.id > lastPrivate.current && m.user_id !== userId).length);
          lastPrivate.current = latest;
        }
      } finally { running = false; }
    };
    void poll();
    const timer = setInterval(poll, 3000);
    return () => { alive = false; clearInterval(timer); };
  }, [open, channel, slot, userId]);
  useEffect(() => { if (open && channel === 'private') setUnread(0); }, [open, channel]);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [messages.length, sysLog.length, channel]);
  useEffect(() => { supabase.rpc('lawl_gm_status').then(({ data }) => setGm(Boolean((data as { isGm?: boolean } | null)?.isGm))); }, [slot]);
  const loadBlocks = async () => { const { data } = await supabase.from('lawl_chat_blocks').select('blocked_id'); setBlocks(data ?? []); };

  return <aside className="fixed right-2 bottom-14 z-20 w-[min(560px,calc(100vw-16px))] font-mono text-foreground">
    {!open ? (hud ? null : <Button aria-label={unread > 0 ? `Abrir chat (${unread} novas)` : 'Abrir chat'} title="Chat" variant="outline" size="sm" className="fixed h-6 min-h-0 gap-1 px-1.5 text-xs" style={anchor ?? { right: 8, bottom: 56 }} onClick={() => setOpen(true)}><MessageSquare className="size-3.5" />{unread > 0 && <span>{unread}</span>}</Button>) :
      <section aria-label="Chat do jogo" className="flex max-h-[65dvh] flex-col border-2 border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-2 py-1"><strong className="text-primary">Conversas {unread > 0 && `· ${unread} privadas`}</strong><div className="flex gap-1"><Button title="Regras e bloqueios" aria-label="Regras e bloqueios" variant="ghost" size="icon" onClick={() => { setRules(!rules); void loadBlocks(); }}><Shield className="size-4" /></Button><Button aria-label="Fechar chat" variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="size-4" /></Button></div></div>
        <div role="tablist" className="flex shrink-0 overflow-x-auto border-b border-border p-1">{channels.map(([id, label]) => <Button key={id} role="tab" aria-selected={channel === id} size="sm" variant={channel === id ? 'secondary' : 'ghost'} onClick={() => { setChannel(id); setError(''); setRules(false); }}>{label}</Button>)}</div>
        {rules ? <div className="overflow-y-auto p-3 text-xs leading-relaxed">
          <h3 className="mb-2 font-bold text-primary">Regras de comunicação</h3>
          <ul className="list-disc space-y-2 pl-4"><li>Respeite os jogadores: sem ofensas, discriminação, assédio, ameaças ou exposição de dados pessoais.</li><li>Local: jogadores a até 12 casas no mesmo andar. Mundo: conversa geral. Ajuda: dúvidas e respostas sobre o jogo. Guilda: só os membros da sua guilda.</li><li>Anúncios: comércio com itens e moedas do jogo, eventos, recrutamento e busca de grupos. Sem venda por dinheiro real, publicidade externa, golpes ou links maliciosos.</li><li>Não faça spam. Intervalo de 2,5 segundos por mensagem; textos iguais aguardam 30 segundos; anúncios aguardam 2 minutos.</li><li>Até 255 caracteres por mensagem. Sem fingir ser administrador ou incentivar violações. Denúncias são analisadas pelo GameMaster; podem resultar em silêncio ou suspensão.</li></ul>
          <h3 className="mt-3 font-bold">Jogadores bloqueados ({blocks.length})</h3>{blocks.map(b => <Button key={b.blocked_id} size="sm" variant="ghost" onClick={async () => { await supabase.from('lawl_chat_blocks').delete().eq('user_id', userId).eq('blocked_id', b.blocked_id); await loadBlocks(); }}>Desbloquear jogador <Volume2 className="size-4" /></Button>)}
          {gm && <><Button className="mt-3" size="sm" variant="outline" onClick={async () => { const { data, error } = await supabase.rpc('lawl_chat_reports_read'); if (error) setError(error.message); else setReports((data ?? []) as unknown as typeof reports); }}>Denúncias recebidas</Button>{reports.map(r => <div key={r.id} className="mt-2 border-t border-border py-2"><strong>{r.message.name}</strong>: {r.message.body}<p>Motivo: {r.reason}</p><Button size="sm" variant="outline" onClick={async () => { const { error } = await supabase.rpc('lawl_gm_execute', { p_action: 'mute', p_payload: { target: r.message.user_id, minutes: 10, reason: r.reason } }); setError(error ? error.message : 'Jogador silenciado por 10 minutos.'); }}>Silenciar 10 min</Button></div>)}</>}
        </div> : <>
          <div ref={log} role="log" aria-label="Mensagens" className="h-48 min-h-20 overflow-y-auto p-2 text-xs">
            {channel === 'system' ? (sysLog.length ? sysLog.map(m => <div key={m.id} className="mb-1 break-words"><span className="text-muted-foreground">{new Date(m.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} </span>{m.text}</div>) : <p className="text-muted-foreground">Nenhuma mensagem do servidor.</p>) : <>
            {!messages.length && <p className="text-muted-foreground">Nenhuma mensagem recente.</p>}
            {messages.map(m => <div key={m.id} className="mb-2 break-words border-b border-border pb-1"><span className="text-muted-foreground">{new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} </span><strong className="text-primary">{m.name}{m.channel === 'private' ? ` → ${m.recipient_name}` : ''}: </strong>{m.body}
              {m.user_id !== userId && <span className="ml-1 inline-flex"><Button size="icon" className="size-6" variant="ghost" title="Responder em privado" aria-label={`Responder a ${m.name}`} onClick={() => { setTarget(m.name); setChannel('private'); }}><Reply className="size-3" /></Button><Button size="icon" className="size-6" variant="ghost" title="Bloquear jogador" aria-label={`Bloquear ${m.name}`} onClick={async () => { const { error } = await supabase.from('lawl_chat_blocks').insert({ user_id: userId, blocked_id: m.user_id }); setError(error ? 'Não foi possível bloquear.' : 'Jogador bloqueado.'); void refresh(); }}><Ban className="size-3" /></Button><Button size="icon" className="size-6" variant="ghost" title="Denunciar mensagem" aria-label={`Denunciar mensagem de ${m.name}`} onClick={() => { setReport(m); setReason(''); }}><Flag className="size-3" /></Button>{gm && <><select aria-label="Duração do silêncio" value={muteMins} onChange={e => setMuteMins(Number(e.target.value))} className="ml-1 h-6 border border-border bg-input text-xs">{[[10,'10 min'],[60,'1 h'],[1440,'24 h'],[10080,'7 dias']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select><Button size="sm" className="h-6 px-2 text-xs" variant="outline" title="Silenciar jogador" onClick={async () => { const { error } = await supabase.rpc('lawl_gm_execute', { p_action: 'mute', p_payload: { target: m.user_id, minutes: muteMins } }); setError(error ? 'Não foi possível silenciar.' : `${m.name} silenciado.`); }}>Mutar</Button><Button size="sm" className="h-6 px-2 text-xs" variant="ghost" title="Remover silêncio" onClick={async () => { const { error } = await supabase.rpc('lawl_gm_execute', { p_action: 'release', p_payload: { target: m.user_id } }); setError(error ? 'Não foi possível liberar.' : `${m.name} liberado.`); }}>Liberar</Button></>}</span>}
            </div>)}</>}
          </div>
          {channel === 'system' ? null : report ? <form className="border-t border-border p-2" onSubmit={async e => { e.preventDefault(); const { error } = await supabase.rpc('lawl_chat_report', { p_slot: slot, p_message: report.id, p_reason: reason }); setError(error ? error.message : 'Denúncia enviada ao GameMaster.'); if (!error) setReport(null); }}><label className="text-xs">Motivo da denúncia<input required minLength={3} maxLength={200} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 w-full border border-border bg-input p-2" /></label><div className="mt-2 flex gap-2"><Button size="sm" type="submit">Denunciar</Button><Button size="sm" type="button" variant="ghost" onClick={() => setReport(null)}>Cancelar</Button></div></form> : <form className="border-t border-border p-2" onSubmit={async e => { e.preventDefault(); if (busy) return; setBusy(true); try { await send(body); setBody(''); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao enviar.'); } finally { setBusy(false); } }}>
            {channel === 'private' && <input aria-label="Destinatário" placeholder="Nome do personagem" required value={target} maxLength={30} onChange={e => setTarget(e.target.value)} className="mb-2 w-full border border-border bg-input p-2 text-xs" />}
            <div className="flex gap-2"><input aria-label="Mensagem" placeholder="Mensagem…" required maxLength={255} value={body} onChange={e => setBody(e.target.value)} className="min-w-0 flex-1 border border-border bg-input p-2 text-sm" /><Button type="submit" size="icon" disabled={busy || !body.trim()} aria-label="Enviar mensagem"><Send className="size-4" /></Button></div>
          </form>}
        </>}
        {error && <p role="status" className="px-2 pb-2 text-xs text-primary">{error}</p>}
      </section>}
  </aside>;
}