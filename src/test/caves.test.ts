import { describe, expect, it } from "vitest";
import { buildWorld, scope } from "./world-harness";

/* Hunting areas (surface and underground) from LawlCaves.carveHunt, for every zone of the expanded world. */
const s = buildWorld(), [top, under] = s.maps;
const zones = s.ZONES;

describe("hunting caves and surface hunts", () => {
  it("has the 41 hunting areas, ordered from the weakest Lawl hunt", () => {
    expect(zones).toHaveLength(41);
    expect(zones[0].top).toBe("Rat");
  });
  for (const [i, z] of zones.entries()) {
    const floors: [string, any[][], number, any[]][] = [["subsolo", under, 7, z.lures], ["superfície", top, 0, z.luresTop]];
    for (const [label, grid, floor, lures] of floors) {
      const f = (x: number, y: number) => grid[y]?.[x] === floor || (grid[y]?.[x] === (label === "subsolo" ? 8 : 5));
      it(`${z.name} (${label}): every open tile is reachable from the stairs`, () => {
        const seen = new Set([`${z.cx},${z.cy}`]), q: [number, number][] = [[z.cx, z.cy]];
        for (let k = 0; k < q.length; k++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
          const x = q[k]![0] + dx, y = q[k]![1] + dy;
          if (x > z.x1 && x < z.x2 && y > z.y1 && y < z.y2 && f(x, y) && !seen.has(`${x},${y}`)) { seen.add(`${x},${y}`); q.push([x, y]); }
        }
        let open = 0;
        for (let y = z.y1 + 1; y < z.y2; y++) for (let x = z.x1 + 1; x < z.x2; x++) if (f(x, y)) open++;
        expect(seen.size).toBe(open);
      });
      it(`${z.name} (${label}): has two wide lure spots for 8+ monsters, away from the stairs`, () => {
        const big = lures.filter((c: any) => c.big);
        expect(big.length).toBeGreaterThanOrEqual(2);
        for (const c of big) { expect(c.tiles.length).toBeGreaterThanOrEqual(24); expect(Math.hypot(c.x - z.cx, c.y - z.cy)).toBeGreaterThanOrEqual(4); }
      });
      it(`${z.name} (${label}): has no 1-SQM passages`, () => {
        const pinched: string[] = [];
        for (let y = z.y1 + 1; y < z.y2; y++) for (let x = z.x1 + 1; x < z.x2; x++) if (grid[y][x] === floor) {
          const o = (a: number, b: number) => grid[b]?.[a] === floor || (b === z.y1 || b === z.y2 || a === z.x1 || a === z.x2) || grid[b]?.[a] === 5 || grid[b]?.[a] === 8;
          if ((!o(x - 1, y) && !o(x + 1, y)) || (!o(x, y - 1) && !o(x, y + 1))) pinched.push(`${x},${y}`);
        }
        expect(pinched).toEqual([]);
      });
    }
  }
  it("generates the same layout for every player", () => {
    const g = () => { const grid = Array.from({ length: 60 }, () => Array(60).fill(6)); scope.LawlCaves.carveHunt(grid, { x1: 2, y1: 2, x2: 30, y2: 30, cx: 16, cy: 16 }, 1234); return JSON.stringify(grid); };
    expect(g()).toBe(g());
  });
});
