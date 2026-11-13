import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Runs the real game schema migration against an in-memory Postgres with a minimal auth stub.
function migrationSql(): string {
  if (process.env["LAWL_SQL"]) return readFileSync(process.env["LAWL_SQL"], "utf8");
  const dir = "drizzle/migrations";
  const sql = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()
    .map((f) => readFileSync(join(dir, f), "utf8")).filter((s) => s.includes("lawl_trade_confirm"));
  if (!sql.length) throw new Error("game schema migration not found");
  return sql.join("\n");
}

const owner = "11111111-1111-4111-8111-111111111111";
const alice = "22222222-2222-4222-8222-222222222222";
const bob = "33333333-3333-4333-8333-333333333333";
let db: PGlite;
const as = (id: string) => db.query("SELECT set_config('test.uid',$1,false)", [id]);
const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0] as T;
const hero = (name: string, extra: Record<string, unknown> = {}) => ({ name, voc: "knight", level: 1, gems: 10, x: 30, y: 30, z: 0, ...extra });
const create = (slot: number, data: unknown) => db.query("SELECT public.lawl_character_action('create',$1,$2)", [slot, data]);
const offer = (gold: number) => ({ gold, gems: 0, hpPot: 0, mpPot: 0, loot: {}, items: [] });
const tradeId = "44444444-4444-4444-8444-444444444444";

