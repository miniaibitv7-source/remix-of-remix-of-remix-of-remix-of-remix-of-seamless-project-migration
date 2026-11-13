import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const game = readFileSync("public/reinos.html", "utf8");
const start = game.indexOf("function findPath(");
const end = game.indexOf('mm.addEventListener("pointerdown"', start);
function setup(blocked: string[] = []) {
  const scope = {
    p: { x: 1, y: 1 }, autoPath: [] as number[][], autoDest: null as number[] | null, autoAt: 99,
    walkable: (x: number, y: number) => x >= 0 && y >= 0 && x < 8 && y < 8 && !blocked.includes(`${x},${y}`),
    occupied: (x: number, y: number) => x === 1 && y === 1,
    say: () => {}, requestWalk: (_x: number, _y: number) => {},
  };
  runInNewContext(game.slice(start, end), scope);
  return scope;
}
describe("map click movement", () => {
  it("walks to the selected location around obstacles", () => {
    const s = setup(["2,1"]);
    s.requestWalk(3, 1);
    expect(s.autoDest).toEqual([3, 1]);
    expect(s.autoPath.at(-1)).toEqual([3, 1]);
    expect(s.autoPath.some(([x, y]) => x === 2 && y === 1)).toBe(false);
    expect(s.autoPath.length).toBeGreaterThan(2);
  });
  it("stops the pending walk when selecting the current tile", () => {
    const s = setup();
    s.requestWalk(4, 1);
    expect(s.autoPath.length).toBe(3);
    s.requestWalk(1, 1);
    expect(s.autoPath).toEqual([]);
    expect(s.autoDest).toBeNull();
  });
});