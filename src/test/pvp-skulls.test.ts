import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Runs the real PvP skull migration against an in-memory Postgres with minimal auth/game stubs.
function migrationSql(): string {
  const dir = "drizzle/migrations";
  const sql = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()
    .map((f) => readFileSync(join(dir, f), "utf8")).filter((s) => s.includes("lawl_pvp_attack"));
  if (!sql.length) throw new Error("pvp migration not found");
  return sql.join("\n");
}

const ids = Array.from({ length: 12 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`);
const [killer, a, b, c, gm] = ids.slice(0, 5) as [string, string, string, string, string];
const victims = ids.slice(5);
let db: PGlite;
type Status = { skull: string; pz_ms: number; skull_ms: number; frags: { day: number; week: number; month: number } };

const as = (id: string) => db.query("SELECT set_config('test.uid',$1,false)", [id]);
const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<{ r: T }>(sql, params)).rows[0]!.r;
const attack = async (from: string, to: string) => { await as(from); return one<{ justified: boolean; status: Status }>("SELECT public.lawl_pvp_attack(1,$1) r", [to]); };
const die = async (victim: string, killers: string[]) => { await as(victim); return one<{ skull: string; frags: { justified: boolean }[] }>("SELECT public.lawl_pvp_death(1,$1::uuid[]) r", [killers]); };
const status = async (id: string, others: string[] = []) => { await as(id); return one<{ me: Status; marks: Record<string, string>; attackers: Record<string, number> }>("SELECT public.lawl_pvp_status(1,$1::uuid[]) r", [others]); };
const reset = () => db.exec("DELETE FROM public.lawl_pvp_frags; DELETE FROM public.lawl_pvp_aggressions; DELETE FROM public.lawl_pvp_skulls;");

describe("PvP skull system", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
      CREATE TABLE public.game_saves(user_id uuid PRIMARY KEY, character_slot integer NOT NULL DEFAULT 1, data jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE public.lawl_gm_roles(user_id uuid PRIMARY KEY, character_name text NOT NULL DEFAULT 'GameMaster', role text NOT NULL DEFAULT 'gamemaster');`);
    await db.exec(migrationSql());
    for (const [i, id] of ids.entries()) await db.query("INSERT INTO public.game_saves(user_id,data) VALUES($1,$2)", [id, { name: id === gm ? "GameMaster" : `P${i}` }]);
    await db.query("INSERT INTO public.lawl_gm_roles(user_id) VALUES($1)", [gm]);
  }, 30000);
  afterAll(async () => { await db.close(); });

  it("gives a white skull and a 1 minute protection-zone block for attacking an unmarked player", async () => {
    await reset();
    const r = await attack(a, b);
    expect(r.justified).toBe(false);
    expect(r.status.skull).toBe("white");
    expect(r.status.pz_ms).toBeGreaterThan(55_000);
    expect(r.status.pz_ms).toBeLessThanOrEqual(60_000);
  });

  it("lets the victim fight back against a skulled attacker without getting a skull", async () => {
    await reset();
    await attack(a, b);
    const r = await attack(b, a);
    expect(r.justified).toBe(true);
    expect(r.status.skull).toBe("");
  });

  it("shows a yellow skull only to the skulled player on whoever attacked them", async () => {
    await reset();
    await attack(a, b); // a is white
    await attack(c, a); // c attacks a skulled player: justified
    expect((await status(a, [c])).marks[c]).toBe("yellow");
    expect((await status(b, [c])).marks[c]).toBeUndefined();
    const back = await attack(a, c);
    expect(back.justified).toBe(true);
  });

  it("counts an unjustified frag and a 15 minute white skull for killing an unmarked player", async () => {
    await reset();
    await attack(killer, victims[0]!);
    const d = await die(victims[0]!, [killer]);
    expect(d.frags).toEqual([expect.objectContaining({ justified: false })]);
    const me = (await status(killer)).me;
    expect(me.skull).toBe("white");
    expect(me.skull_ms).toBeGreaterThan(14 * 60_000);
    expect(me.frags.day).toBe(1);
  });

  it("does not count a frag for killing a skulled player", async () => {
    await reset();
    await attack(a, b);
    await attack(b, a);
    const d = await die(a, [b]);
    expect(d.frags).toEqual([expect.objectContaining({ justified: true })]);
    expect((await status(b)).me.frags.day).toBe(0);
  });

  it("ignores deaths reported against players who never attacked", async () => {
    await reset();
    const d = await die(victims[0]!, [killer]);
    expect(d.frags).toEqual([]);
    expect((await status(killer)).me.frags.month).toBe(0);
  });

  it("counts a death only once even if it is reported twice", async () => {
    await reset();
    await attack(killer, victims[0]!);
    await die(victims[0]!, [killer]);
    await attack(killer, victims[0]!);
    expect((await die(victims[0]!, [killer])).frags).toEqual([]);
    expect((await status(killer)).me.frags.day).toBe(1);
  });

  it("gives a red skull for 30 days after 3 unjustified kills in one day", async () => {
    await reset();
    for (const v of victims.slice(0, 3)) { await attack(killer, v); await die(v, [killer]); }
    const me = (await status(killer)).me;
    expect(me.skull).toBe("red");
    expect(me.skull_ms).toBeGreaterThan(29.9 * 86_400_000);
    expect(me.skull_ms).toBeLessThanOrEqual(30 * 86_400_000);
  });

  it("gives a red skull after 5 unjustified kills in a week", async () => {
    await reset();
    for (const v of victims.slice(0, 2)) { await attack(killer, v); await die(v, [killer]); }
    await db.query("INSERT INTO public.lawl_pvp_frags(killer_id,killer_slot,victim_id,victim_slot,justified,created_at) SELECT $1,1,$2,1,false,now()-interval '3 days' FROM generate_series(1,2)", [killer, a]);
    await db.exec("DELETE FROM public.lawl_pvp_skulls");
    await attack(killer, victims[2]!); await die(victims[2]!, [killer]);
    expect((await status(killer)).me.skull).toBe("red");
  });

  it("gives a black skull for 45 days after 6 unjustified kills in one day", async () => {
    await reset();
    for (const v of victims.slice(0, 6)) { await attack(killer, v); await die(v, [killer]); }
    const me = (await status(killer)).me;
    expect(me.skull).toBe("black");
    expect(me.skull_ms).toBeGreaterThan(44.9 * 86_400_000);
  });

  it("stops a black-skulled player from attacking unmarked players but allows skulled ones", async () => {
    await reset();
    for (const v of victims.slice(0, 6)) { await attack(killer, v); await die(v, [killer]); }
    await expect(attack(killer, b)).rejects.toThrow(/caveira preta/);
    await attack(a, c); // a now has a white skull
    expect((await attack(killer, a)).justified).toBe(true);
  });

  it("keeps the GameMaster out of player combat", async () => {
    await reset();
    await expect(attack(a, gm)).rejects.toThrow(/GameMaster/);
    await expect(attack(gm, a)).rejects.toThrow(/GameMaster/);
  });
});
