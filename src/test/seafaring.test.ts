import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const scope: any = {};
runInNewContext(readFileSync("public/seafaring.js", "utf8"), scope);
runInNewContext(readFileSync("public/housing.js", "utf8"), scope);
runInNewContext(readFileSync("public/caves.js", "utf8"), scope);
runInNewContext(readFileSync("public/monsters.js", "utf8"), scope);
const sea = scope.LawlSeafaring;
const game = readFileSync("public/reinos.html", "utf8");
function world() {
  const s: any = { LawlSeafaring: sea, LawlHousing: scope.LawlHousing, LawlCaves: scope.LawlCaves, LawlMonsters: scope.LawlMonsters, setInterval: () => {}, setTimeout: () => {}, Math, p: { x: 30, y: 30, z: 0 }, maps: [], mobsZ: [[], [], []], map: [], W: 160, H: Number(game.match(/W=160,H=(\d+)/)?.[1]),
    training: (x: number, y: number) => x >= 36 && x <= 41 && y >= 26 && y <= 34,
    depotArea: (x: number, y: number) => x >= 43 && x <= 47 && y >= 27 && y <= 33,
    town: (x: number, y: number) => Math.abs(x-30)<=5 && Math.abs(y-30)<=5,
    BOSSES: Array(8).fill({}), BROOM: (i: number) => ({ x: 4+i*12, y: 80 }), MOBP: "test-", mobSeq: 0 };
  runInNewContext(game.slice(game.indexOf("const monsters="), game.indexOf("let maps=")) + '\nglobalThis.ZONES=ZONES; globalThis.MON=MON;', s);
  runInNewContext(game.slice(game.indexOf("function genMap("), game.indexOf("let mobSeq=")), s);
  s.genMap();
  return s;
}
describe("maritime travel and territorial hunts", () => {
  it("quotes a boat passage from the captain and refuses remote travel", () => {
    expect(sea.quote({x:30,y:38,z:0,gold:40}, "lawl",20000,0,false).to.id).toBe("aurora");
    expect(sea.quote({x:30,y:30,z:0,gold:40}, "lawl",20000,0,false).error).toBeTruthy();
  });
  it("rejects insufficient funds, combat, and unfinished negotiations", () => {
    const player={x:30,y:38,z:0,gold:40};
    expect(sea.quote({...player,gold:0},"lawl",20000,0,false).error).toBeTruthy();
    expect(sea.quote(player,"lawl",20000,19999,false).error).toBeTruthy();
    expect(sea.quote(player,"lawl",20000,0,true).error).toBeTruthy();
  });
  it("has a return passage and walkable arrival tiles at both ports", () => {
    const s=world();
    for(const port of sea.ports)expect(s.maps[0][port.landing.y][port.landing.x]).toBe(3);
    expect(sea.quote({x:122,y:39,z:0,gold:40},"aurora",20000,0,false).to.id).toBe("lawl");
    expect(s.maps[0][31][104]).toBe(1);
  });
  it("keeps all new monster populations in their habitat and correct floor", () => {
    const s=world();
    for(let i=8;i<11;i++)for(const floor of [0,1]){
      const zone=s.ZONES[i];for(let k=0;k<zone.n;k++)s.spawn(i,floor);
      const population=s.mobsZ[floor].filter((m: any)=>m.zone===i);
      expect(population.length).toBe(zone.n);
      for(const m of population){expect(m.t.name).toBe(floor?zone.sub:zone.top);expect(s.zoneAt(m.x,m.y)).toBe(i);expect(sea.isCity(m.x,m.y)).toBe(false);expect(sea.isDock(m.x,m.y)).toBe(false)}
      expect(s.maps[0][zone.cy][zone.cx]).toBe(5);expect(s.maps[1][zone.cy][zone.cx]).toBe(8);
    }
  });
});