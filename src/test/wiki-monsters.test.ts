import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

// Official roster: https://www.lawlmmorpg.com/wiki/monsters (147 monsters, compared page by page on 2026-11-13).
const scope: any = {};
runInNewContext(readFileSync("public/monsters.js", "utf8"), scope);
runInNewContext(readFileSync("public/spells.js", "utf8"), scope);
const M = scope.LawlMonsters, S = scope.LawlSpells;
const game = readFileSync("public/reinos.html", "utf8");
const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };
const ab = (name: string, ability: string) => M.get(name).abilities.find((a: any) => a.name === ability);

describe("wiki monster catalog", () => {
  it("has the 147 official monsters, each with sprite, wiki page and abilities", () => {
    expect(M.catalog.length).toBe(147);
    expect(new Set(M.catalog.map((t: any) => t.name)).size).toBe(147);
    for (const t of M.catalog) {
      expect(t.official).toBe(true);
      expect(t.sprite).toHaveLength(4);
      expect(t.source).toBe(`https://www.lawlmmorpg.com/wiki/monster/${t.name.replace(/ /g, "_")}`);
      expect(t.abilities.some((a: any) => a.shape === "melee")).toBe(true);
    }
  });
  it("keeps the wiki specs: Dragon 1,000 HP, 700 EXP, 350 speed, immune to fire", () => {
    const d = M.get("Dragon");
    expect([d.hp, d.xp, d.speed, d.flee, d.seeInvisible]).toEqual([1000, 700, 350, true, true]);
    expect(d.res).toEqual({ phys: 1.15, energy: 1.1, fire: 0, ice: 1.15 });
    expect(ab("Dragon", "Fire Wave")).toMatchObject({ min: 150, max: 210, el: "fire" });
    expect([M.get("Bat").hp, M.get("Bat").xp]).toEqual([55, 50]);
    expect([M.get("Ahamon").hp, M.get("Ahamon").xp]).toEqual([9150, 7150]);
    expect([M.get("Aharon").hp, M.get("Aharon").xp]).toEqual([30000, 1]);
  });
  it("reads single-number wiki loot quantities as the amount, not part of the name", () => {
    for (const t of M.catalog) for (const d of t.drops) expect(d.name).not.toMatch(/^\(/);
    expect(M.get("Panther").drops.find((d: any) => d.name === "Large Mana Potion")).toMatchObject({ min: 3, max: 3 });
    for (const n of ["Energy Expertise", "Ominous"])
      expect(M.get(n).drops.find((d: any) => d.name === "Crude Red Stone")).toMatchObject({ min: 4, max: 4 });
  });
  it("GM spawn list covers the 22 older monsters plus the 147 wiki monsters", () => {
    expect(M.COUNT).toBe(169);
  });
});

describe("wiki monster spawns", () => {
  it("places every wiki monster in exactly one of the 8 Lawl hunting areas, weakest first", () => {
    const zones = Array.from({ length: 8 }, () => ({} as any));
    M.populate(zones);
    const all = zones.flatMap((z) => [...(z.wikiTop || []), ...(z.wikiSub || [])]);
    expect(all.length).toBe(147);
    expect(new Set(all).size).toBe(147);
    const zoneOf = (n: string) => zones.findIndex((z) => [...(z.wikiTop || []), ...(z.wikiSub || [])].includes(n));
    expect(zoneOf("Bat")).toBe(0);
    expect(zoneOf("Aharon")).toBe(7);
  });
});

describe("wiki monster combat", () => {
  it("every attack rolls inside the published damage range", () => {
    for (const t of M.catalog) {
      for (const r of [0, 0.5, 0.9999999]) {
        const m: any = { t, hp: t.hp - 1 };
        for (const e of M.tick(m, 99, true, true, () => r)) {
          if (e.min == null) expect(e.damage).toBe(0);
          else { expect(e.damage).toBeGreaterThanOrEqual(e.min); expect(e.damage).toBeLessThanOrEqual(e.max); }
        }
      }
    }
    const m: any = { t: M.get("Dragon"), hp: 1000 };
    const wave = M.tick(m, 99, true, true, () => 0.9999999).find((e: any) => e.name === "Fire Wave");
    expect(wave.damage).toBe(210);
  });
  it("does not attack when idle, heals only when hurt, and only the host runs support abilities", () => {
    const t = M.get("Dragon");
    expect(M.tick({ t, hp: 500 }, 99, false, true, Math.random)).toEqual([]);
    expect(M.tick({ t, hp: 1000 }, 99, true, true, Math.random).some((e: any) => e.kind === "heal")).toBe(false);
    expect(M.tick({ t, hp: 500 }, 99, true, true, Math.random).some((e: any) => e.kind === "heal")).toBe(true);
    expect(M.tick({ t, hp: 500 }, 99, true, false, Math.random).every((e: any) => e.kind === "attack")).toBe(true);
  });
  it("armor and shielding reduce physical hits only; elements use the player's resistances", () => {
    const id = (d: number) => d;
    const knight = (raw: number, el: string) => M.mitigate(raw, el, 40, 30, id, id, id);
    const mage = (raw: number, el: string) => M.mitigate(raw, el, 10, 8, id, id, id);
    expect(knight(150, "phys")).toBe(110);
    expect(mage(150, "phys")).toBe(140);
    expect(knight(210, "fire")).toBe(210);
    expect(mage(210, "fire")).toBe(210);
    expect(knight(20, "phys")).toBe(0);
    expect(M.mitigate(210, "fire", 0, 0, (d: number) => Math.round(d * 0.9), id, id)).toBe(189);
  });
  it("melee needs an adjacent target, spells reach 7 tiles, waves only hit in front", () => {
    const m: any = { x: 10, y: 10, _aim: [1, 0] };
    const melee = ab("Dragon", "Melee"), ball = ab("Dragon", "Fire Ball"), wave = ab("Dragon", "Fire Wave");
    expect(M.hits(melee, m, { x: 11, y: 11 })).toBe(true);
    expect(M.hits(melee, m, { x: 12, y: 10 })).toBe(false);
    expect(M.hits(ball, m, { x: 17, y: 10 })).toBe(true);
    expect(M.hits(ball, m, { x: 18, y: 10 })).toBe(false);
    expect(M.hits(wave, m, { x: 13, y: 10 })).toBe(true);
    expect(M.hits(wave, m, { x: 7, y: 10 })).toBe(false);
  });
  it("heal is capped at max HP and invisibility hides the monster for 4 seconds", () => {
    const m: any = { t: M.get("Dragon"), hp: 950 };
    M.support(m, { kind: "heal", damage: 180 }, 0);
    expect(m.hp).toBe(1000);
    M.support(m, { kind: "invisible" }, 1000);
    expect(M.hidden(m, 4999)).toBe(true);
    expect(M.hidden(m, 5000)).toBe(false);
  });
  it("player hits use the wiki resistances (Dragon takes no fire damage)", () => {
    expect(S.resist("Dragon", "fire")).toBe(0);
    expect(S.resist("Dragon", "phys")).toBe(1.15);
    expect(S.resistMix("Dragon", 100, { fire: 100 })).toBe(0);
  });
  it("always drops the gold range and other loot only on the 10% roll", () => {
    const t = M.get("Dragon");
    const miss = M.loot(t, seq(0.5));
    expect(miss.map((d: any) => d.name)).toEqual(["Gold", "Platinum"]);
    const gold = miss[0].n;
    expect(gold).toBeGreaterThanOrEqual(66);
    expect(gold).toBeLessThanOrEqual(125);
    expect(M.loot(t, seq(0.05)).length).toBe(t.drops.length);
  });
});

describe("wiki monster effects in the game", () => {
  it("paralyze slows the player down and haste speeds them up", () => {
    const start = game.indexOf("function playerStepMs(");
    const src = game.slice(start, game.indexOf("\n", start));
    const s: any = { isGM: () => false, stepMsWithBonus: () => 300, mountSpeed: () => 0, gearSpeed: () => 0, p: { hasteUntil: 10, hasteMul: 0.6 } };
    runInNewContext(src, s);
    expect(s.playerStepMs(5000)).toBe(500);
    s.p.hasteMul = 1.5;
    expect(s.playerStepMs(5000)).toBe(200);
    s.p.hasteUntil = 0;
    expect(s.playerStepMs(5000)).toBe(300);
  });
  it("shared monster updates carry invisibility to the other players", () => {
    const a = game.indexOf("const hpOf=m=>"), b = game.indexOf("function players(");
    const c = game.indexOf("const setInv="), d = game.indexOf("function applyFull(");
    const s: any = { MON: (n: string) => (n === "Dragon" ? M.get("Dragon") : null), Date: { now: () => 1000 } };
    runInNewContext(game.slice(a, b) + game.slice(c, d) + ";this.mobRow=mobRow;this.mobKey=mobKey;this.mkMob=mkMob;", s);
    const host = { id: 7, z: 0, zone: 7, t: M.get("Dragon"), x: 3, y: 4, hp: 900, invisibleUntil: 5000 };
    const row = s.mobRow(host);
    expect(row).toEqual([7, 0, 7, "Dragon", 3, 4, 900, 4000]);
    expect(s.mobKey(host)).not.toBe(s.mobKey({ ...host, invisibleUntil: 0 }));
    const copy = s.mkMob(row);
    expect(copy.invisibleUntil).toBe(5000);
    expect(s.mkMob([7, 0, 7, "Dragon", 3, 4, 900, 0], copy).invisibleUntil).toBe(0);
  });
});
