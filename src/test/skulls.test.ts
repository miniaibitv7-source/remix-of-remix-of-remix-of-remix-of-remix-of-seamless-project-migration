import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

type Hero = { hp: number; mp: number; gold: number; gems: number; bag: unknown[]; equip: Record<string, unknown>; loot: Record<string, number>; hpPot: number; mpPot: number; depot: { items: unknown[] } };
type Skulls = {
  canAttack: (o: { mine?: string; theirs?: string; secure?: boolean }) => { ok: boolean; justified?: boolean };
  damage: (raw: number, o?: { shielding?: number; def?: number; black?: boolean }) => number;
  deathPenalty: (p: Hero, mark: string) => { lost: boolean; black: boolean };
};
const scope = {} as { LawlSkulls: Skulls };
runInNewContext(readFileSync("public/skulls.js", "utf8"), scope);
const sk = scope.LawlSkulls;
const hero = (): Hero => ({ hp: 300, mp: 200, gold: 900, gems: 15, bag: [{ name: "Espada" }], equip: { armor: { name: "Cota" } }, loot: { Teia: 4 }, hpPot: 3, mpPot: 2, depot: { items: [{ name: "Escudo" }] } });

describe("skull rules in the game", () => {
  it("secure mode blocks attacks on unmarked players only", () => {
    expect(sk.canAttack({ theirs: "", secure: true }).ok).toBe(false);
    expect(sk.canAttack({ theirs: "white", secure: true })).toEqual({ ok: true, justified: true });
    expect(sk.canAttack({ theirs: "", secure: false })).toEqual({ ok: true, justified: false });
  });

  it("black skull cannot attack unmarked players even with secure mode off", () => {
    expect(sk.canAttack({ mine: "black", theirs: "", secure: false }).ok).toBe(false);
    expect(sk.canAttack({ mine: "black", theirs: "yellow", secure: false }).ok).toBe(true);
  });

  it("player damage is halved, but full against a black skull", () => {
    expect(sk.damage(100)).toBe(50);
    expect(sk.damage(100, { black: true })).toBe(100);
  });

  it("red skull death loses carried items but keeps gold, gems and depot", () => {
    const p = hero();
    sk.deathPenalty(p, "red");
    expect(p.bag).toEqual([]);
    expect(p.equip).toEqual({});
    expect(p.loot).toEqual({});
    expect(p.hpPot + p.mpPot).toBe(0);
    expect([p.gold, p.gems, p.depot.items.length]).toEqual([900, 15, 1]);
  });

  it("black skull death respawns with at most 40 health and no mana", () => {
    const p = hero();
    sk.deathPenalty(p, "black");
    expect([p.hp, p.mp]).toEqual([40, 0]);
  });

  it("white skull death keeps all items", () => {
    const p = hero();
    expect(sk.deathPenalty(p, "white").lost).toBe(false);
    expect(p.bag.length).toBe(1);
  });
});
