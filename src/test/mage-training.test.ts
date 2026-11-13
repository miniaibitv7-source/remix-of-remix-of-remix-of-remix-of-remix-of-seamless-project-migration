import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const game = readFileSync("public/reinos.html", "utf8");
const code =
  game.slice(game.indexOf("const SKILL_RATE="), game.indexOf("function syncSkillLevels(")) +
  game.slice(game.indexOf("function offlineTrain("), game.indexOf("function load(")) +
  ";this.offlineTrain=offlineTrain;this.trainTries=trainTries;";

type Char = { voc: string; premiumUntil: number; skills: Record<string, number>; [k: string]: unknown };
type Scope = { p: Char; offlineTrain: () => unknown; trainTries: (k: string) => number; [k: string]: unknown };

function setup(voc: string, premium: boolean, minutes: number): Scope {
  const now = Date.now();
  const scope = {
    Date, Math, Object,
    p: { voc, x: 38, y: 30, lastSeen: now - minutes * 60000, trainTime: minutes * 60, premiumUntil: premium ? now + 864e5 : 0,
      skills: { sword: 10, distance: 10, magic: 0, shielding: 10 }, tries: {} },
    SKILLS: [], clamp: (v: number, a: number, b: number) => Math.min(b, Math.max(a, v)),
    training: (x: number, y: number) => x >= 36 && x <= 41 && y >= 26 && y <= 34,
    isPremium: () => scope.p.premiumUntil > Date.now(),
  } as unknown as Scope;
  runInNewContext(code, scope);
  return scope;
}

describe("offline training for mages", () => {
  it("each dummy attack counts as 32 mana spent for magic, 1 for weapons", () => {
    const s = setup("sorcerer", false, 0);
    expect(s.trainTries("magic")).toBe(32);
    expect(s.trainTries("sword")).toBe(1);
  });
  it("sorcerer and druid gain as many magic levels offline as a knight gains sword levels", () => {
    for (const premium of [false, true]) {
      const k = setup("knight", premium, 60); k.offlineTrain();
      const gained = (k.p.skills['sword'] ?? 0) - 10;
      expect(gained).toBeGreaterThan(0);
      for (const voc of ["sorcerer", "druid"]) {
        const m = setup(voc, premium, 60); m.offlineTrain();
        expect(m.p.skills['magic']).toBe(gained);
      }
    }
  });
  it("premium (10x) trains mages faster than free (3x)", () => {
    const free = setup("druid", false, 60); free.offlineTrain();
    const prem = setup("druid", true, 60); prem.offlineTrain();
    expect(prem.p.skills['magic']).toBeGreaterThan(free.p.skills['magic'] ?? 0);
  });
});
