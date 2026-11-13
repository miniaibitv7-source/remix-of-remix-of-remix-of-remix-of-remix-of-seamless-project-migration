import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const scope: any = {};
runInNewContext(readFileSync("public/spells.js", "utf8"), scope);
const S = scope.LawlSpells;
const words = (voc: string) => S.forVoc(voc).map((s: any) => s.w);

describe("Tibia spell catalog", () => {
  it("has 134 spells for the 4 vocations and none for Monk", () => {
    expect(S.SPELLS.length).toBe(134);
    expect(S.forVoc("knight").length).toBe(36);
    expect(S.forVoc("paladin").length).toBe(39);
    expect(S.forVoc("sorcerer").length).toBe(52);
    expect(S.forVoc("druid").length).toBe(52);
    expect(S.forVoc("monk").length).toBe(0);
  });
  it("knight loses exura and heals with exura ico", () => {
    expect(words("knight")).not.toContain("exura");
    expect(words("knight")).toContain("exura ico");
  });
  it("exori con now needs level 23", () => {
    expect(S.BY_WORDS.get("exori con").lv).toBe(23);
  });
  it("wheel spells listed as level 1 on the wiki start at level 150", () => {
    expect(S.BY_WORDS.get("exori amp kor").lv).toBe(150);
    expect(S.BY_WORDS.get("exevo ulus frigo").lv).toBe(150);
  });
  it("level 300 passives have no words to cast", () => {
    const pas = S.SPELLS.filter((s: any) => s.k === "passive");
    expect(pas.length).toBe(6);
    pas.forEach((s: any) => { expect(s.lv).toBe(300); expect(S.parse(s.w)).toBeNull(); });
  });
  it("uses separate exhaustion: attack 2s, healing 1s, support 2s", () => {
    expect(S.GROUP_CD).toEqual({ atk: 2, heal: 1, sup: 2 });
  });
  it("reads names after the spell words", () => {
    const r = S.parse('exura sio "Maria Clara');
    expect(r.spell.w).toBe("exura sio");
    expect(r.param).toBe("Maria Clara");
    expect(S.parse("exori gran ico").spell.w).toBe("exori gran ico");
  });
});

describe("monster weaknesses and immunities", () => {
  it("dragon is immune to fire", () => { expect(S.resist("Dragão", "fire")).toBe(0); });
  it("undead are weak to holy", () => {
    for (const n of ["Esqueleto", "Múmia", "Vampiro"]) expect(S.resist(n, "holy")).toBeGreaterThan(1);
  });
});

describe("spell effects", () => {
  it("magic shield pays damage with mana until mana or capacity runs out", () => {
    expect(S.absorb(100, 30, 500)).toEqual({ hp: 70, mp: 30, cap: 470 });
    expect(S.absorb(100, 500, 40)).toEqual({ hp: 60, mp: 40, cap: 0 });
  });
  it("blood rage and protector change damage dealt and received", () => {
    const now = 10;
    const rage = S.mods({ buffs: { bloodrage: 20 } }, now, null);
    expect(rage.taken).toBeCloseTo(1.15);
    expect(S.skill(40, "sword", rage)).toBe(50);
    const prot = S.mods({ buffs: { protector: 20 } }, now, null);
    expect(prot.taken).toBeCloseTo(0.85);
    expect(prot.dealt).toBeCloseTo(0.85);
    expect(S.mods({ buffs: { protector: 5 } }, now, null).taken).toBe(1);
  });
  it("avatars give 35% more damage and 15% less damage taken", () => {
    const m = S.mods({ buffs: { avatar: 99 } }, 1, null);
    expect(m.dealt).toBeCloseTo(1.35);
    expect(m.taken).toBeCloseTo(0.85);
  });
  it("divine empowerment field only boosts damage inside its 3x3 area", () => {
    const fx = { buffs: {}, field: { x: 10, y: 10, z: 0, until: 99 } };
    expect(S.mods(fx, 1, { x: 11, y: 9, z: 0 }).dealt).toBeCloseTo(1.25);
    expect(S.mods(fx, 1, { x: 12, y: 10, z: 0 }).dealt).toBe(1);
  });
  it("front sweep hits the 3 squares in front of the caster", () => {
    expect(S.cells({ t: "front" }, "north")).toEqual([[-1, -1], [0, -1], [1, -1]]);
  });
  it("groundshaker hits 37 squares around the caster", () => {
    expect(S.cells({ t: "circle", T: 10 }, "south").length).toBe(37);
  });
  it("monster conditions come only from monsters that cause them", () => {
    expect(S.monsterCond("Aranha", 10, 0).cond).toBe("poison");
    expect(S.monsterCond("Aranha", 10, 0.5)).toBeNull();
    expect(S.monsterCond("Rato", 10, 0)).toBeNull();
  });
  it("gift of life recharges after 1 hour", () => {
    expect(S.giftReady(0, 1000)).toBe(true);
    expect(S.giftReady(1000, 1000 + 3599999)).toBe(false);
    expect(S.giftReady(1000, 1000 + 3600000)).toBe(true);
  });
});
