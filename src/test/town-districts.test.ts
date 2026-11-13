import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const scope: any = {};
runInNewContext(readFileSync("public/seafaring.js", "utf8"), scope);
runInNewContext(readFileSync("public/housing.js", "utf8"), scope);
runInNewContext(readFileSync("public/caves.js", "utf8"), scope);
runInNewContext(readFileSync("public/monsters.js", "utf8"), scope);
const game = readFileSync("public/reinos.html", "utf8");
function world() {
  const s: any = { LawlSeafaring: scope.LawlSeafaring, LawlHousing: scope.LawlHousing, LawlCaves: scope.LawlCaves, LawlMonsters: scope.LawlMonsters, setInterval: () => {}, setTimeout: () => {}, Math, p: { x: 30, y: 30, z: 0 }, maps: [], mobsZ: [[], [], []], map: [], W: 160, H: Number(game.match(/W=160,H=(\d+)/)?.[1]),
    training: (x: number, y: number) => x >= 36 && x <= 41 && y >= 26 && y <= 34,
    depotArea: (x: number, y: number) => x >= 43 && x <= 47 && y >= 27 && y <= 33,
    BOSSES: Array(8).fill({}), BROOM: (i: number) => ({ x: 4 + i * 12, y: 80 }), MOBP: "t-", mobSeq: 0 };
  runInNewContext(game.slice(game.indexOf("const monsters="), game.indexOf("let maps=")) + "\nglobalThis.ZONES=ZONES;globalThis.MON=MON;", s);
  runInNewContext(game.slice(game.indexOf("function genMap("), game.indexOf("let mobSeq=")) + "\nglobalThis.HOUSES=HOUSES;", s);
  s.genMap();
  return s;
}
const walk = (t: number) => [0, 3, 5, 7, 8, 10].includes(t);

describe("Lawl town districts", () => {
  it("moves the two southern hunts away from the city houses without shrinking them", () => {
    const s = world();
    const houses = scope.LawlHousing.catalog(s.HOUSES).filter((h: any) => h.id === "lawl-15" || h.id === "lawl-16");
    for (const index of [6, 7]) {
      const zone = s.ZONES[index];
      expect(zone.y1).toBe(80);
      expect(zone.y2 - zone.y1).toBe(23);
      for (const house of houses) expect(zone.y1 - (house.y + house.h)).toBeGreaterThanOrEqual(9);
      expect(s.maps[0][zone.cy][zone.cx]).toBe(5);
      expect(s.maps[1][zone.cy][zone.cx]).toBe(8);
      expect(zone.y2).toBeLessThan(s.maps[0].length - 1);
    }
  });
  it("every house is reachable from the city center through its door", () => {
    const s = world(), M = s.maps[0];
    const seen = new Set(["30,30"]), q: [number, number][] = [[30, 30]];
    while (q.length) { const next = q.shift(); if (!next) break; const [x, y] = next; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]] as [number, number][]) { const nx = x + dx, ny = y + dy, k = nx + "," + ny; if (!seen.has(k) && walk(M[ny]?.[nx])) { seen.add(k); q.push([nx, ny]); } } }
    expect(s.HOUSES.length).toBe(22);
    for (const [x0, y0, w, h] of s.HOUSES) expect(seen.has(`${x0 + 1},${y0 + 1}`)).toBe(true);
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
    expect(houses).toHaveLength(22);
    for (let i = 0; i < houses.length; i++) {
      const h = houses[i], oldWidth = i === 14 || i === 15 ? 5 : 4;
      expect(h.id).toBe(`lawl-${i + 1}`);
      expect(h.w).toBe(oldWidth * 2);
      expect(h.h).toBe(8);
      expect(h.w * h.h).toBe(oldWidth * 4 * 4);
    }
  });
  it("keeps houses separate and clear of the harbor lake and city services", () => {
    const houses = scope.LawlHousing.catalog(world().HOUSES);
    const obstacles = [{x:25,y:25,w:11,h:11},{x:36,y:26,w:6,h:9},{x:43,y:27,w:5,h:7},{x:25,y:39,w:12,h:8}];
    for (let i = 0; i < houses.length; i++) {
      const h = houses[i];
      for (const other of [...houses.slice(i + 1), ...obstacles])
        expect(h.x + h.w <= other.x || other.x + other.w <= h.x || h.y + h.h <= other.y || other.y + other.h <= h.y).toBe(true);
    }
  });
});
