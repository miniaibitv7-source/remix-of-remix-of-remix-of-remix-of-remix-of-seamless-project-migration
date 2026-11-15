import { describe, expect, it } from "vitest";
import { buildWorld, flood, FREE_WALK, PREMIUM_WALK, LawlWorld, LawlHousing, game } from "./world-harness";

const s = buildWorld(), M = s.maps[0];

describe("expanded world rules", () => {
  it("removes the old Portuguese monsters from every hunting area but keeps them in the catalog", () => {
    const old = ["Rato", "Lobo", "Orc", "Esqueleto", "Dragão"];
    for (const name of old) expect(s.MON(name)).toBeTruthy();
    for (const z of s.ZONES) for (const name of [z.top, ...z.wikiTop, z.sub, ...z.wikiSub]) expect(old).not.toContain(name);
  });
  it("places every wiki monster in some hunting area", () => {
    const placed = new Set(s.ZONES.flatMap((z: any) => [z.top, ...z.wikiTop, z.sub, ...z.wikiSub]));
    const wiki = s.LawlMonsters.catalog.map((m: any) => m.name);
    expect(wiki.filter((n: string) => !placed.has(n))).toEqual([]);
  });
  it("every lure spot has room for 8 or more monsters and the areas are ordered weakest first", () => {
    for (const z of s.ZONES) for (const c of [...z.lures, ...z.luresTop].filter((c: any) => c.big)) expect(c.tiles.length).toBeGreaterThanOrEqual(8);
    expect(s.ZONES[0].rec).toBe("1–6");
  });
  it("a Free Account on foot never reaches Premium land; Premium crosses the bridge gates", () => {
    const free = flood(M, 30, 30, FREE_WALK), prem = flood(M, 30, 30, PREMIUM_WALK);
    for (let y = 0; y < LawlWorld.H; y++) for (let x = 0; x < LawlWorld.W; x++) if (free(x, y)) expect(LawlWorld.premiumAt(x, y)).toBe(false);
    for (const c of LawlWorld.cities) expect(prem(c.cx, c.cy)).toBe(true);
    expect(prem(122, 31)).toBe(true);
  });
  it("Lawl is Free; Porto Aurora, Kharum, Glacira and Umbra are Premium", () => {
    expect(LawlWorld.premiumAt(30, 30)).toBe(false);
    for (const c of [...LawlWorld.cities, LawlWorld.AURORA]) expect(LawlWorld.premiumAt(c.cx, c.cy)).toBe(true);
    for (const z of s.ZONES) expect(z.premium).toBe(z.city !== "Lawl");
  });
  it("each new city has a temple priest, depot, shops, a captain and 8 rentable houses", () => {
    const houses = LawlHousing.catalog(s.HOUSES);
    for (const c of LawlWorld.cities) {
      for (const k of ["potions", "smith", "trader", "depot", "priest"]) expect(LawlWorld.npcs.some((n: any) => n.id === `${c.id}:${k}`)).toBe(true);
      expect(LawlWorld.npcs.some((n: any) => n.id === `boat:${c.id}`)).toBe(true);
      expect(houses.filter((h: any) => h.name.endsWith(c.name))).toHaveLength(8);
      expect(M[c.cy][c.cx]).toBe(3);
    }
    expect(houses.map((h: any) => h.id).slice(22)).toEqual(Array.from({ length: 24 }, (_, i) => `lawl-${i + 23}`));
  });
  it("death and the temple scroll always return to the Lawl temple", () => {
    expect(game).toMatch(/p\.x=30;p\.y=30/);
  });
});
