import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Runs the guild migration (found by content, since Lovable names migration files) on a small stub of the game tables.
const guildSql = () => {
  if (process.env["LAWL_GUILD_SQL"]) return readFileSync(process.env["LAWL_GUILD_SQL"], "utf8");
  const sql = readdirSync("drizzle/migrations").filter((f) => f.endsWith(".sql")).sort()
    .map((f) => readFileSync(`drizzle/migrations/${f}`, "utf8")).filter((s) => s.includes("FUNCTION public.lawl_guild_action")).pop();
  // Until the guild change is applied to the database, the tests run its saved draft.
  return sql ?? readFileSync("src/test/sql/guild-system.sql", "utf8");
};
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const leader = id(1), vice = id(2), member = id(3), outsider = id(4), poor = id(5);
let db: PGlite;
const as = (u: string) => db.query("SELECT set_config('test.uid',$1,false)", [u]);
const act = async (u: string, action: string, data: Record<string, unknown> = {}) => {
  await as(u);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await db.query<{ r: any }>("SELECT public.lawl_guild_action($1,1,$2) AS r", [action, data]);
  return r.rows[0]!.r;
};
const hero = async (u: string, name: string, gems: number) => {
  const d = { name, voc: "knight", level: 20, gems };
  await db.query("INSERT INTO lawl_characters VALUES($1,1,$2,now())", [u, d]);
  await db.query("INSERT INTO game_saves VALUES($1,1,$2,now())", [u, d]);
};
const gems = async (u: string) => Number((await db.query<{ g: string }>("SELECT data->>'gems' AS g FROM game_saves WHERE user_id=$1", [u])).rows[0]!.g);

