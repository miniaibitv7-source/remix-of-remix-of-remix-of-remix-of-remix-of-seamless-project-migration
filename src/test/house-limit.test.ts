import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Runs the latest house rental migration on top of the frozen rental fixture.
const uid = "11111111-1111-4111-8111-111111111111";
let db: PGlite;
const latest = () => readdirSync("drizzle/migrations").filter((f) => f.endsWith(".sql")).sort()
  .map((f) => readFileSync(`drizzle/migrations/${f}`, "utf8")).filter((s) => s.includes("FUNCTION public.lawl_house_action")).pop()!;
const standAt = (slot: number, x: number, y: number) =>
  db.query(`UPDATE game_saves SET character_slot=$1, data=jsonb_build_object('name','Tenant','gems',500,'x',$2::int,'y',$3::int,'z',0) WHERE user_id=$4`, [slot, x, y, uid]);
const rent = (slot: number, house: string) => db.query(`SELECT lawl_house_action('rent',$1,$2,7) AS r`, [slot, house]);

describe("one house per character", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
      CREATE TABLE lawl_characters(user_id uuid,slot int,data jsonb,PRIMARY KEY(user_id,slot));
      CREATE TABLE game_saves(user_id uuid PRIMARY KEY,character_slot int,data jsonb,updated_at timestamptz);
      CREATE TABLE lawl_moderation(user_id uuid,suspended_until timestamptz);
      CREATE TABLE lawl_trades(user_a text,user_b text,status text,a_ack boolean,b_ack boolean);
      INSERT INTO lawl_characters VALUES('${uid}',1,'{}'),('${uid}',2,'{}');
      INSERT INTO game_saves VALUES('${uid}',1,'{"name":"Tenant","gems":500,"x":27,"y":11,"z":0}',now());`);
    await db.exec(readFileSync("src/test/sql/house-rentals.sql", "utf8"));
    await db.exec(latest());
    await db.query("SELECT set_config('test.uid',$1,false)", [uid]);
  }, 30000);
  afterAll(async () => { await db.close(); });

  it("lets a character rent its first house", async () => {
    await standAt(1, 27, 11);
    await expect(rent(1, "lawl-1")).resolves.toBeTruthy();
  });

  it("refuses a second house for the same character", async () => {
    await standAt(1, 27, 13);
    await expect(rent(1, "lawl-2")).rejects.toThrow("apenas 1 casa");
  });

  it("still lets the character renew its own house", async () => {
    await standAt(1, 27, 11);
    await expect(rent(1, "lawl-1")).resolves.toBeTruthy();
  });

  it("lets another character of the same account rent its own house", async () => {
    await standAt(2, 27, 13);
    await expect(rent(2, "lawl-2")).resolves.toBeTruthy();
  });

  it("allows a new house once the old lease has expired", async () => {
    await db.query("UPDATE lawl_house_leases SET expires_at=now()-interval '1 second' WHERE house_id='lawl-1'");
    await standAt(1, 36, 11);
    await expect(rent(1, "lawl-3")).resolves.toBeTruthy();
  });
});
