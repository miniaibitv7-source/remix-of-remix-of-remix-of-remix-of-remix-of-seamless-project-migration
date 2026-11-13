import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';

const scope: any = {}; runInNewContext(readFileSync('public/market-specials.js','utf8'),scope);
const M=scope.LawlMarket, uid='11111111-1111-4111-8111-111111111111';
let db:PGlite; let seq=0;
const buy=(action:string,name='')=>db.query<any>('select lawl_market_buy(1,$1,$2,$3) r',[action,`00000000-0000-4000-8000-${String(++seq).padStart(12,'0')}`,name]);
const reset=async(gems:number)=>{await db.exec('delete from lawl_market_purchases;delete from game_saves;delete from lawl_characters;');await db.query(`insert into lawl_characters values($1,1,$2)`,[uid,{name:'Hero',voc:'knight',gems}]);await db.query('insert into game_saves values($1,1,$2,now())',[uid,{name:'Hero',voc:'knight',gems,premiumUntil:0,xp:1000}]);};
describe('marked market purchases',()=>{
 beforeAll(async()=>{
  db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
   create table game_saves(user_id uuid primary key,character_slot int,data jsonb,updated_at timestamptz);
   create table lawl_characters(user_id uuid,slot int,data jsonb);
   create table lawl_moderation(user_id uuid,suspended_until timestamptz);
   create table lawl_trades(user_a text,user_b text,status text,a_ack boolean,b_ack boolean);
   create table lawl_pvp_skulls(user_id uuid,slot int,pz_until timestamptz);
   create table lawl_house_leases(user_id uuid,slot int,house_id text,expires_at timestamptz);
   create table lawl_rank(user_id uuid,name text);
   create function lawl_is_gm() returns boolean language sql as $$select false$$;
   create function lawl_house_catalog() returns table(id text,ax int,ay int) language sql as $$select 'lawl-1',70,80$$;
   create function mirror() returns trigger language plpgsql as $$begin update lawl_characters set data=new.data where user_id=new.user_id and slot=new.character_slot;return new;end$$;
   create trigger mirror after insert or update on game_saves for each row execute function mirror();`);
  await db.exec(readdirSync('drizzle/migrations').filter(f=>f.endsWith('.sql')).sort().map(f=>readFileSync(`drizzle/migrations/${f}`,'utf8')).filter(s=>s.includes('FUNCTION public.lawl_market_buy')).pop()!);
  await db.query("select set_config('test.uid',$1,false)",[uid]);
 },30000);
 afterAll(async()=>db?.close());
 for(const [action,price] of Object.entries({xp:50,home:5,blessing:1,rename:50}))it(`Free Account buys ${action} for exactly ${price} gems`,async()=>{
  await reset(price);const r=(await buy(action,'Novo Hero')).rows[0].r;expect(r.data.gems).toBe(0);expect(r.data.premiumUntil).toBe(0);
  await reset(price-1);await expect(buy(action,'Novo Hero')).rejects.toThrow('Gemas insuficientes');
 });
 it('grants +50% EXP for an hour, expires, stacks time and Premium independently',async()=>{
  await reset(100);const first=(await buy('xp')).rows[0].r.data;const second=(await buy('xp')).rows[0].r.data;
  expect(second.xpBoostUntil-first.xpBoostUntil).toBe(3600000);
  expect(M.xp(100,first,first.xpBoostUntil-1)).toBe(150);expect(M.xp(100,first,first.xpBoostUntil)).toBe(100);
  expect(M.xp(100,{...first,premiumUntil:first.xpBoostUntil},first.xpBoostUntil-1)).toBe(225);
 });
 it('teleports to the owned rented house or temple, not into an unowned house',async()=>{
  await reset(10);expect((await buy('home')).rows[0].r.data.x).toBe(30);
  await db.query("insert into lawl_house_leases values($1,1,'lawl-1',now()+interval '1 day')",[uid]);
  const d=(await buy('home')).rows[0].r.data;expect([d.x,d.y,d.z]).toEqual([70,80,0]);
 });
 it('one-gem full package reduces normal XP loss by 56%, not 100%',()=>{
  const p={xp:1000,deathBlessings:1};expect(M.death(p,'').lost).toBe(44);expect(p.deathBlessings).toBe(0);expect(M.death(p,'').lost).toBe(100);
 });
 it('reserve charges protect successive deaths without increasing the 56% reduction',()=>{
  const p={xp:1000,deathBlessings:2};expect(M.death(p,'').lost).toBe(44);expect(p.deathBlessings).toBe(1);expect(M.death(p,'').lost).toBe(44);expect(p.deathBlessings).toBe(0);
 });
 it('red and black skulls consume a charge and reduce XP but never protect items',()=>{
  for(const skull of ['red','black']){
   const p={xp:1000,deathBlessings:1},r=M.death(p,skull);expect(r.lost).toBe(44);expect(r.protectItems).toBe(false);expect(p.deathBlessings).toBe(0);
  }
  expect(M.death({xp:1000,deathBlessings:1},'white').protectItems).toBe(true);
 });
 it('reduces accumulated skill tries and spent mana loss by 56%, respecting base levels',()=>{
  const hero=(charges:number)=>({xp:1000,deathBlessings:charges,skills:{sword:20,magic:10},tries:{sword:0,magic:0}});
  const free=hero(0),blessed=hero(1),need=()=>100;
  const a=M.death(free,'',need),b=M.death(blessed,'',need);
  expect(a.skillsLost).toEqual({sword:100,magic:100});expect(b.skillsLost).toEqual({sword:44,magic:44});
  expect(blessed.skills).toEqual({sword:19,magic:9});expect(blessed.tries).toEqual({sword:56,magic:56});
  expect(free.tries.sword).toBe(0);
  const base={xp:0,deathBlessings:1,skills:{sword:10,magic:0},tries:{sword:0,magic:0}};
  M.death(base,'',need);expect(base.skills).toEqual({sword:10,magic:0});
 });
 it('rejects invalid and duplicate names without charging',async()=>{
  await reset(100);await expect(buy('rename','GameMaster')).rejects.toThrow('reservado');await expect(buy('rename','Hero')).rejects.toThrow('reservado');
  await db.query('insert into lawl_characters values($1,2,$2)',[uid,{name:'Taken'}]);await expect(buy('rename','Taken')).rejects.toThrow('em uso');
 });
 it('retries the same request without charging twice, and guards stale saves',async()=>{
  await reset(100);const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';const call=()=>db.query<any>('select lawl_market_buy(1,\'xp\',$1) r',[id]);
  await call();expect((await call()).rows[0].r.data.gems).toBe(50);
  await db.query('update game_saves set data=$1 where user_id=$2',[{name:'Hero',gems:100,marketCursor:0},uid]);
  const d=(await db.query<any>('select data from game_saves')).rows[0].data;expect(d.gems).toBe(50);expect(d.xpBoostUntil).toBeGreaterThan(Date.now());
 });
 it('persists a consumed blessing and prevents stale saves from restoring it',async()=>{
  await reset(2);await buy('blessing');const d=(await buy('blessing')).rows[0].r.data;
  expect(d.deathBlessings).toBe(2);
  await db.query('update game_saves set data=$1 where user_id=$2',[{...d,deathBlessings:1},uid]);
  await db.query('update game_saves set data=$1 where user_id=$2',[d,uid]);
  const final=(await db.query<any>('select data from game_saves')).rows[0].data;
  expect(final.deathBlessings).toBe(1);
 });
 it('cannot buy for another account or inactive slot',async()=>{
  await reset(100);await expect(db.query("select lawl_market_buy(2,'xp',gen_random_uuid())")).rejects.toThrow('selecionado');
  await db.query("select set_config('test.uid','','false')");await expect(buy('xp')).rejects.toThrow('conta');await db.query("select set_config('test.uid',$1,false)",[uid]);
 });
 it('blocks teleport during combat and trades before charging',()=>{
  expect(M.quote({gems:5},'home',{combat:true}).ok).toBe(false);expect(M.quote({gems:5},'home',{trade:true}).ok).toBe(false);expect(M.quote({gems:5},'home',{}).ok).toBe(true);
 });
});