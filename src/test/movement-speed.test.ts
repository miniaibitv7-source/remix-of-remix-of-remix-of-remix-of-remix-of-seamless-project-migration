import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const game = readFileSync("public/reinos.html", "utf8");
function setup(level = 1, gm = false) {
  const scope = {
    p: { level, hasteUntil: 0, x: 1, y: 1, dir: "south", premiumUntil: 0 },
    isGM: () => gm,
    characterSpeed: (_level: number) => 0,
    normalStepMs: (_level: number) => 0,
    playerStepMs: (_now: number) => 0,
    remoteStepMs: (_o: object) => 0,
  };
  runInNewContext(game.slice(game.indexOf("function characterSpeed("), game.indexOf("function equipStat(")), scope);
  return scope;
}
describe("level-based player movement", () => {
  it("starts at 110 speed and reaches the 1200 cap at level 1200", () => {
    const s = setup();
    expect([1, 2, 100, 200, 600].map(s.characterSpeed)).toEqual([110, 111, 200, 291, 655]);
    expect(s.characterSpeed(1199)).toBeLessThan(1200);
    expect(s.characterSpeed(1200)).toBe(1200);
  });
  it("never raises speed above 1200 after level 1200", () => {
    const s = setup();
    expect([1201, 1500, 10000].map(s.characterSpeed)).toEqual([1200, 1200, 1200]);
  });
  it("reduces straight step duration with evolved levels", () => {
    const s = setup();
    expect([1, 50, 100, 200].map(s.normalStepMs)).toEqual([682, 484, 375, 258]);
    expect(s.normalStepMs(1200)).toBe(63);
    expect(s.normalStepMs(10000)).toBe(63);
  });
  it("applies the same progression to free and premium characters", () => {
    const s = setup(100);
    expect(s.playerStepMs(1000)).toBe(375);
    s.p.premiumUntil = Date.now() + 86400000;
    expect(s.playerStepMs(1000)).toBe(375);
    s.p.level = 200;
    expect(s.playerStepMs(1000)).toBe(258);
  });
  it("preserves haste as a temporary bonus on level-derived timing", () => {
    const s = setup(100);
    s.p.hasteUntil = 10;
    expect(s.playerStepMs(1000)).toBeCloseTo(375 * 85 / 150);
    expect(s.playerStepMs(10000)).toBe(375);
  });
  it("leaves GameMaster timing unchanged", () => {
    const s = setup(3341, true);
    expect(s.playerStepMs(1000)).toBe(150);
    s.p.hasteUntil = 10;
    expect(s.playerStepMs(1000)).toBe(85);
  });
  it("uses transmitted timing and supports legacy remote players", () => {
    const s = setup();
    expect(s.remoteStepMs({ level: 100 })).toBe(375);
    expect(s.remoteStepMs({ level: 100, moveMs: 150 })).toBe(150);
    expect(s.remoteStepMs({ level: 100, moveMs: -1 })).toBe(375);
  });
  it("gates manual and automatic movement on the same level-derived duration", () => {
    for (const level of [1, 100]) {
      const s = setup(level);
      const interval = s.playerStepMs(0);
      const scope = { ...s, now: interval - 1, lastMove: 0, autoAt: 0, move: [1, 0],
        walkable: () => true, occupied: () => false };
      const start = game.indexOf(" {const base=playerStepMs(now),");
      const end = game.indexOf(" checkStairs();", start);
      runInNewContext(game.slice(start, end), scope);
      expect(scope.p.x).toBe(1);
      scope.now = interval;
      runInNewContext(game.slice(start, end), scope);
      expect(scope.p.x).toBe(2);

      const auto = { ...s, p: { ...s.p, x: 1 }, autoPath: [[2, 1], [3, 1]], autoDest: [3, 1], pendingTalk: null,
        autoAt: 0, move: [0, 0], modalKind: "", performance: { now: () => interval - 1 },
        walkable: () => true, occupied: () => false, checkStairs: () => {}, renderUI: () => {}, say: () => {}, save: () => {} };
      const a = game.indexOf("function stepAuto(");
      runInNewContext(game.slice(a, game.indexOf("(function mmLoop", a)) + ";stepAuto();", auto);
      expect(auto.p.x).toBe(1);
      auto.performance.now = () => interval;
      runInNewContext("stepAuto();", auto);
      expect(auto.p.x).toBe(2);
    }
  });
  it("does not speed up when the player taps the map again while walking", () => {
    const s = setup(1);
    const interval = s.playerStepMs(0);
    let clock = 0;
    const scope: Record<string, unknown> = { ...s, p: { ...s.p, z: 1, x: 1, y: 1 }, autoPath: [], autoDest: null, autoAt: 0, pendingTalk: null,
      move: [0, 0], modalKind: "", performance: { now: () => clock }, HOUSE_LIST: [],
      walkable: () => true, occupied: () => false, checkStairs: () => {}, renderUI: () => {}, say: () => {}, save: () => {} };
    const fp = game.indexOf("function findPath(");
    runInNewContext(game.slice(fp, game.indexOf("mm.addEventListener", fp)), scope);
    const a = game.indexOf("function stepAuto(");
    runInNewContext(game.slice(a, game.indexOf("(function mmLoop", a)), scope);
    const p = scope["p"] as { x: number };
    clock = 10000;
    runInNewContext("requestWalk(10,1);stepAuto();", scope);
    expect(p.x).toBe(2);
    for (let t = 1; t < interval; t += 20) {
      clock = 10000 + t;
      runInNewContext("requestWalk(10,1);stepAuto();", scope);
    }
    expect(p.x).toBe(2);
    clock = 10000 + interval;
    runInNewContext("stepAuto();", scope);
    expect(p.x).toBe(3);
  });
  it("waits a full step after manual walking before a tap-to-walk step", () => {
    const s = setup(1);
    const interval = s.playerStepMs(0);
    const start = game.indexOf(" {const base=playerStepMs(now),");
    const manual = { ...s, now: 5000, lastMove: 0, autoAt: 0, move: [1, 0], walkable: () => true, occupied: () => false };
    runInNewContext(game.slice(start, game.indexOf(" checkStairs();", start)), manual);
    expect(manual.p.x).toBe(2);
    expect(manual.autoAt).toBe(5000);
    let clock = 5000 + interval - 1;
    const auto = { ...s, p: manual.p, autoPath: [[3, 1]], autoDest: [3, 1], autoAt: manual.autoAt, pendingTalk: null, move: [0, 0], modalKind: "",
      performance: { now: () => clock }, walkable: () => true, occupied: () => false,
      checkStairs: () => {}, renderUI: () => {}, say: () => {}, save: () => {} };
    const a = game.indexOf("function stepAuto(");
    runInNewContext(game.slice(a, game.indexOf("(function mmLoop", a)) + ";stepAuto();", auto);
    expect(auto.p.x).toBe(2);
    clock = 5000 + interval;
    runInNewContext("stepAuto();", auto);
    expect(auto.p.x).toBe(3);
  });
});