describe("guilds", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
      CREATE FUNCTION public.lawl_jnum(v jsonb) RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN jsonb_typeof(v)='number' THEN (v#>>'{}')::numeric END $$;
      CREATE FUNCTION public.lawl_jint(v jsonb, lo bigint, hi bigint) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT coalesce(public.lawl_jnum(v)=trunc(public.lawl_jnum(v)) AND public.lawl_jnum(v) BETWEEN lo AND hi,false) $$;
      CREATE TABLE lawl_characters(user_id uuid, slot int, data jsonb, updated_at timestamptz, PRIMARY KEY(user_id,slot));
      CREATE TABLE game_saves(user_id uuid PRIMARY KEY, character_slot int, data jsonb, updated_at timestamptz);
      CREATE TABLE lawl_moderation(user_id uuid PRIMARY KEY, muted_until timestamptz, suspended_until timestamptz);
      CREATE TABLE lawl_trades(user_a text, user_b text, status text, a_ack boolean, b_ack boolean);
      CREATE TABLE lawl_market_purchases(id uuid PRIMARY KEY, seq bigint GENERATED ALWAYS AS IDENTITY UNIQUE, user_id uuid, slot int, action text CONSTRAINT lawl_market_purchases_action_check CHECK (action IN ('xp','home','blessing','rename')), cost int, result jsonb DEFAULT '{}');
      CREATE TABLE lawl_chat_blocks(user_id uuid, blocked_id uuid);
      CREATE TABLE lawl_chat_reports(id bigint GENERATED ALWAYS AS IDENTITY, reporter_id uuid, message_id bigint, reason text, UNIQUE(reporter_id,message_id));
      CREATE TABLE lawl_chat_messages(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, user_id uuid NOT NULL, slot int NOT NULL, name text NOT NULL,
        channel text NOT NULL CONSTRAINT lawl_chat_messages_channel_check CHECK (channel IN ('local','world','help','advertising','private')),
        recipient_id uuid, recipient_slot int, recipient_name text, body text NOT NULL, x int NOT NULL, y int NOT NULL, z int NOT NULL, created_at timestamptz NOT NULL DEFAULT now());`);
    await db.exec(guildSql());
    await hero(leader, "Arthur", 600); await hero(vice, "Bia", 0); await hero(member, "Caio", 0);
    await hero(outsider, "Duda", 0); await hero(poor, "Edu", 499);
  }, 30000);
  afterAll(async () => { await db.close(); });

  it("refuses to create a guild with less than 500 gems", async () => {
    await expect(act(poor, "create", { name: "Pobres" })).rejects.toThrow("500 gemas");
    expect(await gems(poor)).toBe(499);
  });

  it("creating a guild costs 500 gems and makes the creator its leader", async () => {
    const s = await act(leader, "create", { name: "Cavaleiros de Lawl" });
    expect(s.guild.name).toBe("Cavaleiros de Lawl");
    expect(s.me.rank).toBe("leader");
    expect(await gems(leader)).toBe(100);
    expect(s.gems).toBe(100);
  });

  it("refuses a guild name that is already taken", async () => {
    await hero(id(9), "Fabi", 900);
    await expect(act(id(9), "create", { name: "cavaleiros de lawl" })).rejects.toThrow("Já existe");
  });

  it("invited players see the invitation and join as members", async () => {
    await act(leader, "invite", { name: "bia" });
    await act(leader, "invite", { name: "Caio" });
    const inv = await act(vice, "state");
    expect(inv.invitations[0].name).toBe("Cavaleiros de Lawl");
    const s = await act(vice, "accept", { guild: inv.invitations[0].guild });
    expect(s.me.rank).toBe("member");
    await act(member, "accept", { guild: inv.invitations[0].guild });
  });

  it("only the leader promotes to vice-leader", async () => {
    await expect(act(member, "promote", { user: vice, slot: 1 })).rejects.toThrow("Só o líder");
    const s = await act(leader, "promote", { user: vice, slot: 1 });
    expect(s.members.find((m: { name: string }) => m.name === "Bia").rank).toBe("vice");
  });

  it("members cannot invite, vice-leaders can", async () => {
    await expect(act(member, "invite", { name: "Duda" })).rejects.toThrow("líder e os vice");
    const s = await act(vice, "invite", { name: "Duda" });
    expect(s.invites.map((i: { name: string }) => i.name)).toContain("Duda");
  });

  it("a vice-leader can kick members but not other vice-leaders or the leader", async () => {
    await expect(act(vice, "kick", { user: leader, slot: 1 })).rejects.toThrow("não pode expulsar");
    const gid = (await act(outsider, "state")).invitations[0].guild;
    await act(outsider, "accept", { guild: gid });
    await act(vice, "kick", { user: outsider, slot: 1 });
    expect((await act(outsider, "state")).guild).toBeNull();
  });

  it("the leader cannot leave without passing leadership; members can leave", async () => {
    await expect(act(leader, "leave")).rejects.toThrow("Transfira a liderança");
    await act(member, "leave");
    expect((await act(member, "state")).guild).toBeNull();
  });

  it("passing leadership turns the old leader into a vice-leader", async () => {
    const s = await act(leader, "transfer", { user: vice, slot: 1 });
    expect(s.me.rank).toBe("vice");
    expect(s.members.find((m: { name: string }) => m.name === "Bia").rank).toBe("leader");
    await act(vice, "transfer", { user: leader, slot: 1 });
  });

  it("a guild holds at most 200 members", async () => {
    const gid = (await act(leader, "state")).guild.id;
    const count = Number((await db.query<{ n: string }>("SELECT count(*) AS n FROM lawl_guild_members WHERE guild_id=$1", [gid])).rows[0]!.n);
    for (let i = 0; i < 200 - count; i++) {
      const u = id(1000 + i);
      await db.query("INSERT INTO lawl_characters VALUES($1,1,$2,now())", [u, { name: `Filler${i}` }]);
      await db.query("INSERT INTO lawl_guild_members(user_id,slot,guild_id) VALUES($1,1,$2)", [u, gid]);
    }
    await expect(act(leader, "invite", { name: "Caio" })).rejects.toThrow("200 de 200");
    await db.query("INSERT INTO lawl_guild_invites(guild_id,user_id,slot) VALUES($1,$2,1)", [gid, member]);
    await expect(act(member, "accept", { guild: gid })).rejects.toThrow("200 de 200");
    await db.query("DELETE FROM lawl_guild_members WHERE guild_id=$1 AND user_id>=$2", [gid, id(1000)]);
  });

  it("guild chat is only readable by members of the same guild", async () => {
    await as(leader);
    await db.query("SELECT public.lawl_chat_send(1,'guild','olá guilda','')");
    await as(vice);
    expect((await db.query("SELECT * FROM public.lawl_chat_read(1,'guild',0)")).rows).toHaveLength(1);
    await as(outsider);
    expect((await db.query("SELECT * FROM public.lawl_chat_read(1,'guild',0)")).rows).toHaveLength(0);
    await expect(db.query("SELECT public.lawl_chat_send(1,'guild','oi','')")).rejects.toThrow("não está em uma guilda");
  });

  it("when the leader's character is deleted the vice-leader takes over", async () => {
    await db.query("DELETE FROM lawl_characters WHERE user_id=$1", [leader]);
    const s = await act(vice, "state");
    expect(s.me.rank).toBe("leader");
  });
});
