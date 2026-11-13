import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Json as DbJson } from "@/integrations/supabase/types";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { GameChat } from "@/components/game-chat";
import { confirmGemReturn, createGemCheckout } from "@/lib/gem-shop.functions";
import { rememberGemCheckout, takeGemCheckout } from "@/lib/gem-checkout-return";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reinos de Lawl" },
      { name: "description", content: "Crie seu herói, escolha sua vocação e explore os Reinos de Lawl." },
      { property: "og:title", content: "Reinos de Lawl" },
      { property: "og:description", content: "Crie seu herói, escolha sua vocação e explore os Reinos de Lawl." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0F3460" },
    ],
  }),
  component: Index,
});

const SAVE_KEY = "miniaibit-standalone-save-v1";

type Json = Record<string, unknown>;
type GmStatus = { isGm: boolean; gmId: string | null; cursor: number; muted: boolean; suspended: boolean; reason: string };
type LawlWindow = Window & {
  lawlGM?: { status: GmStatus; execute: (action: string, payload: Json) => Promise<unknown>; onEvent?: (event: unknown) => void };
  lawlCloudSave?: (j: string) => void;
  lawlCloudSaveNow?: (j: string) => Promise<void>;
  lawlCreateCharacter?: (j: string) => Promise<void>;
  lawlDeleteCharacter?: () => Promise<void>;
  lawlRpc?: (name: string, args?: RpcArgs) => Promise<unknown>;
  lawlSwitchCharacter?: () => Promise<void>;
  lawlNet?: {
    me: string;
    send: (t: string, d: unknown) => void;
    onMsg?: (t: string, d: unknown, from: string) => void;
  };
};

function Index() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [splash, setSplash] = useState(true);
  const [payNotice, setPayNotice] = useState("");
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const order = q.get("order_nsu"), slug = q.get("slug"), nsu = q.get("transaction_nsu");
    if (!order || !slug || !nsu) return;
    setConfirmingPayment(true);
    window.history.replaceState(null, "", window.location.pathname);
    setPayNotice("Confirmando seu pagamento…");
    confirmGemReturn({ data: { order_nsu: order, slug, transaction_nsu: nsu, receipt_url: q.get("receipt_url") ?? undefined } })
      .then(({ status }) => setPayNotice(
        status === "credited" ? "💎 Pagamento confirmado! As gemas já estão no personagem que fez a compra."
          : status === "unassigned" ? "Pagamento recebido, mas o personagem da compra não existe mais. Fale com o GameMaster."
            : "Pagamento ainda não confirmado. Assim que o banco confirmar, as gemas entram sozinhas."))
      .catch(() => setPayNotice("Não foi possível confirmar agora. Se você pagou, as gemas entram sozinhas em instantes."))
      .finally(() => setConfirmingPayment(false));
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const t = setTimeout(() => setSplash(false), 2000);
    return () => {
      data.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  return (
    <>
      {session === undefined || confirmingPayment ? (
        <div className="min-h-screen bg-background" />
      ) : session ? (
        <Characters key={session.user.id} userId={session.user.id} />
      ) : (
        <AuthForm />
      )}
      {payNotice && (
        <div role="status" className="fixed inset-x-2 top-12 z-40 mx-auto max-w-md border-2 border-border bg-card p-3 font-mono text-sm text-foreground">
          {payNotice}
          <button className="ml-2 text-muted-foreground hover:text-primary" onClick={() => setPayNotice("")}>✕</button>
        </div>
      )}
      {splash && (
        <div className="pointer-events-none fixed inset-0 z-50 flex animate-splash items-center justify-center bg-splash">
          <span className="text-3xl font-bold text-splash-foreground">Miniaibit</span>
        </div>
      )}
    </>
  );
}

async function characterAction(action: string, slot: number, json?: string) {
  const { data, error } = await supabase.rpc("lawl_character_action", {
    p_action: action, p_slot: slot, ...(json ? { p_data: JSON.parse(json) } : {}),
  });
  if (error) throw new Error(error.message);
  return data;
}

