import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

type Mob = { x: number; y: number; z: number; mv: number; _hunting?: boolean; t: { level?: number; hp: number; dmg: number; xp: number } };
const scope = {} as { LawlMonsterAI: {
  profile: (m: Mob) => { speed: number; step: number; sight: number };
  target: (m: Mob, players: Array<{ x: number; y: number; z: number; hp?: number }>, allowed: (q: unknown) => boolean) => unknown;
  tick: (m: Mob, dt: number, engaged: boolean) => boolean;
  surrounded: (tx: number, ty: number, pass: (x: number, y: number) => boolean, occ: (x: number, y: number) => boolean) => boolean;
  wander: (m: { x: number; y: number }, pass: (x: number, y: number) => boolean, occ: (x: number, y: number) => boolean, rnd?: () => number) => number[] | null;
} };
runInNewContext(readFileSync("public/monster-ai.js", "utf8"), scope);
const ai=scope.LawlMonsterAI;
const mob = (): Mob => ({ x: 0, y: 0, z: 0, mv: 3, t: { level: 1, hp: 35, dmg: 5, xp: 11 } });
describe("monster pursuit", () => {
  it("increases movement speed with monster level", () => {
    const weak=mob(),higher=mob();higher.t.level=50;
    expect(ai.profile(higher).speed).toBeGreaterThan(ai.profile(weak).speed);
    expect(ai.profile(higher).step).toBeLessThan(ai.profile(weak).step);
  });
  it("increases speed with combat strength at the same level", () => {
    const strong=mob();strong.t.hp=1200;strong.t.dmg=90;
    expect(ai.profile(strong).speed).toBeGreaterThan(ai.profile(mob()).speed);
  });
  it("moves monsters at 45% of their catalog speed (55% slower)", () => {
    const wiki={ ...mob(), t: { ...mob().t, official: true, speed: 200 } } as unknown as Mob;
    expect(ai.profile(wiki).speed).toBeCloseTo(90);
    expect(ai.profile(wiki).step).toBeCloseTo(0.833, 3);
  });
  it("detects a character beyond the old five-tile limit", () => {
    const player={ x: 7, y: 0, z: 0 };
    expect(ai.target(mob(),[player],()=>true)).toEqual(player);
  });
  it("interrupts the wandering delay immediately upon detecting a character", () => {
    const m=mob();expect(ai.tick(m,.016,true)).toBe(true);
    m.mv=.5;expect(ai.tick(m,.016,true)).toBe(false);
  });
  it("excludes safe zones, dead players and other floors", () => {
    expect(ai.target(mob(),[{x:1,y:0,z:1},{x:1,y:0,z:0,hp:0}],()=>true)).toBeNull();
    expect(ai.target(mob(),[{x:1,y:0,z:0}],()=>false)).toBeNull();
  });
  it("keeps pursuing a detected character without flickering at the detection boundary", () => {
    const m=mob(),player={x:9,y:0,z:0};
    expect(ai.target(m,[player],()=>true)).toBeNull();
    ai.tick(m,0,true);expect(ai.target(m,[player],()=>true)).toEqual(player);
  });
});

describe("shared monster simulation", () => {
  it("detects players before the wandering timer expires and respects habitat boundaries", () => {
    const game=readFileSync("public/reinos.html","utf8");
    const m=mob();
    const s = { LawlMonsterAI: ai, players:()=>[{x:7,y:0,z:0}], maps:[Array.from({length:20},()=>Array(20).fill(0)),[]], mobsZ:[[m],[]], npcsTop:[],
      mobOk:(_z:number,x:number,y:number)=>x>=0&&y>=0&&x<20&&y<20,
      safe:()=>false,zoneAt:()=>0,dist:(a:{x:number;y:number},b:{x:number;y:number})=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)),
      mobChaseStep:(_m:unknown,_x:number,_y:number,pass:(x:number,y:number)=>boolean)=>pass(1,0)?[1,0]:null,
      simulate:(_dt:number)=>{} };
    runInNewContext(game.slice(game.indexOf("function simulate(dt)"),game.indexOf("const MOBMSG=")),s);
    s.simulate(.016);expect(m.x).toBe(1);expect(m.mv).toBe(ai.profile(m).step);
    s.zoneAt=()=>1;Object.assign(m,{x:0,mv:0,zone:0});s.simulate(.016);expect(m.x).toBe(0);
  });
});

