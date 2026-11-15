import { describe, expect, it } from "vitest";
import { buildWorld, flood, FREE_WALK, PREMIUM_WALK, LawlHousing, LawlWorld } from "./world-harness";

const scope = { LawlHousing };
const world = buildWorld;
const walk = (t: number) => FREE_WALK.includes(t);
describe("Lawl town districts", () => {
  it("keeps Lawl houses at least 9 SQM away from every hunting area", () => {
    const s = world();
    for (const [x0, y0, w, h] of s.HOUSES.slice(0, 22)) for (const z of s.ZONES)
      expect(Math.max(z.x1 - (x0 + w - 1), x0 - z.x2, z.y1 - (y0 + h - 1), y0 - z.y2)).toBeGreaterThanOrEqual(9);
  });
  it("every house is reachable from the city center through its door", () => {
    const s = world(), M = s.maps[0];
    const seen = new Set(["30,30"]), q: [number, number][] = [[30, 30]];
    while (q.length) { const next = q.shift(); if (!next) break; const [x, y] = next; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]] as [number, number][]) { const nx = x + dx, ny = y + dy, k = nx + "," + ny; if (!seen.has(k) && walk(M[ny]?.[nx])) { seen.add(k); q.push([nx, ny]); } } }
    expect(s.HOUSES.length).toBe(46);
    for (const [x0, y0] of s.HOUSES.slice(0, 22)) expect(seen.has(`${x0 + 1},${y0 + 1}`)).toBe(true);
    for (const c of LawlWorld.cities) {
      const r = flood(M, c.cx, c.cy, PREMIUM_WALK);
      for (const h of LawlHousing.catalog(s.HOUSES).filter((h: any) => h.name.endsWith(c.name))) expect(r(h.x + 1, h.y + 1)).toBe(true);
    }
  });
  it("keeps at least 3 SQM between any two house doors", () => {
    const houses = scope.LawlHousing.catalog(world().HOUSES);
    for (let i = 0; i < houses.length; i++) for (let j = i + 1; j < houses.length; j++) {
      const a = houses[i], b = houses[j];
      expect(Math.max(Math.abs(a.dx - b.dx), Math.abs(a.dy - b.dy)) - 1).toBeGreaterThanOrEqual(3);
    }
  });
  it("keeps houses out of hunting zones", () => {
    const s = world();
    for (const [x0, y0, w, h] of s.HOUSES) for (const Z of s.ZONES)
      expect(x0 + w - 1 < Z.x1 || x0 > Z.x2 || y0 + h - 1 < Z.y1 || y0 > Z.y2).toBe(true);
  });
  it("quadruples every house footprint while preserving all 22 lease IDs", () => {
    const houses = scope.LawlHousing.catalog(world().HOUSES);
    expect(houses).toHaveLength(46);
    for (let i = 0; i < 22; i++) {
      const h = houses[i], oldWidth = i === 14 || i === 15 ? 5 : 4;
      expect(h.id).toBe(`lawl-${i + 1}`);
      expect(h.w).toBe(oldWidth * 2);
      expect(h.h).toBe(8);
      expect(h.w * h.h).toBe(oldWidth * 4 * 4);
    }
  });
  it("keeps houses separate and clear of the harbor lake and city services", () => {
    const houses = scope.LawlHousing.catalog(world().HOUSES);
    const obstacles = [{x:25,y:25,w:11,h:11},{x:36,y:26,w:6,h:9},{x:43,y:27,w:5,h:7},{x:25,y:39,w:12,h:8},
      ...LawlWorld.cities.flatMap((c: any) => [{x:c.cx-4,y:c.cy-4,w:9,h:9},{x:c.depot.x1,y:c.depot.y1,w:c.depot.x2-c.depot.x1+1,h:c.depot.y2-c.depot.y1+1},{x:c.pool.x1,y:c.pool.y1,w:c.pool.x2-c.pool.x1+1,h:c.pool.y2-c.pool.y1+1}])];
    for (let i = 0; i < houses.length; i++) {
      const h = houses[i];
      for (const other of [...houses.slice(i + 1), ...obstacles])
        expect(h.x + h.w <= other.x || other.x + other.w <= h.x || h.y + h.h <= other.y || other.y + other.h <= h.y).toBe(true);
    }
  });
});
