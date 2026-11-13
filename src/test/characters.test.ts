import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
let db: PGlite;
const hero = (slot: number) => ({ name: `Hero${slot}`, voc: 'knight', level: 1, gems: slot });
const action = (kind: string, slot: number, data?: unknown) => db.query('SELECT public.lawl_character_action($1,$2,$3)', [kind, slot, data ?? null]);
describe('five characters per email account', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
      CREATE TABLE public.game_saves(user_id uuid PRIMARY KEY,data jsonb NOT NULL,updated_at timestamptz DEFAULT now());
      CREATE TABLE public.lawl_moderation(user_id uuid,suspended_until timestamptz);
      CREATE TABLE public.lawl_gm_events(id bigint,action text,payload jsonb);
      CREATE TABLE public.lawl_trades(user_a text,user_b text,status text,a_ack boolean,b_ack boolean);
      INSERT INTO public.game_saves(user_id,data) VALUES('${owner}','{"name":"Existing","voc":"knight","gems":19}');`);
    await db.exec(readFileSync('src/test/sql/0000_five_characters_per_email.sql', 'utf8'));
    await db.query("SELECT set_config('test.uid',$1,false)", [owner]);
  }, 30000);
  afterAll(async () => { await db.close(); });
  it('preserves the original character as the first of five slots', async () => {
    const r = await db.query<{ data: { name: string } }>('SELECT data FROM lawl_characters WHERE user_id=$1 AND slot=1', [owner]);
    expect(r.rows[0]?.data.name).toBe('Existing');
  });
  it('allows exactly five characters and rejects the sixth', async () => {
    for (let slot = 2; slot <= 5; slot++) await action('create', slot, hero(slot));
    expect((await db.query<{ n: number }>('SELECT count(*)::int n FROM lawl_characters WHERE user_id=$1', [owner])).rows[0]?.n).toBe(5);
    await expect(action('create', 6, hero(6))).rejects.toThrow('Limite de 5');
    await expect(action('create', 1, hero(6))).rejects.toThrow('já tem');
  });
  it('keeps balances separate and rejects stale saves after switching', async () => {
    await action('select', 1);
    await expect(action('save', 5, hero(5))).rejects.toThrow('outra sessão');
    const r = await db.query<{ data: { gems: number } }>('SELECT data FROM game_saves WHERE user_id=$1', [owner]);
    expect(r.rows[0]?.data.gems).toBe(19);
  });
  it('cannot select another account character', async () => {
    await db.query("SELECT set_config('test.uid',$1,false)", [other]);
    await expect(action('select', 1)).rejects.toThrow('não encontrado');
    await db.query("SELECT set_config('test.uid',$1,false)", [owner]);
  });
  it('frees only the deleted character slot', async () => {
    await action('delete', 5);
    await action('create', 5, hero(5));
    expect((await db.query<{ n: number }>('SELECT count(*)::int n FROM lawl_characters WHERE user_id=$1', [owner])).rows[0]?.n).toBe(5);
  });
});