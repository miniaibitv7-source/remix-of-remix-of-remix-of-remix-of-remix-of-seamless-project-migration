import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const owner = '11111111-1111-4111-8111-111111111111';
const recreated = '22222222-2222-4222-8222-222222222222';
const other = '33333333-3333-4333-8333-333333333333';
let db: PGlite;

async function isGm(id: string) {
  await db.query("SELECT set_config('test.uid', $1, false)", [id]);
  const result = await db.query<{ allowed: boolean }>('SELECT public.lawl_is_gm() AS allowed');
  return result.rows[0]?.allowed;
}

describe('automatic GameMaster authorization in PostgreSQL', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text UNIQUE, email_confirmed_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
      CREATE TABLE public.game_saves(user_id uuid PRIMARY KEY, data jsonb NOT NULL DEFAULT '{}');
      CREATE TABLE public.lawl_gm_roles(user_id uuid PRIMARY KEY, character_name text NOT NULL DEFAULT 'GameMaster', role text NOT NULL DEFAULT 'gamemaster', CONSTRAINT exclusive_gm_identity CHECK (user_id = '${owner}'::uuid));
      CREATE TABLE public.lawl_moderation(user_id uuid, muted_until timestamptz, suspended_until timestamptz, reason text);
      CREATE TABLE public.lawl_gm_events(id bigint);
    `);
    await db.exec(readFileSync('src/test/sql/0002_automatic_gamemaster_owner_authorization.sql', 'utf8'));
  }, 30000);
  afterAll(async () => { await db.close(); });

  it('does not authorize the owner until the email is confirmed', async () => {
    await db.query('INSERT INTO auth.users(id,email) VALUES ($1,$2)', [owner, 'wesleybdmguara@gmail.com']);
    await db.query('INSERT INTO public.game_saves VALUES ($1,$2)', [owner, { name: 'GameMaster' }]);
    expect(await isGm(owner)).toBe(false);
  });

  it('automatically authorizes the confirmed owner with GameMaster', async () => {
    await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1', [owner]);
    expect(await isGm(owner)).toBe(true);
  });

  it('does not grant powers to another character on the same account', async () => {
    await db.query('UPDATE public.game_saves SET data=$2 WHERE user_id=$1', [owner, { name: 'Knight' }]);
    expect(await isGm(owner)).toBe(false);
  });

  it('restores powers automatically when GameMaster is created again', async () => {
    await db.query('UPDATE public.game_saves SET data=$2 WHERE user_id=$1', [owner, { name: 'GameMaster' }]);
    expect(await isGm(owner)).toBe(true);
  });

  it('does not authorize another email even with the GameMaster name', async () => {
    await db.query('INSERT INTO auth.users VALUES ($1,$2,now())', [other, 'other@example.com']);
    await db.query('INSERT INTO public.game_saves VALUES ($1,$2)', [other, { name: 'GameMaster' }]);
    expect(await isGm(other)).toBe(false);
  });

  it('rejects a direct role assignment to a different email', async () => {
    await expect(db.query('INSERT INTO public.lawl_gm_roles(user_id) VALUES ($1)', [other])).rejects.toThrow('Confirmed GameMaster owner required');
  });

  it('revokes authorization when the owner changes email', async () => {
    await db.query('UPDATE auth.users SET email=$2 WHERE id=$1', [owner, 'previous@example.com']);
    expect(await isGm(owner)).toBe(false);
  });

  it('recognizes a recreated confirmed account with a different ID', async () => {
    await db.query('INSERT INTO auth.users VALUES ($1,$2,now())', [recreated, 'WESLEYBDMGUARA@gmail.com']);
    await db.query('INSERT INTO public.game_saves VALUES ($1,$2)', [recreated, { name: 'GameMaster' }]);
    expect(await isGm(recreated)).toBe(true);
  });

  it('cannot keep powers after the qualifying character is deleted', async () => {
    await db.query('DELETE FROM public.game_saves WHERE user_id=$1', [recreated]);
    expect(await isGm(recreated)).toBe(false);
  });

  it('does not expose the privileged synchronizer to players', async () => {
    const result = await db.query<{ allowed: boolean }>("SELECT has_function_privilege('authenticated', 'public.lawl_sync_gm_owner(uuid)', 'EXECUTE') AS allowed");
    expect(result.rows[0]?.allowed).toBe(false);
  });
});