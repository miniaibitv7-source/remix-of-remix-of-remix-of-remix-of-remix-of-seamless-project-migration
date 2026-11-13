import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';

// Rule: the rent/key prompt only appears when the player stands ON the door tile, not next to it.
const uid='11111111-1111-4111-8111-111111111111';
const scope:any={};runInNewContext(readFileSync('public/housing.js','utf8'),scope);
let db:PGlite;
describe('house rent prompt on the door tile',()=>{
 beforeAll(async()=>{
  db=new PGlite();await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
  CREATE TABLE lawl_characters(user_id uuid,slot int,data jsonb,PRIMARY KEY(user_id,slot));
  CREATE TABLE game_saves(user_id uuid PRIMARY KEY,character_slot int,data jsonb,updated_at timestamptz);
  CREATE TABLE lawl_moderation(user_id uuid,suspended_until timestamptz);
  CREATE TABLE lawl_trades(user_a text,user_b text,status text,a_ack boolean,b_ack boolean);
  INSERT INTO lawl_characters VALUES('${uid}',1,'{}');
  INSERT INTO game_saves VALUES('${uid}',1,'{"name":"Tenant","gems":100,"x":5,"y":5,"z":0}',now());`);
  await db.exec(readFileSync('src/test/sql/house-rentals.sql','utf8'));
  await db.exec(readdirSync('drizzle/migrations').filter(f=>f.endsWith('.sql')).sort().map(f=>readFileSync(`drizzle/migrations/${f}`,'utf8')).filter(s=>s.includes('FUNCTION public.lawl_house_action')).pop()!);
  await db.query("SELECT set_config('test.uid',$1,false)",[uid]);
 },30000);
 afterAll(async()=>db.close());
 it('detects only the door tile itself, not the tile in front of it',()=>{
  const [h]=scope.LawlHousing.catalog([[23,12,4,4,'s']]);
  expect(scope.LawlHousing.onDoor(h,h.dx,h.dy)).toBe(true);
  expect(scope.LawlHousing.onDoor(h,h.ax,h.ay)).toBe(false);
 });
 it('server refuses renting from far away',async()=>{
  await expect(db.query("SELECT lawl_house_action('rent',1,'lawl-1',7)")).rejects.toThrow('porta');
 });
 it('server allows renting while standing on the door tile',async()=>{
  const d=await db.query<any>("SELECT dx,dy FROM lawl_house_catalog() WHERE id='lawl-1'");const {dx,dy}=d.rows[0];
  await db.query(`UPDATE game_saves SET data=jsonb_set(jsonb_set(data,'{x}',to_jsonb($1::int)),'{y}',to_jsonb($2::int)) WHERE user_id=$3`,[dx,dy,uid]);
  const r=await db.query<any>("SELECT lawl_house_action('rent',1,'lawl-1',7) AS r");expect(r.rows[0].r.lease.mine).toBe(true);
 });
});
