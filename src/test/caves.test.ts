import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

type Zone = { name: string; x1: number; y1: number; x2: number; y2: number; cx: number; cy: number; n: number };
type Lure = { x: number; y: number; r: number; tiles: [number, number][] };
const game = readFileSync("public/reinos.html", "utf8");
const height = Number(game.match(/W=160,H=(\d+)/)?.[1]);
const scope: { LawlCaves?: { carve: (g: number[][], z: Zone, seed: number) => Lure[] }; zones?: Zone[] } = {};
runInNewContext(readFileSync("public/caves.js", "utf8"), { globalThis: scope });
const start = game.indexOf("const ZONES=[");
runInNewContext("zones=" + game.slice(start + 12, game.indexOf("];", start) + 1), scope);
const zones = (scope.zones ?? []).map((z) => ({ ...z, cx: (z.x1 + z.x2) >> 1, cy: (z.y1 + z.y2) >> 1 }));
const carve = (i: number) => {
  const grid = Array.from({ length: height }, () => Array(160).fill(6));
  const zone = zones[i];
  if (!scope.LawlCaves || !zone) throw new Error("Missing cave or zone");
  const lures = scope.LawlCaves.carve(grid, zone, 9001 + i * 7919);
  return { grid, lures };
};

describe("Lawl underground caves", () => {
  it("rebuilds all eight original hunting caves", () => {
    expect(zones).toHaveLength(8);
  });
  for (const [i, z] of zones.entries()) {
    it(`${z.name}: every open tile is reachable from the stairs`, () => {
      const { grid } = carve(i);
      const at = (x: number, y: number): number => grid[y]?.[x] ?? 6;
      const seen = new Set([`${z.cx},${z.cy}`]), q: [number, number][] = [[z.cx, z.cy]];
      const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (let k = 0; k < q.length; k++) for (const [dx, dy] of dirs) {
        const [qx, qy] = q[k]!, x = qx + dx, y = qy + dy;
        if (at(x, y) === 7 && !seen.has(`${x},${y}`)) { seen.add(`${x},${y}`); q.push([x, y]); }
      }
      let open = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < 160; x++) if (at(x, y) === 7) {
        open++;
        expect(x > z.x1 && x < z.x2 && y > z.y1 && y < z.y2).toBe(true);
      }
      expect(seen.size).toBe(open);
      expect(at(z.cx + 2, z.cy)).toBe(7);
    });
    it(`${z.name}: has at least four lure chambers away from the stairs`, () => {
      const { lures } = carve(i);
      expect(lures.length).toBeGreaterThanOrEqual(4);
      for (const c of lures) expect(Math.hypot(c.x - z.cx, c.y - z.cy)).toBeGreaterThanOrEqual(4);
    });
    it(`${z.name}: has no 1-SQM passages (corridors are at least 2 SQM wide)`, () => {
      const { grid } = carve(i);
      const f = (x: number, y: number) => grid[y]?.[x] === 7;
      const pinched: string[] = [];
      for (let y = 0; y < height; y++) for (let x = 0; x < 160; x++) if (f(x, y)) {
        if ((!f(x - 1, y) && !f(x + 1, y)) || (!f(x, y - 1) && !f(x, y + 1))) pinched.push(`${x},${y}`);
      }
      expect(pinched).toEqual([]);
    });
  }
  it("generates the same layout for every player", () => {
    expect(JSON.stringify(carve(3).grid)).toBe(JSON.stringify(carve(3).grid));
  });
});