describe("GameMaster", () => {
  it("is never chased by monsters online; they keep wandering", () => {
    const game=readFileSync("public/reinos.html","utf8");
    const m={...mob(),mv:0};let chased=0;
    const g = { LawlMonsterAI: ai, players:()=>[{x:3,y:0,z:0,hp:100,gm:true}], maps:[Array.from({length:20},()=>Array(20).fill(0)),[]], mobsZ:[[m],[]], npcsTop:[],
      mobOk:(_z:number,x:number,y:number)=>x>=0&&y>=0&&x<20&&y<20,
      safe:()=>false,zoneAt:()=>0,dist:(a:{x:number;y:number},b:{x:number;y:number})=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)),
      mobChaseStep:()=>{chased++;return [1,0]},
      simulate:(_dt:number)=>{} };
    runInNewContext(game.slice(game.indexOf("function simulate(dt)"),game.indexOf("const MOBMSG=")),g);
    g.simulate(.016);
    expect(chased).toBe(0);
    expect(m.mv).toBeGreaterThanOrEqual(1.5);
  });
  it("is ignored by monsters in solo play", () => {
    const game=readFileSync("public/reinos.html","utf8");
    expect(game).toMatch(/aggro=!isGM\(\)&&mobAggro\(/);
  });
});
describe("obstacle navigation", () => {
  it("routes around a wall instead of cutting diagonally through it", () => {
    const game=readFileSync("public/reinos.html","utf8");
    const s={mobChaseStep:(_m:{x:number;y:number},_x:number,_y:number,_pass:(x:number,y:number)=>boolean,_occ:(x:number,y:number)=>boolean)=>null as number[]|null};
    runInNewContext(game.slice(game.indexOf("const MOB_DIRS="),game.indexOf("function town(")),s);
    const pass=(x:number,y:number)=>x>=0&&y>=0&&x<10&&y<10&&!(x===2&&y<4);
    const step=s.mobChaseStep({x:1,y:1},5,1,pass,()=>false);
    expect(step).toEqual([0,1]);
  });
});
describe("surrounding the character", () => {
  const game=readFileSync("public/reinos.html","utf8");
  const s={mobChaseStep:(_m:{x:number;y:number},_x:number,_y:number,_pass:(x:number,y:number)=>boolean,_occ:(x:number,y:number)=>boolean)=>null as number[]|null};
  runInNewContext(game.slice(game.indexOf("const MOB_DIRS="),game.indexOf("function town(")),s);
  const P={x:10,y:10};
  const pass=(x:number,y:number)=>x>=0&&y>=0&&x<21&&y<21;
  const ring=(m:{x:number;y:number})=>Math.max(Math.abs(m.x-P.x),Math.abs(m.y-P.y));
  const round=(mobs:Array<{x:number;y:number}>)=>{let moved=0;for(const m of mobs){
    const occ=(x:number,y:number)=>(x===P.x&&y===P.y)||mobs.some(o=>o.x===x&&o.y===y);
    const st=s.mobChaseStep(m,P.x,P.y,pass,occ);if(st){const [dx=0,dy=0]=st;m.x+=dx;m.y+=dy;moved++}}return moved};
  const at=(pts:Array<[number,number]>)=>pts.map(([x,y])=>({x,y}));
  const pack=()=>at([[4,10],[16,10],[10,4],[10,16],[5,5],[15,15],[5,15],[15,5],[3,9],[17,11]]);

  it("fills all 8 tiles around the character", () => {
    const mobs=pack();for(let i=0;i<30;i++)round(mobs);
    expect(mobs.filter(m=>ring(m)===1)).toHaveLength(8);
  });
  it("treats the character as surrounded only when all 8 tiles are taken", () => {
    const mobs=pack();for(let i=0;i<30;i++)round(mobs);
    const occ=(x:number,y:number)=>(x===P.x&&y===P.y)||mobs.some(o=>o.x===x&&o.y===y);
    expect(ai.surrounded(P.x,P.y,pass,occ)).toBe(true);
    mobs.splice(mobs.findIndex(m=>ring(m)===1),1);
    expect(ai.surrounded(P.x,P.y,pass,occ)).toBe(false);
  });
  it("makes extra monsters wander randomly to a free tile while the 8 tiles are full", () => {
    const mobs=pack();for(let i=0;i<30;i++)round(mobs);
    const extra=mobs.find(m=>ring(m)===2)!;
    const occ=(x:number,y:number)=>(x===P.x&&y===P.y)||mobs.some(o=>o.x===x&&o.y===y);
    const seq=[.9,0],rnd=()=>seq.shift() ?? 0;
    const step=ai.wander(extra,pass,occ,rnd)!;
    expect(step).not.toBeNull();
    expect(pass(extra.x+step[0]!,extra.y+step[1]!)&&!occ(extra.x+step[0]!,extra.y+step[1]!)).toBe(true);
    expect(ai.wander(extra,pass,occ,()=>.1)).toBeNull();
  });
  it("stops extra monsters in the game loop instead of chasing while surrounded", () => {
    const game=readFileSync("public/reinos.html","utf8");
    const ring8=at([[6,4],[7,4],[8,4],[6,5],[8,5],[6,6],[7,6],[8,6]]).map(o=>({...mob(),...o}));
    const extra={...mob(),x:7,y:8,mv:0};let chased=0;
    const g = { LawlMonsterAI: ai, players:()=>[{x:7,y:5,z:0,hp:100}], maps:[Array.from({length:20},()=>Array(20).fill(0)),[]], mobsZ:[[...ring8,extra],[]], npcsTop:[],
      mobOk:(_z:number,x:number,y:number)=>x>=0&&y>=0&&x<20&&y<20,
      safe:()=>false,zoneAt:()=>0,dist:(a:{x:number;y:number},b:{x:number;y:number})=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)),
      mobChaseStep:()=>{chased++;return [0,-1]},
      simulate:(_dt:number)=>{} };
    runInNewContext(game.slice(game.indexOf("function simulate(dt)"),game.indexOf("const MOBMSG=")),g);
    for(let i=0;i<10;i++){extra.mv=0;g.simulate(.016)}
    expect(chased).toBe(0);
    expect(Math.max(Math.abs(extra.x-7),Math.abs(extra.y-5))).toBeGreaterThanOrEqual(2);
  });
  it("refills a freed side when an adjacent monster dies", () => {
    const mobs=pack();for(let i=0;i<30;i++)round(mobs);
    mobs.splice(mobs.findIndex(m=>ring(m)===1),1);
    for(let i=0;i<6;i++)round(mobs);
    expect(mobs.filter(m=>ring(m)===1)).toHaveLength(8);
  });
  it("walks to the free side even when the near sides are taken", () => {
    const mobs=at([[9,9],[10,9],[11,9],[9,10],[11,10],[9,11],[11,11],[10,13]]);
    for(let i=0;i<6;i++)round(mobs);
    expect(mobs[7]).toEqual({x:10,y:11});
  });
});