function Characters({ userId }: { userId: string }) {
  const [characters, setCharacters] = useState<Array<{ slot: number; data: Json }>>([]);
  const [selection, setSelection] = useState<{ slot: number; create: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const checkedPaymentReturn = useRef(false);
  useEffect(() => {
    if (loading || error || checkedPaymentReturn.current) return;
    checkedPaymentReturn.current = true;
    const checkout = takeGemCheckout(localStorage, userId);
    if (checkout && characters.some(c => c.slot === checkout.slot)) {
      setSelection({ slot: checkout.slot, create: false });
    }
  }, [loading, error, characters, userId]);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    supabase.from("lawl_characters").select("slot,data").eq("user_id", userId).order("slot")
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError("Não foi possível carregar seus personagens. Tente novamente.");
        else { setCharacters((data ?? []).map(c => ({ slot: c.slot, data: c.data as Json }))); setError(""); }
        setLoading(false);
      });
    return () => { alive = false; };
  }, [userId, revision]);
  const back = () => { setSelection(null); setRevision(n => n + 1); };
  if (selection) return <Game key={`${selection.slot}-${selection.create}`} userId={userId} slot={selection.slot} creating={selection.create} onBack={back} />;
  const freeSlot = [1, 2, 3, 4, 5].find(slot => !characters.some(c => c.slot === slot));
  return <main className="flex min-h-screen items-center justify-center bg-background p-4 font-mono text-foreground">
    <section className="w-full max-w-md">
      <h1 className="text-3xl font-bold text-primary">Reinos de Lawl</h1>
      <h2 className="mt-5 text-xl">Seus personagens</h2>
      <p className="mb-4 text-sm text-muted-foreground">{characters.length}/5 personagens por e-mail</p>
      {error && <p role="alert" className="mb-3 text-destructive">{error}</p>}
      {loading ? <p>Carregando personagens…</p> : <div className="space-y-2">
        {characters.map(c => <Button key={c.slot} variant="outline" className="h-auto w-full justify-between gap-3 py-3 text-left" onClick={() => setSelection({ slot: c.slot, create: false })}>
          <span className="min-w-0 whitespace-normal break-words"><strong className="block text-primary">{String(c.data["name"])}</strong><span className="text-xs text-muted-foreground">{String(c.data["voc"])} · Nível {Number(c.data["level"]) || 1}</span></span><span>Jogar →</span>
        </Button>)}
        <Button className="mt-3 w-full" disabled={freeSlot === undefined || !!error} onClick={() => { if (freeSlot !== undefined) setSelection({ slot: freeSlot, create: true }); }}>Novo personagem</Button>
        {freeSlot === undefined && <p className="text-sm text-muted-foreground">Limite de 5 personagens atingido.</p>}
      </div>}
      <div className="mt-4 flex justify-between">
        <Button variant="ghost" onClick={() => setRevision(n => n + 1)}>Atualizar</Button>
        <Button variant="ghost" onClick={() => { localStorage.removeItem(SAVE_KEY); void supabase.auth.signOut(); }}>Sair</Button>
      </div>
    </section>
  </main>;
}

