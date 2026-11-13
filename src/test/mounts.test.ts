import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

type Player = { loot: Record<string, number>; mounts?: string[]; mount?: string; mountPick?: string; mountDrop?: Record<number, { c: number; need: number }> };
type Mount = { id: string; boss: number; name: string; item: string };
type Api = {
  catalog: Mount[]; SPEED: number;
  rollNeed: (rand: () => number) => number;
  recordBossKill: (p: Player, i: number, rand: () => number) => string | null;
  useItem: (p: Player, item: string) => { ok: boolean };
  toggle: (p: Player) => string | null;
  sanitize: (p: Player) => Player;
};
const scope = {} as { LawlMounts: Api };
runInNewContext(readFileSync("public/mounts.js", "utf8"), scope);
const M = scope.LawlMounts;
const game = readFileSync("public/reinos.html", "utf8");

describe("boss mounts", () => {
  it("has one mount for each of the 8 existing bosses", () => {
    expect(M.catalog.map((m) => m.boss)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
  it("requires between 1 and 100 boss kills for the item to drop", () => {
    expect(M.rollNeed(() => 0)).toBe(1);
    expect(M.rollNeed(() => 0.999999)).toBe(100);
    expect(M.rollNeed(() => 1)).toBe(100);
    for (let k = 0; k < 500; k++) {
      const n = M.rollNeed(Math.random);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(100);
    }
  });
  it("drops the item exactly on the drawn kill and can drop on the very first kill", () => {
    const p: Player = { loot: {} };
    expect(M.recordBossKill(p, 0, () => 0)).toBe("Rédea do Rei Rato");
    expect(p.loot["Rédea do Rei Rato"]).toBe(1);

    const q: Player = { loot: {} };
    const r = () => 0.5; // 51 kills
    for (let k = 1; k < 51; k++) expect(M.recordBossKill(q, 7, r)).toBeNull();
    expect(M.recordBossKill(q, 7, r)).toBe("Chama de Azaroth");
  });
  it("unlocks the mount with a single item and consumes it", () => {
    const p: Player = { loot: { "Sela de Grokk": 1 } };
    expect(M.useItem(p, "Sela de Grokk").ok).toBe(true);
    expect(p.mounts).toEqual(["javali"]);
    expect(p.loot["Sela de Grokk"]).toBeUndefined();
    p.loot["Sela de Grokk"] = 1;
    expect(M.useItem(p, "Sela de Grokk").ok).toBe(false);
    expect(p.loot["Sela de Grokk"]).toBe(1);
  });
  it("cannot ride a mount that was not unlocked", () => {
    const p = M.sanitize({ loot: {}, mounts: ["fake"], mount: "corcel" });
    expect(p.mount).toBe("");
    expect(M.toggle(p)).toBeNull();
  });
  it("gives +10 speed while mounted", () => {
    const s: Record<string, unknown> = { p: { level: 1, hasteUntil: 0, mount: "" }, isGM: () => false, LawlMounts: M };
    runInNewContext(game.slice(game.indexOf("function characterSpeed("), game.indexOf("function equipStat(")), s);
    const step = s["playerStepMs"] as (now: number) => number;
    expect(step(0)).toBe(682);
    (s["p"] as Player).mount = "ratao";
    expect(step(0)).toBe(625);
  });
});
