import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const scope = {} as { LawlGmNavigation: {
  landmarks: (status: unknown, player: unknown, bosses: unknown[], zones: unknown[]) => Array<{ x: number; y: number; z: number }>;
  select: (status: unknown, player: unknown, armed: boolean, x: number, y: number, z: number) => unknown;
} };
runInNewContext(readFileSync("public/gamemaster.js", "utf8"), scope);
runInNewContext(readFileSync("public/gm-navigation.js", "utf8"), scope);
const nav = scope.LawlGmNavigation;
const status = { isGm: true }, player = { name: "GameMaster" };
describe("GM minimap navigation", () => {
  it("only exposes important locations to the authorized GM character", () => {
    expect(nav.landmarks({ isGm: false }, player, [], [])).toEqual([]);
    expect(nav.landmarks(status, { name: "Knight" }, [], [])).toEqual([]);
    expect(nav.landmarks(status, player, [], [])).toMatchObject([{ x: 30, y: 30, z: 0 }]);
  });
  it("locates boss portals using the actual hunting-zone coordinates", () => {
    expect(nav.landmarks(status, player, [{ name: "Boss" }], [{ cx: 12, cy: 18 }])[1]).toMatchObject({ x: 14, y: 18, z: 1 });
  });
  it("requires pressing the teleport selection button before choosing coordinates", () => {
    expect(nav.select(status, player, false, 30, 30, 0)).toBeNull();
    expect(nav.select(status, player, true, 30, 30, 0)).toEqual({ x: 30, y: 30, z: 0 });
  });
  it("rejects coordinates selected by an ordinary player", () => {
    expect(nav.select({ isGm: false }, player, true, 30, 30, 0)).toBeNull();
  });
  it("never selects coordinates outside the existing teleport bounds", () => {
    expect(() => nav.select(status, player, true, 300, 30, 0)).toThrow();
    expect(() => nav.select(status, player, true, 30, 230, 0)).toThrow();
    expect(() => nav.select(status, player, true, 30, 30, 2)).toThrow();
  });
});