type RpcArgs = {
  p_name?: unknown; p_voc?: unknown; p_level?: unknown; p_xp?: unknown; p_sword?: unknown; p_distance?: unknown;
  p_magic?: unknown; p_shielding?: unknown; p_cat?: unknown; p_id?: unknown; p_partner?: unknown; p_offer?: unknown; p_expect?: unknown;
  p_action?: unknown; p_house?: unknown; p_days?: unknown; p_pack?: unknown; p_request?: unknown;
  p_target?: unknown; p_others?: unknown; p_killers?: unknown;
  p_x?: unknown; p_y?: unknown; p_z?: unknown; p_items?: unknown; p_data?: unknown;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidList = (v: unknown, max: number) =>
  (Array.isArray(v) ? v : []).map(String).filter((id) => UUID_RE.test(id)).slice(0, max);

// PvP skull RPCs always use the slot selected in this page, never one sent by the game frame.
async function pvpRpc(name: string, slot: number, args: RpcArgs): Promise<unknown> {
  const call = async () => {
    if (name === "lawl_pvp_attack") {
      const target = String(args.p_target ?? "");
      if (!UUID_RE.test(target)) throw new Error("Jogador inválido.");
      return supabase.rpc("lawl_pvp_attack", { p_slot: slot, p_target: target });
    }
    if (name === "lawl_pvp_death") return supabase.rpc("lawl_pvp_death", { p_slot: slot, p_killers: uuidList(args.p_killers, 10) });
    return supabase.rpc("lawl_pvp_status", { p_slot: slot, p_others: uuidList(args.p_others, 60) });
  };
  const { data, error } = await call();
  if (error) throw new Error(error.message);
  return data;
}

async function callRpc(name: string, args: RpcArgs = {}): Promise<unknown> {
  const s = (v: unknown) => String(v ?? "");
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    params?: Json,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const run = async (fn: string, params?: Json) => {
    const { data, error } = await rpc(fn, params);
    if (error) throw new Error(error.message);
    return data;
  };
  switch (name) {
    case "lawl_submit_rank":
      await run(name, {
        p_name: s(args.p_name),
        p_voc: s(args.p_voc),
        p_level: Number(args.p_level) || 1,
        p_xp: Number(args.p_xp) || 0,
        p_sword: Number(args.p_sword) || 0,
        p_distance: Number(args.p_distance) || 0,
        p_magic: Number(args.p_magic) || 0,
        p_shielding: Number(args.p_shielding) || 0,
      });
      return null;
    case "lawl_get_ranking":
      return (await run(name, { p_cat: String(args.p_cat ?? "xp") })) ?? [];
    case "lawl_gem_sellable":
      return Number((await run(name)) ?? 0);
    case "lawl_offline_trainers":
    case "lawl_trade_pending":
    case "lawl_trade_history":
      return (await run(name)) ?? [];
    case "lawl_trade_confirm":
      return run(name, {
        p_id: s(args.p_id),
        p_partner: s(args.p_partner),
        p_name: s(args.p_name),
        p_offer: args.p_offer ?? {},
        p_expect: args.p_expect ?? {},
      });
    case "lawl_trade_cancel":
      return run(name, { p_id: s(args.p_id), p_partner: s(args.p_partner) });
    case "lawl_trade_ack":
      await run(name, { p_id: s(args.p_id) });
      return null;
    default:
      throw new Error("unknown");
  }
}

function Game({ userId, slot, creating, onBack }: { userId: string; slot: number; creating: boolean; onBack: () => void }) {
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState("");
  const [hudVisible, setHudVisible] = useState(false);
  const pending = useRef<string | null>(null);
  const exists = useRef(!creating);
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());
  const persist = (j: string) => {
    const task = saveChain.current.catch(() => {}).then(() => characterAction("save", slot, j));
    saveChain.current = task;
    return task;
  };

  useEffect(() => {
    let alive = true;
    const w = window as LawlWindow;
    let gmCursor = 0;
    let polling = false;
    const gm: NonNullable<LawlWindow["lawlGM"]> = {
      status: { isGm: false, gmId: null, cursor: 0, muted: false, suspended: false, reason: "" },
      execute: async (action, payload) => {
        const { data, error } = action === "gems"
          ? await supabase.rpc("lawl_gm_gems", { p_target: String(payload["target"] ?? ""), p_amount: Number(payload["amount"]) })
          : await supabase.rpc("lawl_gm_execute", { p_action: action, p_payload: payload as never });
        if (error) throw new Error(action === "gems" && /target|Player not found/.test(error.message)
          ? "Jogador não encontrado ou nome duplicado. Confira o nome do personagem."
          : "Ação não autorizada ou inválida.");
        return data;
      },
    };
    w.lawlGM = gm;
    (async () => {
      try {
      if (creating) localStorage.removeItem(SAVE_KEY);
      else {
        const saved = await characterAction("select", slot);
        localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
      }
      const { data: status, error } = await supabase.rpc("lawl_gm_status");
      if (error) { if (alive) setBlocked("Não foi possível verificar o acesso ao jogo. Recarregue para tentar novamente."); return; }
      gm.status = status as unknown as GmStatus;
      gmCursor = gm.status.cursor;
      if (gm.status.suspended) { if (alive) setBlocked("Conta suspensa. " + gm.status.reason); return; }
      if (alive) setReady(true);
      } catch (e) { if (alive) setBlocked(e instanceof Error ? e.message : "Não foi possível abrir o personagem."); }
    })();

    const flush = async () => {
      const j = pending.current;
      if (j) {
        pending.current = null;
        try { await persist(j); } catch (e) { if (alive) setBlocked(e instanceof Error ? e.message : "Não foi possível salvar."); }
      }
    };
    const iv = setInterval(flush, 5000);
    const gmPoll = setInterval(async () => {
      if (polling || !alive || !ready && !gm.onEvent) return;
      polling = true;
      try {
        const { data, error } = await supabase.rpc("lawl_gm_poll", { p_after: gmCursor });
        if (error || !data) return;
        const result = data as unknown as { events: Array<{ id: number }>; status: GmStatus };
        gm.status = result.status;
        if (gm.status.suspended) setBlocked("Conta suspensa. " + gm.status.reason);
        for (const event of result.events) {
          const ev = event as { id: number; action?: string; payload?: { slot?: unknown } };
          const otherSlot = ev.action === "gems" && ev.payload?.slot != null && ev.payload.slot !== slot;
          if (!otherSlot) gm.onEvent?.(event);
          gmCursor = Math.max(gmCursor, event.id);
        }
      } finally { polling = false; }
    }, 2000);
    w.lawlCloudSave = (j) => {
      if (exists.current) pending.current = j;
    };
    w.lawlCloudSaveNow = async (j) => {
      pending.current = null;
      if (exists.current) await persist(j);
    };
    w.lawlCreateCharacter = async (j) => {
      await characterAction("create", slot, j);
      exists.current = true;
      const { data } = await supabase.rpc("lawl_gm_status");
      if (data) gm.status = data as unknown as GmStatus;
    };
    w.lawlDeleteCharacter = async () => {
      pending.current = null;
      await saveChain.current.catch(() => {});
      await characterAction("delete", slot);
      exists.current = false;
      localStorage.removeItem(SAVE_KEY);
      onBack();
    };
    w.lawlRpc = async (name, args = {}) => {
      if (name === "lawl_market_buy") {
        const task = saveChain.current.catch(() => {}).then(async () => {
          const { data, error } = await supabase.rpc("lawl_market_buy", {
            p_slot: slot, p_action: String(args.p_action ?? ""),
            p_request: String(args.p_request ?? ""), p_name: String(args.p_name ?? ""),
          });
          if (error) throw new Error(error.message);
          return data;
        });
        saveChain.current = task;
        return task;
      }
      if (name === "lawl_guild_action") {
        // Guild changes (creating one spends gems) wait for pending saves, and later saves wait for them.
        const data = args.p_data && typeof args.p_data === "object" && !Array.isArray(args.p_data) ? args.p_data : {};
        const task = saveChain.current.catch(() => {}).then(async () => {
          const res = await supabase.rpc("lawl_guild_action", { p_action: String(args.p_action ?? "state"), p_slot: slot, p_data: data as DbJson });
          if (res.error) throw new Error(res.error.message);
          return res.data;
        });
        saveChain.current = task;
        return task;
      }
      if (name === "lawl_gem_checkout") {
        await saveChain.current.catch(() => {});
        const checkout = await createGemCheckout({ data: { pack: Number(args.p_pack), slot, origin: window.location.origin } });
        rememberGemCheckout(localStorage, { userId, slot, orderId: checkout.orderId });
        return checkout;
      }
      if (name === "lawl_gem_order_status") {
        const { data, error } = await supabase.from("lawl_gem_orders").select("status").eq("id", String(args.p_id ?? "")).maybeSingle();
        if (error) throw new Error(error.message);
        return data?.status ?? null;
      }
      if (name === "lawl_pvp_attack" || name === "lawl_pvp_status" || name === "lawl_pvp_death") return pvpRpc(name, slot, args);
      if (name === "lawl_loot_drop" || name === "lawl_loot_list" || name === "lawl_loot_pick") {
        const n = (v: unknown) => Math.trunc(Number(v) || 0);
        const res = name === "lawl_loot_drop"
          ? await supabase.rpc("lawl_loot_drop", { p_slot: slot, p_x: n(args.p_x), p_y: n(args.p_y), p_z: n(args.p_z), p_items: (args.p_items ?? {}) as DbJson })
          : name === "lawl_loot_list"
            ? await supabase.rpc("lawl_loot_list", { p_slot: slot, p_x: n(args.p_x), p_y: n(args.p_y), p_z: n(args.p_z) })
            : await supabase.rpc("lawl_loot_pick", { p_slot: slot, p_id: n(args.p_id), p_x: n(args.p_x), p_y: n(args.p_y), p_z: n(args.p_z) });
        if (res.error) throw new Error(res.error.message);
        return res.data;
      }
      if (name !== "lawl_house_action") return callRpc(name, args);
      await saveChain.current.catch(() => {});
      const { data, error } = await supabase.rpc("lawl_house_action", {
        p_action: String(args.p_action ?? "list"), p_slot: slot,
        p_house: String(args.p_house ?? ""), p_days: Number(args.p_days ?? 7),
      });
      if (error) throw new Error(error.message);
      return data;
    };

    const channel = supabase.channel("lawl-world", { config: { broadcast: { self: false } } });
    const net: NonNullable<LawlWindow["lawlNet"]> = {
      me: userId,
      send: (t, d) => {
        if (gm.status.suspended || (t === "chat" && gm.status.muted)) return;
        channel.send({ type: "broadcast", event: "m", payload: { t, d, from: userId } });
      },
    };
    channel
      .on("broadcast", { event: "m" }, ({ payload }) => {
        const p = payload as { t: string; d: unknown; from: string };
        if (p?.from && p.from !== userId) net.onMsg?.(p.t, p.d, p.from);
      })
      .subscribe();
    w.lawlNet = net;

    return () => {
      alive = false;
      clearInterval(iv);
      clearInterval(gmPoll);
      delete w.lawlGM;
      delete w.lawlCloudSave;
      delete w.lawlCloudSaveNow;
      delete w.lawlCreateCharacter;
      delete w.lawlDeleteCharacter;
      delete w.lawlRpc;
      flush();
      supabase.removeChannel(channel);
    };
  }, [userId, slot, creating]);

  // The in-game HUD has its own character and chat buttons; the page buttons only show outside it (e.g. while creating a hero).
  useEffect(() => {
    if (!ready) return;
    const check = () => {
      const doc = document.querySelector<HTMLIFrameElement>('iframe[title="Reinos de Lawl"]')?.contentDocument;
      const game = doc?.getElementById("game");
      setHudVisible(!!game && !game.classList.contains("hidden") && !!doc?.getElementById("charBtn"));
    };
    check();
    const t = window.setInterval(check, 500);
    return () => window.clearInterval(t);
  }, [ready]);

  const switchCharacter = async () => {
    try {
      const frame = document.querySelector<HTMLIFrameElement>('iframe[title="Reinos de Lawl"]');
      frame?.contentWindow?.dispatchEvent(new Event("lawl-save-before-switch"));
      const j = pending.current;
      pending.current = null;
      if (j) await persist(j);
      await saveChain.current;
      onBack();
    } catch (e) { setBlocked(e instanceof Error ? e.message : "Não foi possível salvar."); }
  };
  const switchRef = useRef(switchCharacter);
  switchRef.current = switchCharacter;
  useEffect(() => {
    const w = window as LawlWindow;
    w.lawlSwitchCharacter = () => switchRef.current();
    return () => { delete w.lawlSwitchCharacter; };
  }, []);

  if (blocked) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 font-mono text-foreground"><p role="alert">{blocked}</p><Button onClick={onBack}>Personagens</Button></div>;
  if (!ready)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background font-mono text-muted-foreground">
        Carregando seu herói…
      </div>
    );

  return (
    <>
      <iframe title="Reinos de Lawl" src="/reinos.html" allow="fullscreen" allowFullScreen className="fixed inset-0 h-[100dvh] w-full border-0" />
      <GameChat userId={userId} slot={slot} />
      {!hudVisible && <><Button variant="outline" size="sm" className="fixed top-2 left-2 z-10 font-mono" onClick={() => void switchCharacter()}>Personagens</Button>
      <Button
        onClick={async () => {
          const j = pending.current;
          if (j) await persist(j);
          pending.current = null;
          localStorage.removeItem(SAVE_KEY);
          await supabase.auth.signOut();
        }}
        className="fixed bottom-2 right-2 z-10 border-2 border-border bg-card px-2 py-1 font-mono text-xs text-muted-foreground hover:text-primary"
      >
        Sair
      </Button></>}
    </>
  );
}

function AuthForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg("E-mail ou senha incorretos.");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Conta criada! Confirme pelo link enviado ao seu e-mail.");
    }
    setBusy(false);
  };

  const google = async () => {
    setMsg("");
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setMsg("Não foi possível entrar com o Google.");
  };

  const input = "w-full border-2 border-border bg-input px-3 py-3 text-foreground outline-none focus:border-primary";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 font-mono">
      <form onSubmit={submit} className="w-full max-w-sm border-2 border-border bg-card p-6">
        <h1 className="text-center text-3xl font-bold text-primary">Reinos de Lawl</h1>
        <p className="mb-5 text-center text-sm text-muted-foreground">
          {mode === "in" ? "Entre na sua conta" : "Crie sua conta"}
        </p>
        <button
          type="button"
          onClick={google}
          className="mb-4 flex w-full items-center justify-center gap-[10px] border border-google-border bg-google-bg px-3 py-2.5 text-sm font-medium text-google-text"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
            <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
          </svg>
          Continuar com Google
        </button>
        <input className={input} type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          className={`${input} mt-3`}
          type="password"
          required
          minLength={6}
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {msg && <p className="mt-3 text-sm text-primary">{msg}</p>}
        <button disabled={busy} className="mt-4 w-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
          {busy ? "Aguarde…" : mode === "in" ? "Entrar" : "Criar conta"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setMsg("");
          }}
          className="mt-3 w-full text-sm text-muted-foreground hover:text-primary"
        >
          {mode === "in" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
        {mode === "in" && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!email) { setMsg("Digite seu e-mail acima para receber o link."); return; }
              setBusy(true);
              const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/redefinir-senha` });
              setBusy(false);
              setMsg(error ? "Não foi possível enviar agora. Tente novamente em instantes." : "Se este e-mail tiver conta, enviamos um link para criar sua nova senha.");
            }}
            className="mt-2 w-full text-sm text-muted-foreground hover:text-primary"
          >
            Primeiro acesso ou esqueceu a senha?
          </button>
        )}
        <Link to="/privacidade" className="mt-4 block text-center text-xs text-muted-foreground hover:text-primary">
          Política de Privacidade
        </Link>
      </form>
    </div>
  );
}
