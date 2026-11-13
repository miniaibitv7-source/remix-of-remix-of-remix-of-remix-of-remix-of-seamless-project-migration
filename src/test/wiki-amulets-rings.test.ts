import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const scope:any={};runInNewContext(readFileSync('public/items.js','utf8'),scope);runInNewContext(readFileSync('public/monsters.js','utf8'),scope);
const I=scope.LawlItems,M=scope.LawlMonsters;
const find=(n:string)=>I.WIKI_GEAR.find((e:any)=>e.name===n);
const seq=(...v:number[])=>{let i=0;return ()=>v[i++%v.length]};

describe('wiki necklaces and Crude Ring',()=>{
 it('use the wiki armor and level, for every vocation, with no extra bonus',()=>{
  const want:any={'Scarf':['Colar',0,1],'Skull Bandana':['Colar',10,3],'Hawk Bandana':['Colar',20,4],'Cowboy Bandana':['Colar',20,4],'Crude Ring':['Anel',5,1]};
  for(const [n,[slot,lvl,def]] of Object.entries(want) as [string,[string,number,number]][]){const e=find(n);expect([e.slot,e.lvl,e.def]).toEqual([slot,lvl,def]);expect(e.voc.length).toBe(4);
   expect(I.equipBonus({[slot]:e})).toEqual({skill:{},res:{}})}
  expect(I.gearCategory(find('Scarf'))).toBe('necklace');expect(I.gearCategory(find('Crude Ring'))).toBe('ring');
 });
 it('sell for the wiki prices; Crude Ring has no buyer',()=>{
  expect(['Scarf','Skull Bandana','Hawk Bandana','Cowboy Bandana','Crude Ring'].map(n=>I.smithSellPrice(find(n)))).toEqual([250,10000,12000,12000,0]);
 });
 it('level limits apply',()=>{
  expect(I.canEquip(find('Skull Bandana'),{level:9,voc:'druid'})).not.toBe('');
  expect(I.canEquip(find('Skull Bandana'),{level:10,voc:'druid'})).toBe('');
  expect(I.canEquip(find('Crude Ring'),{level:4,voc:'knight'})).not.toBe('');
 });
 it('their armor lowers physical damage taken',()=>{
  const id=(d:number)=>d,none=(d:number)=>d;
  const armor=I.gearStat(find('Hawk Bandana'),'def')+I.gearStat(find('Crude Ring'),'def');
  expect(M.mitigate(50,'phys',0,armor,(d:number)=>d,id,none)).toBe(45);
 });
 it('new characters do not get the Scarf in the starter kit',()=>{
  for(const v of ['knight','paladin','sorcerer','druid'])expect(I.starterKit(v).Colar).toBeUndefined();
 });
 it('drop as gear from the wiki monsters that list them',()=>{
  const names=(t:string)=>M.loot(M.get(t),()=>0).map((d:any)=>d.name);
  expect(names('Archer')).toContain('Crude Ring');expect(names('Sorcerer')).toContain('Cowboy Bandana');expect(names('Behemoth')).toContain('Hawk Bandana');
  expect(find('Scarf').from).toContain('Skeleton');expect(I.shieldSource(find('Cowboy Bandana'))).toContain('Sorcerer');
 });
 it('old saves holding them as loot get real gear pieces, nothing lost',()=>{
  const p:any={loot:{'Scarf':2,'Teia':1},bag:[],depot:{items:[],loot:{'Crude Ring':1}}};
  expect(I.lootToGear(p)).toBe(3);
  expect(p.bag.map((e:any)=>e.name)).toEqual(['Scarf','Scarf']);expect(p.depot.items[0].slot).toBe('Anel');expect(p.loot).toEqual({'Teia':1});
 });
});

