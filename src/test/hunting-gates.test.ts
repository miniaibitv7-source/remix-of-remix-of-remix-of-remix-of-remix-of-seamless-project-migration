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
  runInNewContext(game.slice(game.indexOf("const monsters="), game.indexOf("let maps=")) + "\nglobalThis.ZONES=ZONES;", s);
  runInNewContext(game.slice(game.indexOf("function genMap("), game.indexOf("let mobSeq=")) + "\nglobalThis.DISTRICTS=DISTRICTS;", s);
  s.genMap();
  return s;
}
const walk = (t: number) => [0, 3, 5, 7, 8, 10].includes(t);
const LAWL_ZONES = 8;

describe("Lawl hunting area entrances", () => {
  it("every gate of the first city's hunting areas is 3 SQM wide", () => {
    const s = world(), M = s.maps[0];
    for (const Z of s.ZONES.slice(0, LAWL_ZONES)) {
      for (const y of [Z.y1, Z.y2]) expect([-1, 0, 1].map(k => M[y][Z.cx + k])).toEqual([0, 0, 0]);
      for (const x of [Z.x1, Z.x2]) expect([-1, 0, 1].map(k => M[Z.cy + k][x])).toEqual([0, 0, 0]);
      expect(M[Z.y1][Z.cx - 2]).toBe(4);
      expect(M[Z.y1][Z.cx + 2]).toBe(4);
    }
  });
  it("keeps at least 4 SQM of forest between the city and the northern hunting areas", () => {
    const s = world(), [north] = s.DISTRICTS, [rats, wolves, orcs] = s.ZONES;
    expect(north[0] - rats.x2 - 1).toBeGreaterThanOrEqual(4);
    expect(wolves.x1 - north[2] - 1).toBeGreaterThanOrEqual(4);
    expect(orcs.x1 - wolves.x2 - 1).toBeGreaterThanOrEqual(4);
    expect(s.DISTRICTS[1][1] - rats.y2 - 1).toBeGreaterThanOrEqual(2);
    expect(s.DISTRICTS[2][1] - orcs.y2 - 1).toBeGreaterThanOrEqual(2);
  });
  it("every hunting area entrance in the first city is reachable from the temple", () => {
    const s = world(), M = s.maps[0];
    const seen = new Set(["30,30"]), q: [number, number][] = [[30, 30]];
    while (q.length) { const [x, y] = q.shift()!; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]] as [number, number][]) { const nx = x + dx, ny = y + dy, k = nx + "," + ny; if (!seen.has(k) && walk(M[ny]?.[nx])) { seen.add(k); q.push([nx, ny]); } } }
    for (const Z of s.ZONES.slice(0, LAWL_ZONES)) expect(seen.has(`${Z.cx},${Z.cy}`)).toBe(true);
  });
});
