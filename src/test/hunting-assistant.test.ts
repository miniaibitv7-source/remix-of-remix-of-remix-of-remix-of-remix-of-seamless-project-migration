import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';

const scope: any = {}; runInNewContext(readFileSync('public/assistant.js', 'utf8'), scope);
const A = scope.LawlAssist;
const DAY = 864e5, now = Date.UTC(2026, 10, 12);

describe('hunting assistant rules', () => {
  it('works only with active Premium and a bought assistant', () => {
    expect(A.active({ premiumUntil: now + DAY, assistUntil: 0 }, now)).toBe(false);
    expect(A.active({ premiumUntil: 0, assistUntil: now + DAY }, now)).toBe(false);
    expect(A.active({ premiumUntil: now + DAY, assistUntil: now + DAY }, now)).toBe(true);
  });
  it('costs 100 gems, lasts 30 days and requires Premium to buy', () => {
    const free: any = { gems: 500, premiumUntil: 0 };
    expect(A.buy(free, now).reason).toBe('premium'); expect(free.gems).toBe(500);
    const prem: any = { gems: 150, premiumUntil: now + 40 * DAY };
    expect(A.buy(prem, now).ok).toBe(true); expect(prem.gems).toBe(50); expect(prem.assistUntil).toBe(now + 30 * DAY);
  });
  it('resets to zero when Premium ends before the assistant', () => {
    const p: any = { premiumUntil: now + 7 * DAY, assistUntil: now + 30 * DAY };
    expect(A.settle(p, now + 8 * DAY)).toBe('premium'); expect(p.assistUntil).toBe(0);
    p.premiumUntil = now + 60 * DAY; expect(A.active(p, now + 9 * DAY)).toBe(false);
  });
  it('drops loot on the ground unless auto-loot is active', () => {
    expect(A.autoLoot({ premiumUntil: now + DAY, assistUntil: 0 }, now)).toBe(false);
    expect(A.autoLoot({ premiumUntil: now + DAY, assistUntil: now + DAY, auto: {} }, now)).toBe(true);
  });
  it('keeps ground loot for the owner for 30 seconds and 3 minutes total', () => {
    expect(A.OWNER_MS).toBe(30000); expect(A.LIFE_MS).toBe(180000);
    const d = { mine: false, freeAt: now + 30000, until: now + 180000 };
    expect(A.canPick(d, now).reason).toBe('owner');
    expect(A.canPick(d, now + 30000).ok).toBe(true);
    expect(A.canPick(d, now + 180000).reason).toBe('gone');
  });
});

const owner = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
let db: PGlite;
const as = (u: string) => db.query("SELECT set_config('test.uid',$1,false)", [u]);
describe('ground loot on the server', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
      CREATE TABLE public.game_saves(user_id uuid PRIMARY KEY,character_slot int,data jsonb,updated_at timestamptz);
      INSERT INTO public.game_saves VALUES('${owner}',1,'{"name":"Dono"}',now()),('${other}',1,'{"name":"Outro"}',now());`);
    await db.exec(readdirSync('drizzle/migrations').filter(f => f.endsWith('.sql')).sort().map(f => readFileSync(`drizzle/migrations/${f}`, 'utf8')).filter(s => s.includes('FUNCTION public.lawl_loot_drop')).pop()!.replace(/--> statement-breakpoint/g, ''));
  }, 30000);
  afterAll(async () => db.close());
  it('lets only the owner pick during the first 30 seconds, then anyone, once', async () => {
    await as(owner);
    const d = (await db.query<any>(`SELECT lawl_loot_drop(1,10,10,0,'{"gold":25,"loot":{"Teia":1}}') AS r`)).rows[0].r;
    await as(other);
    const locked = (await db.query<any>('SELECT lawl_loot_pick(1,$1,10,11,0) AS r', [d.id])).rows[0].r;
    expect(locked.reason).toBe('owner');
    await db.query("UPDATE lawl_ground_loot SET created_at=now()-interval '31 seconds'");
    const got = (await db.query<any>('SELECT lawl_loot_pick(1,$1,10,11,0) AS r', [d.id])).rows[0].r;
    expect(got.ok).toBe(true); expect(got.items.gold).toBe(25);
    await as(owner);
    const again = (await db.query<any>('SELECT lawl_loot_pick(1,$1,10,10,0) AS r', [d.id])).rows[0].r;
    expect(again.reason).toBe('gone');
  });
  it('makes loot disappear after 3 minutes', async () => {
    await as(owner);
    const d = (await db.query<any>(`SELECT lawl_loot_drop(1,5,5,0,'{"hpPot":1}') AS r`)).rows[0].r;
    await db.query("UPDATE lawl_ground_loot SET created_at=now()-interval '181 seconds' WHERE id=$1", [d.id]);
    const r = (await db.query<any>('SELECT lawl_loot_pick(1,$1,5,5,0) AS r', [d.id])).rows[0].r;
    expect(r.reason).toBe('gone');
  });
  it('requires standing next to the loot', async () => {
    await as(owner);
    const d = (await db.query<any>(`SELECT lawl_loot_drop(1,20,20,0,'{"gold":3}') AS r`)).rows[0].r;
    const r = (await db.query<any>('SELECT lawl_loot_pick(1,$1,25,25,0) AS r', [d.id])).rows[0].r;
    expect(r.reason).toBe('far');
  });
});
