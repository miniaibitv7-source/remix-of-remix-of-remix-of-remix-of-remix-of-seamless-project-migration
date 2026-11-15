import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

/* Builds the shared game world exactly like public/reinos.html does (genMap, zones, houses, spawn). */
export const scope: any = {};
for (const f of ["seafaring.js", "housing.js", "caves.js", "monsters.js", "world.js"]) runInNewContext(readFileSync(`public/${f}`, "utf8"), scope);
export const game = readFileSync("public/reinos.html", "utf8");
export const LawlWorld = scope.LawlWorld, LawlSeafaring = scope.LawlSeafaring, LawlHousing = scope.LawlHousing;

export function buildWorld() {
  const s: any = { ...scope, setInterval: () => {}, setTimeout: () => {}, Math, p: { x: 30, y: 30, z: 0 }, maps: [], mobsZ: [[], [], []], map: [],
    W: LawlWorld.W, H: LawlWorld.H,
    training: (x: number, y: number) => x >= 36 && x <= 41 && y >= 26 && y <= 34,
    depotArea: (x: number, y: number) => x >= 43 && x <= 47 && y >= 27 && y <= 33,
    BOSSES: Array(8).fill({}), BROOM: (i: number) => ({ x: 4 + i * 12, y: 80 }), MOBP: "t-", mobSeq: 0 };
  runInNewContext(game.slice(game.indexOf("const monsters="), game.indexOf("let maps=")) + "\nglobalThis.ZONES=ZONES;globalThis.MON=MON;globalThis.zoneAt=zoneAt;globalThis.monsters=monsters;", s);
  runInNewContext(game.slice(game.indexOf("function genMap("), game.indexOf("let mobSeq=")) + "\nglobalThis.HOUSES=HOUSES;globalThis.DISTRICTS=DISTRICTS;", s);
  s.genMap();
  return s;
}

/* Tiles a player can step on; tile 12 is the Premium bridge gate. */
export const FREE_WALK = [0, 3, 5, 7, 8, 10];
export const PREMIUM_WALK = [...FREE_WALK, 12];
export function flood(grid: any[][], sx: number, sy: number, walk: number[]) {
  const H = grid.length, W = grid[0]!.length, seen = new Uint8Array(W * H), q: [number, number][] = [[sx, sy]];
  seen[sy * W + sx] = 1;
  while (q.length) {
    const [x, y] = q.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const k = ny * W + nx;
      if (!seen[k] && walk.includes(grid[ny]![nx]!)) { seen[k] = 1; q.push([nx, ny]); }
    }
  }
  return (x: number, y: number) => !!seen[y * W + x];
}
