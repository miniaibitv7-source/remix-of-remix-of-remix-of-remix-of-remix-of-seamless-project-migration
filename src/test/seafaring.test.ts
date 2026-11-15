import { describe, expect, it } from "vitest";
import { buildWorld, LawlSeafaring, LawlWorld } from "./world-harness";

const sea = LawlSeafaring;
const world = buildWorld;
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
  it("has a return passage and walkable arrival tiles at every port", () => {
    const s=world();
    for(const port of [...sea.ports,...LawlWorld.ports])expect(s.maps[0][port.landing.y][port.landing.x]).toBe(3);
    expect(sea.quote({x:122,y:39,z:0,gold:40},"aurora",20000,0,false).to.id).toBe("lawl");
    for(const [from,to] of Object.entries(LawlWorld.ROUTES) as [string,Record<string,number>][])for(const k of Object.keys(to))expect(LawlWorld.ROUTES[k][from]).toBe(to[k]);
  });
  it("keeps every Porto Aurora monster in its habitat and on the correct floor", () => {
    const s=world(),idx=s.ZONES.map((z:any,i:number)=>z.city==="Porto Aurora"?i:-1).filter((i:number)=>i>=0);
    expect(idx).toHaveLength(4);
    for(const i of idx)for(const floor of [0,1]){
      const zone=s.ZONES[i],n=zone.nz[floor];for(let k=0;k<n;k++)s.spawn(i,floor);
      const population=s.mobsZ[floor].filter((m: any)=>m.zone===i);
      expect(population.length).toBe(n);
      const pool=floor?[zone.sub,...zone.wikiSub]:[zone.top,...zone.wikiTop];
      for(const m of population){expect(pool).toContain(m.t.name);expect(s.zoneAt(m.x,m.y)).toBe(i);expect(sea.isCity(m.x,m.y)).toBe(false);expect(sea.isDock(m.x,m.y)).toBe(false)}
      expect(s.maps[0][zone.cy][zone.cx]).toBe(5);expect(s.maps[1][zone.cy][zone.cx]).toBe(8);
    }
  });
});