describe("game schema migration", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;`);
    await db.exec(migrationSql());
    await db.query("INSERT INTO auth.users VALUES ($1,'wesleybdmguara@gmail.com',now()),($2,'alice@example.com',now()),($3,'bob@example.com',NULL)", [owner, alice, bob]);
    await as(owner); await create(1, hero("GameMaster"));
    await as(alice); await create(1, hero("Alice"));
    await as(bob); await create(1, hero("Bob")); await create(2, hero("Bobby"));
    await db.query("SELECT public.lawl_character_action('select',1)");
  }, 30000);
  afterAll(async () => { await db.close(); });

  it("gives the confirmed owner's GameMaster the protected role automatically", async () => {
    expect((await one<{ n: number }>("SELECT count(*)::int n FROM public.lawl_gm_roles WHERE user_id=$1", [owner])).n).toBe(1);
    expect((await one<{ n: number }>("SELECT count(*)::int n FROM public.lawl_gm_roles")).n).toBe(1);
    await as(owner);
    expect((await one<{ s: { isGm: boolean; gmId: string } }>("SELECT public.lawl_gm_status() s")).s).toMatchObject({ isGm: true, gmId: owner });
  });

  it("lets new users sign up even when the GM sync cannot run", async () => {
    await db.query("INSERT INTO auth.users VALUES (gen_random_uuid(),'new@example.com',NULL)");
  });

  it("blocks GM commands for ordinary players", async () => {
    await as(alice);
    await expect(db.query("SELECT public.lawl_gm_execute('announce','{\"text\":\"hi\"}')")).rejects.toThrow("Forbidden");
  });

  it("delivers a GM skill grant only to its target", async () => {
    await as(owner);
    const start = (await one<{ s: { cursor: number } }>("SELECT public.lawl_gm_status() s")).s.cursor;
    await db.query("SELECT public.lawl_gm_execute('grant',$1)", [{ target: alice, levels: 2, amount: 0, skill: "sword" }]);
    await as(alice);
    const a = await one<{ p: { events: unknown[] } }>("SELECT public.lawl_gm_poll($1) p", [start]);
    expect(a.p.events).toHaveLength(1);
    await as(bob);
    const b = await one<{ p: { events: unknown[] } }>("SELECT public.lawl_gm_poll($1) p", [start]);
    expect(b.p.events).toHaveLength(0);
  });

  it("mutes a player through a GM command and blocks their chat", async () => {
    await as(owner);
    await db.query("SELECT public.lawl_gm_execute('mute',$1)", [{ target: bob, minutes: 10 }]);
    await as(bob);
    expect((await one<{ s: { muted: boolean } }>("SELECT public.lawl_gm_status() s")).s.muted).toBe(true);
    await expect(db.query("SELECT public.lawl_chat_send(1,'world','oi')")).rejects.toThrow("silenciado");
    await as(owner);
    await db.query("SELECT public.lawl_gm_execute('release',$1)", [{ target: bob }]);
  });

  it("completes a matching trade and hands each side the other's offer once", async () => {
    await as(alice);
    expect((await one<{ r: unknown }>("SELECT public.lawl_trade_confirm($1,$2,'Alice',$3,$4) r", [tradeId, bob, offer(100), offer(5)])).r).toEqual({ mine: true, status: "pending" });
    await as(bob);
    expect((await one<{ r: unknown }>("SELECT public.lawl_trade_confirm($1,$2,'Bob',$3,$4) r", [tradeId, alice, offer(5), offer(100)])).r).toEqual({ mine: true, status: "completed" });
    const got = await one<{ give: { gold: number }; partner_name: string }>("SELECT * FROM public.lawl_trade_pending()");
    expect(got.give.gold).toBe(100);
    expect(got.partner_name).toBe("Alice");
    await expect(db.query("SELECT public.lawl_character_action('select',2)")).rejects.toThrow("trocas");
    await db.query("SELECT public.lawl_trade_ack($1)", [tradeId]);
    expect((await db.query("SELECT * FROM public.lawl_trade_pending()")).rows).toHaveLength(0);
    await as(alice);
    expect((await one<{ give: { gold: number } }>("SELECT * FROM public.lawl_trade_pending()")).give.gold).toBe(5);
    await db.query("SELECT public.lawl_trade_ack($1)", [tradeId]);
    expect((await one<{ trade_status: string }>("SELECT * FROM public.lawl_trade_history()")).trade_status).toBe("completed");
  });

  it("returns the offer when a trade is cancelled before the partner confirms", async () => {
    const id = "55555555-5555-4555-8555-555555555555";
    await as(alice);
    await db.query("SELECT public.lawl_trade_confirm($1,$2,'Alice',$3,$4)", [id, bob, offer(7), offer(1)]);
    await as(bob);
    expect((await one<{ r: { mine: boolean } }>("SELECT public.lawl_trade_cancel($1,$2) r", [id, alice])).r.mine).toBe(false);
    await db.query("SELECT public.lawl_character_action('select',1)");
    await as(alice);
    const refund = await one<{ give: { gold: number }; trade_status: string }>("SELECT * FROM public.lawl_trade_pending()");
    expect(refund).toMatchObject({ trade_status: "cancelled", give: { gold: 7 } });
  });

  it("rejects a late confirmation after a cancel tombstone", async () => {
    const id = "66666666-6666-4666-8666-666666666666";
    await as(alice);
    expect((await one<{ r: { mine: boolean } }>("SELECT public.lawl_trade_cancel($1,$2) r", [id, bob])).r.mine).toBe(false);
    await as(bob);
    expect((await one<{ r: { mine: boolean } }>("SELECT public.lawl_trade_confirm($1,$2,'Bob',$3,$4) r", [id, alice, offer(1), offer(1)])).r.mine).toBe(false);
  });

  it("ranks only the active character's name and hides the GameMaster", async () => {
    await as(alice);
    await db.query("SELECT public.lawl_submit_rank('Alice','knight',5,900,10,0,0,8)");
    await db.query("SELECT public.lawl_submit_rank('Fake','knight',99,99999,99,0,0,99)");
    await as(owner);
    await db.query("SELECT public.lawl_submit_rank('GameMaster','knight',500,1,1,1,1,1)");
    const rows = (await db.query<{ name: string; value: number }>("SELECT * FROM public.lawl_get_ranking('xp')")).rows;
    expect(rows.map((r) => r.name)).toEqual(["Alice"]);
    expect(Number(rows[0]?.value)).toBe(900);
  });

  it("credits a paid gem order to the purchasing slot exactly once", async () => {
    const order = await one<{ id: string }>("INSERT INTO public.lawl_gem_orders(user_id,slot,pack,gems,amount_cents) VALUES($1,1,0,50,490) RETURNING id", [alice]);
    await expect(db.query("SELECT public.lawl_gem_order_credit($1,489,'s','n','pix','')", [order.id])).rejects.toThrow("below");
    expect((await one<{ r: { status: string } }>("SELECT public.lawl_gem_order_credit($1,490,'s','n','pix','') r", [order.id])).r.status).toBe("credited");
    expect((await one<{ r: { status: string } }>("SELECT public.lawl_gem_order_credit($1,490,'s','n','pix','') r", [order.id])).r.status).toBe("credited");
    expect((await one<{ g: number }>("SELECT (data->>'gems')::int g FROM public.game_saves WHERE user_id=$1", [alice])).g).toBe(60);
  });

  it("credits an inactive slot's character without touching the active one", async () => {
    const order = await one<{ id: string }>("INSERT INTO public.lawl_gem_orders(user_id,slot,pack,gems,amount_cents) VALUES($1,2,0,50,490) RETURNING id", [bob]);
    await db.query("SELECT public.lawl_gem_order_credit($1,490,'s','n','pix','')", [order.id]);
    expect((await one<{ g: number }>("SELECT (data->>'gems')::int g FROM public.lawl_characters WHERE user_id=$1 AND slot=2", [bob])).g).toBe(60);
    expect((await one<{ g: number }>("SELECT (data->>'gems')::int g FROM public.game_saves WHERE user_id=$1", [bob])).g).toBe(10);
  });

  it("marks orders for deleted characters as unassigned", async () => {
    const order = await one<{ id: string }>("INSERT INTO public.lawl_gem_orders(user_id,slot,pack,gems,amount_cents) VALUES($1,4,0,50,490) RETURNING id", [bob]);
    expect((await one<{ r: { status: string } }>("SELECT public.lawl_gem_order_credit($1,490,'s','n','pix','') r", [order.id])).r.status).toBe("unassigned");
  });

  it("does not let players call the gem credit function", async () => {
    const r = await one<{ ok: boolean }>("SELECT has_function_privilege('authenticated','public.lawl_gem_order_credit(uuid,integer,text,text,text,text)','EXECUTE') ok");
    expect(r.ok).toBe(false);
  });

  it("lists other characters left training offline", async () => {
    await as(alice);
    await db.query("SELECT public.lawl_character_action('save',1,$1)", [hero("Alice", { x: 38, y: 30, trainTime: 600, lastSeen: Date.now() - 60000, gems: 60 })]);
    await as(bob);
    const rows = (await db.query<{ name: string; left_s: number }>("SELECT * FROM public.lawl_offline_trainers()")).rows;
    expect(rows.map((r) => r.name)).toEqual(["Alice"]);
    expect(rows[0]?.left_s).toBeGreaterThan(500);
    expect(rows[0]?.left_s).toBeLessThanOrEqual(540);
  });
});
