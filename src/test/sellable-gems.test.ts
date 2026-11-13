import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Sellable gems: only shop purchases and GM grants can be offered in trades; traded gems arrive non-sellable.
function sellableSql(): string {
  if (process.env["LAWL_SELLABLE_SQL"]) return readFileSync(process.env["LAWL_SELLABLE_SQL"], "utf8");
  const dir = "drizzle/migrations";
  const sql = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()
    .map((f) => readFileSync(join(dir, f), "utf8")).filter((s) => s.includes("lawl_sellable_save_guard"));
  if (!sql.length) throw new Error("sellable gems migration not found");
  return sql.join("\n");
}

const seller = "22222222-2222-4222-8222-222222222222";
const buyer = "33333333-3333-4333-8333-333333333333";
const gm = "11111111-1111-4111-8111-111111111111";
let db: PGlite;
let n = 0;
const tid = () => `44444444-4444-4444-8444-${String(++n).padStart(12, "0")}`;
const as = (id: string) => db.query("SELECT set_config('test.uid',$1,false)", [id]);
const offer = (gems: number) => ({ gold: 0, gems, hpPot: 0, mpPot: 0, loot: {}, items: [] });
const sellable = async (id: string) => { await as(id); return Number((await db.query<{ v: string }>("SELECT public.lawl_gem_sellable() v")).rows[0]?.v); };
const gems = async (id: string) => Number((await db.query<{ g: string }>("SELECT data->>'gems' g FROM public.game_saves WHERE user_id=$1", [id])).rows[0]?.g);
// The client saves its whole character; spending is a lower gem total.
const saveGems = (id: string, g: number, extra: Record<string, unknown> = {}) =>
  db.query("UPDATE public.game_saves SET data=data||$2::jsonb WHERE user_id=$1", [id, JSON.stringify({ gems: g, ...extra })]);
const confirm = async (who: string, id: string, partner: string, mine: unknown, theirs: unknown) => {
  await as(who);
  return (await db.query<{ r: { mine: boolean; status: string } }>("SELECT public.lawl_trade_confirm($1,$2,'x',$3,$4) r", [id, partner, mine, theirs])).rows[0]?.r;
};
const grant = async (target: string, amount: number) => { await as(gm); await db.query("SELECT public.lawl_gm_gems($1,$2)", [target, amount]); };

