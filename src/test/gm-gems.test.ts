import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const owner='11111111-1111-4111-8111-111111111111';
const player='22222222-2222-4222-8222-222222222222';
let db: PGlite;
const scope: { LawlGameMaster?: { applyGems: (p: {gems:number;gmGemCursor?:number},e:unknown,id:string)=>boolean; validate:(a:string,d:unknown)=>unknown } } = {};
runInNewContext(readFileSync('public/gamemaster.js','utf8'),scope);
describe('protected GM gem grants',()=>{
 beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
   CREATE TABLE public.game_saves(user_id uuid PRIMARY KEY,data jsonb NOT NULL,updated_at timestamptz DEFAULT now());
   CREATE TABLE public.lawl_gm_roles(user_id uuid PRIMARY KEY);
   CREATE TABLE public.lawl_gm_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_id uuid,action text,payload jsonb);
   CREATE FUNCTION public.lawl_is_gm() RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM public.lawl_gm_roles r JOIN public.game_saves s USING(user_id) WHERE r.user_id=auth.uid() AND s.data->>'name'='GameMaster') $$;
   INSERT INTO public.lawl_gm_roles VALUES('${owner}');
   INSERT INTO public.game_saves(user_id,data) VALUES('${owner}','{"name":"GameMaster","gems":10}'),('${player}','{"name":"TestPlayer","gems":5}');`);
  await db.exec(readFileSync('src/test/sql/0000_gm_gem_grants.sql','utf8'));
  await db.query("SELECT set_config('test.uid',$1,false)",[owner]);
 },30000);
 afterAll(async()=>db.close());
 it('adds gems to the GM and records an audit event',async()=>{
  const r=await db.query<{e:{id:number;payload:{target:string;amount:number}}}>('SELECT public.lawl_gm_gems($1,100) AS e',[owner]);
  expect(r.rows[0]?.e.payload).toMatchObject({target:owner,amount:100});
  const b=await db.query<{gems:number}>("SELECT (data->>'gems')::int AS gems FROM public.game_saves WHERE user_id=$1",[owner]);
  expect(b.rows[0]?.gems).toBe(110);
  const events=await db.query<{n:number}>("SELECT count(*)::int AS n FROM public.lawl_gm_events WHERE action='gems'");expect(events.rows[0]?.n).toBe(1);
 });
 it('grants gems to an offline player by character name',async()=>{
  await db.query("SELECT public.lawl_gm_gems('testplayer',25)");
  const r=await db.query<{gems:number}>("SELECT (data->>'gems')::int AS gems FROM public.game_saves WHERE user_id=$1",[player]);expect(r.rows[0]?.gems).toBe(30);
 });
 it('preserves a grant when a stale save arrives',async()=>{
  await db.query('UPDATE public.game_saves SET data=$2 WHERE user_id=$1',[player,{name:'TestPlayer',gems:7}]);
  const r=await db.query<{gems:number}>("SELECT (data->>'gems')::int AS gems FROM public.game_saves WHERE user_id=$1",[player]);expect(r.rows[0]?.gems).toBe(32);
 });
 it('rejects unauthorized players and missing recipients',async()=>{
  await db.query("SELECT set_config('test.uid',$1,false)",[player]);
  await expect(db.query('SELECT public.lawl_gm_gems($1,10)',[owner])).rejects.toThrow('Forbidden');
  await db.query("SELECT set_config('test.uid',$1,false)",[owner]);
  await expect(db.query("SELECT public.lawl_gm_gems('MissingPlayer',10)")).rejects.toThrow('Player not found');
 });
 it('rejects invalid quantities in the server and panel validation',async()=>{
  for(const amount of [0,-1,1000001]){
   await expect(db.query('SELECT public.lawl_gm_gems($1,$2)',[owner,amount])).rejects.toThrow('Invalid gem amount');
   expect(()=>scope.LawlGameMaster?.validate('gems',{target:owner,amount})).toThrow();
  }
  expect(()=>scope.LawlGameMaster?.validate('gems',{target:owner,amount:1.5})).toThrow();
 });
 it('applies a delivered event only once and only to its recipient',()=>{
  const p={gems:10};const e={id:50,action:'gems',payload:{target:player,amount:100}};
  expect(scope.LawlGameMaster?.applyGems(p,e,owner)).toBe(false);
  expect(scope.LawlGameMaster?.applyGems(p,e,player)).toBe(true);expect(p.gems).toBe(110);
  expect(scope.LawlGameMaster?.applyGems(p,e,player)).toBe(false);expect(p.gems).toBe(110);
 });
});