describe('Prison Key opens the Prison Chest',()=>{
 it('is loot dropped by the Prison Warder',()=>{
  expect(I.lootItem('Prison Key').from).toEqual(['Prison Warder']);
  expect(M.loot(M.get('Prison Warder'),()=>0).map((d:any)=>d.name)).toContain('Prison Key');
 });
 it('gives gold, Large potions for the vocation, or one wiki necklace/ring',()=>{
  const g=I.prisonRoll('knight',seq(0,0));expect(g).toEqual({gold:1000});
  expect(I.prisonRoll('knight',seq(.5,0))).toEqual({cons:'hp3',n:5});
  expect(I.prisonRoll('paladin',seq(.5,.999))).toEqual({cons:'bp1',n:10});
  expect(I.prisonRoll('druid',seq(.5,0)).cons).toBe('mp3');
  expect(I.prisonRoll('sorcerer',seq(.9,0))).toEqual({gear:'Scarf'});
  expect(I.prisonPool()).toEqual(['Scarf','Skull Bandana','Hawk Bandana','Cowboy Bandana','Crude Ring']);
 });
});

describe('wiki rings',()=>{
 const ALL=['knight','paladin','sorcerer','druid'];
 const want:Record<string,[number,number,string[],Record<string,number>,number]>={
  'Crude Ring':[5,1,ALL,{},0],'Old Ring':[10,2,ALL,{},0],'Instant Ring':[80,0,ALL,{},5],
  'Piercing Ring':[80,0,['paladin'],{distance:2},0],'Protection Ring':[80,0,['knight','paladin'],{shielding:2},0],
  'Shiver Ring':[80,0,['sorcerer','druid'],{magic:2},0],'Slash Ring':[80,0,['knight'],{sword:2},0],'Santa Ring':[90,2,ALL,{},5],
  'Focus Ring':[150,0,['paladin'],{distance:3},0],'Guardian Ring':[150,0,['knight','paladin'],{shielding:3},0],
  'Soul Ring':[150,0,['sorcerer','druid'],{magic:3},0],'Aggressive Ring':[150,0,['knight'],{sword:3},0]};
 it('all 12 wiki rings exist with the wiki level, armor, vocation and bonus; Crude Ring stays first',()=>{
  expect(I.RINGS.map((e:any)=>e.name)).toEqual(Object.keys(want));
  for(const [n,[lvl,def,voc,skill,spd]] of Object.entries(want)){const e=find(n);
   expect([e.slot,e.lvl,e.def,[...e.voc].sort(),{...e.skill},e.speed||0]).toEqual(['Anel',lvl,def,[...voc].sort(),skill,spd]);
   expect(I.gearCategory(e)).toBe('ring')}
 });
 it('bonuses apply while worn',()=>{
  expect(I.equipBonus({Anel:find('Slash Ring')}).skill).toEqual({sword:2});
  expect(I.equipBonus({Anel:find('Soul Ring')}).skill).toEqual({magic:3});
  expect(I.equipBonus({Anel:find('Instant Ring')}).speed).toBe(5);
  expect(I.equipBonus({Anel:find('Santa Ring')}).speed).toBe(5);expect(I.gearStat(find('Santa Ring'),'def')).toBe(2);
 });
 it('level and vocation limits apply',()=>{
  expect(I.canEquip(find('Slash Ring'),{level:80,voc:'knight'})).toBe('');
  expect(I.canEquip(find('Slash Ring'),{level:79,voc:'knight'})).not.toBe('');
  expect(I.canEquip(find('Slash Ring'),{level:200,voc:'paladin'})).not.toBe('');
  expect(I.canEquip(find('Protection Ring'),{level:80,voc:'paladin'})).toBe('');
  expect(I.canEquip(find('Protection Ring'),{level:80,voc:'druid'})).not.toBe('');
  expect(I.canEquip(find('Soul Ring'),{level:150,voc:'druid'})).toBe('');
 });
 it('Magic Chest rings come out of their chests',()=>{
  const adv=I.chestPool(I.chestOf('Magic Chest Advanced')),exp=I.chestPool(I.chestOf('Magic Chest Expert'));
  for(const n of ['Instant Ring','Piercing Ring','Protection Ring','Shiver Ring','Slash Ring'])expect(adv).toContain(n);
  for(const n of ['Focus Ring','Guardian Ring','Soul Ring','Aggressive Ring'])expect(exp).toContain(n);
  expect(I.shieldSource(find('Slash Ring'))).toContain('Magic Chest Advanced');
 });
 it('Old Ring and Santa Ring have no source in the game (GameMaster only)',()=>{
  for(const n of ['Old Ring','Santa Ring']){expect(find(n).from).toEqual([]);expect(Object.keys(find(n).drops)).toEqual([]);expect(I.shieldSource(find(n))).toBe('')}
 });
});