describe("sellable gems", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
      CREATE FUNCTION public.lawl_jnum(v jsonb) RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN jsonb_typeof(v)='number' THEN (v#>>'{}')::numeric END $$;
      CREATE FUNCTION public.lawl_jint(v jsonb, lo bigint, hi bigint) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT coalesce(public.lawl_jnum(v)=trunc(public.lawl_jnum(v)) AND public.lawl_jnum(v) BETWEEN lo AND hi,false) $$;
      CREATE FUNCTION public.lawl_is_gm() RETURNS boolean LANGUAGE sql AS $$ SELECT auth.uid()='${gm}'::uuid $$;
      CREATE TABLE public.game_saves(user_id uuid PRIMARY KEY, character_slot integer NOT NULL DEFAULT 1, data jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE public.lawl_characters(user_id uuid, slot integer, data jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,slot));
      CREATE TABLE public.lawl_gm_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid NOT NULL, action text NOT NULL, payload jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE public.lawl_gem_orders(id uuid PRIMARY KEY, user_id uuid NOT NULL, slot integer NOT NULL, character_name text NOT NULL DEFAULT '', pack integer NOT NULL, gems integer NOT NULL, amount_cents integer NOT NULL,
        status text NOT NULL DEFAULT 'pending', checkout_url text, invoice_slug text, transaction_nsu text, capture_method text, receipt_url text, event_id bigint, created_at timestamptz NOT NULL DEFAULT now(), credited_at timestamptz);
      CREATE TABLE public.lawl_trades(id uuid PRIMARY KEY, user_a text NOT NULL, user_b text, a_name text, b_name text, a_offer jsonb, b_offer jsonb, a_expect jsonb, b_expect jsonb,
        a_ack boolean NOT NULL DEFAULT false, b_ack boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());`);
    await db.exec(sellableSql());
    await db.query(`INSERT INTO public.game_saves(user_id,data) VALUES($1,'{"name":"Seller","gems":0}'),($2,'{"name":"Buyer","gems":0}'),($3,'{"name":"GameMaster","gems":0}')`, [seller, buyer, gm]);
    await db.query(`INSERT INTO public.lawl_characters(user_id,slot) VALUES($1,1),($2,1),($3,1)`, [seller, buyer, gm]);
  }, 30000);
  afterAll(async () => { await db.close(); });

  it("makes gems bought in the shop sellable", async () => {
    await db.query("INSERT INTO public.lawl_gem_orders(id,user_id,slot,pack,gems,amount_cents) VALUES('55555555-5555-4555-8555-555555555555',$1,1,1,100,990)", [seller]);
    await db.query("SELECT public.lawl_gem_order_credit('55555555-5555-4555-8555-555555555555',990,'','','pix','')");
    expect(await gems(seller)).toBe(100);
    expect(await sellable(seller)).toBe(100);
  });

  it("makes gems given by the GM sellable", async () => {
    await grant(buyer, 20);
    expect(await sellable(buyer)).toBe(20);
  });

  it("does not make gems earned in the game sellable", async () => {
    await saveGems(buyer, 70); // +50 from quests
    expect(await sellable(buyer)).toBe(20);
    const id = tid();
    await expect(confirm(buyer, id, seller, offer(21), offer(0))).rejects.toThrow(/vendáveis/);
  });

  it("gives traded gems to the receiver as non-sellable", async () => {
    const id = tid();
    await saveGems(seller, 40, { tradeEscrow: { id, offer: offer(60) } });
    expect((await confirm(seller, id, buyer, offer(60), offer(0)))?.status).toBe("pending");
    expect((await confirm(buyer, id, seller, offer(0), offer(60)))?.status).toBe("completed");
    await saveGems(seller, 40, { tradeEscrow: null });
    await saveGems(buyer, 130);
    expect(await sellable(seller)).toBe(40);
    expect(await sellable(buyer)).toBe(20);
    await expect(confirm(buyer, tid(), seller, offer(60), offer(0))).rejects.toThrow(/vendáveis/);
  });

  it("spends non-sellable gems first", async () => {
    await saveGems(buyer, 110); // spends 20 of 110 non-sellable
    expect(await sellable(buyer)).toBe(20);
    await saveGems(buyer, 15); // only 15 gems left in total
    expect(await sellable(buyer)).toBe(15);
  });

  it("returns sellable gems exactly as they were when a trade is cancelled", async () => {
    const id = tid();
    await saveGems(seller, 10, { tradeEscrow: { id, offer: offer(30) } });
    expect(await sellable(seller)).toBe(40);
    await confirm(seller, id, buyer, offer(30), offer(0));
    expect(await sellable(seller)).toBe(10);
    await as(seller);
    await db.query("SELECT public.lawl_trade_cancel($1,$2)", [id, buyer]);
    await saveGems(seller, 10, {}); // escrow not applied yet: still counts as the seller's
    expect(await sellable(seller)).toBe(40);
    await saveGems(seller, 40, { tradeEscrow: null });
    expect(await sellable(seller)).toBe(40);
  });

  it("returns the first offer's sellable gems when the offers do not match", async () => {
    const id = tid();
    await saveGems(seller, 30, { tradeEscrow: { id, offer: offer(10) } });
    await confirm(seller, id, buyer, offer(10), offer(5));
    expect(await sellable(seller)).toBe(30);
    expect((await confirm(buyer, id, seller, offer(0), offer(10)))?.status).toBe("cancelled");
    expect(await sellable(seller)).toBe(40);
  });
});
