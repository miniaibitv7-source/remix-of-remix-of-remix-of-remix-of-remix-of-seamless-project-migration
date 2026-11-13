import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';

const uid='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222';
let db:PGlite;
const scope:any={};runInNewContext(readFileSync('public/housing.js','utf8'),scope);
describe('house gem rentals',()=>{
 beforeAll(async()=>{
 db=new PGlite();await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE TABLE lawl_characters(user_id uuid,slot int,data jsonb,PRIMARY KEY(user_id,slot));
 CREATE TABLE game_saves(user_id uuid PRIMARY KEY,character_slot int,data jsonb,updated_at timestamptz);
 CREATE TABLE lawl_moderation(user_id uuid,suspended_until timestamptz);
 CREATE TABLE lawl_trades(user_a text,user_b text,status text,a_ack boolean,b_ack boolean);
 INSERT INTO lawl_characters VALUES('${uid}',1,'{}'),('${uid}',2,'{}'),('${other}',1,'{}');
 INSERT INTO game_saves VALUES('${uid}',1,'{"name":"Tenant","gems":100,"x":25,"y":16,"z":0}',now()),('${other}',1,'{"gems":100,"x":25,"y":16,"z":0}',now());`);
 await db.exec(readFileSync('src/test/sql/house-rentals.sql','utf8'));await db.query("SELECT set_config('test.uid',$1,false)",[uid]);
 },30000);
 afterAll(async()=>db.close());
 it('calculates gem prices from usable interior SQM',()=>{const h=scope.LawlHousing.catalog([[23,12,4,4,'s'],[50,25,5,4,'w']]);expect(h[0].sqm).toBe(4);expect(scope.LawlHousing.price(h[0],7)).toBe(4);expect(scope.LawlHousing.price(h[0],30)).toBe(16);expect(h[1].sqm).toBe(6);expect(scope.LawlHousing.price(h[1],30)).toBe(24)});
 it('charges weekly rent atomically and issues a slot-specific key',async()=>{const r=await db.query<any>("SELECT lawl_house_action('rent',1,'lawl-1',7) AS r");expect(r.rows[0].r.gems).toBe(96);expect(r.rows[0].r.lease.mine).toBe(true);const d=await db.query<any>("SELECT round(extract(epoch FROM expires_at-now())/86400)::int AS days FROM lawl_house_leases");expect(d.rows[0].days).toBe(7)});
 it('extends a monthly renewal by 30 days and charges 4 gems per SQM',async()=>{const r=await db.query<any>("SELECT lawl_house_action('rent',1,'lawl-1',30) AS r");expect(r.rows[0].r.gems).toBe(80);const d=await db.query<any>("SELECT round(extract(epoch FROM expires_at-now())/86400)::int AS days FROM lawl_house_leases");expect(d.rows[0].days).toBe(37)});
 it('preserves payment when a stale save is submitted',async()=>{await db.query(`UPDATE game_saves SET data='{"gems":100,"x":25,"y":16,"z":0}' WHERE user_id=$1`,[uid]);const r=await db.query<any>('SELECT data FROM game_saves WHERE user_id=$1',[uid]);expect(r.rows[0].data.gems).toBe(80)});
 it('rejects entry and renting by another player',async()=>{await db.query("SELECT set_config('test.uid',$1,false)",[other]);await expect(db.query("SELECT lawl_house_action('enter',1,'lawl-1')")).rejects.toThrow('chave válida');await expect(db.query("SELECT lawl_house_action('rent',1,'lawl-1',7)")).rejects.toThrow('já está alugada');await db.query("SELECT set_config('test.uid',$1,false)",[uid])});
 it('opens only the rented door',async()=>{const r=await db.query<any>("SELECT lawl_house_action('enter',1,'lawl-1') AS r");expect(r.rows[0].r.x).toBe(25);expect(r.rows[0].r.y).toBe(14);await expect(db.query("SELECT lawl_house_action('enter',1,'lawl-2')")).rejects.toThrow('frente à porta')});
 it('revokes keys on expiry and ejects expired interior saves',async()=>{await db.query("UPDATE lawl_house_leases SET expires_at=now()-interval '1 second'");await expect(db.query("SELECT lawl_house_action('enter',1,'lawl-1')")).rejects.toThrow('chave válida');await db.query('UPDATE game_saves SET data=data WHERE user_id=$1',[uid]);const r=await db.query<any>('SELECT data FROM game_saves WHERE user_id=$1',[uid]);expect(r.rows[0].data.y).toBe(16);expect(scope.LawlHousing.valid({mine:true,expires:'2000-01-01'},Date.now())).toBe(false)});
 it('rejects insufficient gems without creating a lease',async()=>{await db.query(`UPDATE game_saves SET data=jsonb_set(data,'{gems}','0') WHERE user_id=$1`,[uid]);await expect(db.query("SELECT lawl_house_action('rent',1,'lawl-1',7)")).rejects.toThrow('Gemas insuficientes')});
 it('rejects inactive character slots',async()=>{await expect(db.query("SELECT lawl_house_action('list',2)")).rejects.toThrow('Reabra seu personagem')});
 it('rejects anonymous callers',async()=>{await db.query("SELECT set_config('test.uid','',false)");await expect(db.query("SELECT lawl_house_action('list',1)")).rejects.toThrow('Entre no jogo')});
});