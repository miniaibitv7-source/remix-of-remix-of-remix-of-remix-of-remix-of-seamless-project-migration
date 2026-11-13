import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const scope:any={};runInNewContext(readFileSync('public/items.js','utf8'),scope);
const I=scope.LawlItems;
const by=(n:string)=>I.meleeGear().find((e:any)=>e.name===n);

describe('wiki melee weapons',()=>{
 it('adds the 144 wiki melee weapons for Knight in the Melee tab (34 base + 110 enchanted)',()=>{
  const all=I.meleeGear();expect(all.length).toBe(144);
  expect(all.filter((e:any)=>/\((DE|EA|EN|FI|IC)\)$/.test(e.name)).length).toBe(110);
  for(const e of all){expect(e.voc).toEqual(['knight']);expect(e.slot).toBe('Arma');expect(I.gearCategory(e)).toBe('melee')}
 });
 it('keeps the wiki stats: Claymore atk 42, def 26, level 50, +1 melee, +1 shielding',()=>{
  const c=by('Claymore');expect([c.atk,c.def,c.lvl]).toEqual([42,26,50]);
  expect(I.equipBonus({Arma:c})).toEqual({skill:{sword:1,shielding:1},res:{}});
  expect(I.gearStat({name:'Oblivion Axe',atk:999},'atk')).toBe(59);
 });
 it('wears a weapon bonus together with the shield bonus',()=>{
  expect(I.equipBonus({Arma:by('Frost Sword'),Escudo:I.shieldByName('Dragon Shield')})).toEqual({skill:{sword:1,shielding:5},res:{fire:2}});
 });
 it('enchanted weapons hit 85% element + 20% physical; plain ones 100% physical',()=>{
  expect(I.damageMix({Arma:by('Claymore (FI)')})).toEqual({fire:85,phys:20});
  expect(I.damageMix({Arma:by('Claymore')})).toEqual({phys:100});
  expect(I.mixTotal(100,{fire:85,phys:20})).toBe(105);
  expect(I.mixTotal(100,{phys:100})).toBe(100);
  expect(I.mainElement({ice:85,phys:20})).toBe('ice');
 });
 it('each element part of an enchanted hit is cut by its own resistance',()=>{
  expect(I.mixedResist(105,{fire:85,phys:20},(k:string)=>k==='fire'?10:0)).toBe(97);
  expect(I.mixedResist(105,{fire:85,phys:20},()=>0)).toBe(105);
  expect(I.sanitizeMix({fire:500})).toBe(null);
  expect(I.sanitizeMix({poison:50})).toBe(null);
 });
 it('two-handed weapons cannot be worn with a shield',()=>{
  const shield=I.shieldByName('Dragon Shield');
  expect(I.handConflict({Escudo:shield},by('Demon Axe'))).toBe('Escudo');
  expect(I.handConflict({Arma:by('Demon Axe')},shield)).toBe('Arma');
  expect(I.handConflict({Escudo:shield},by('Demon Sword'))).toBe(null);
  const pl:any={equip:{Arma:by('Ice Axe'),Escudo:shield},bag:[]};
  expect(I.fixTwoHanded(pl).name).toBe('Dragon Shield');expect(pl.equip.Escudo).toBeUndefined();expect(pl.bag.length).toBe(1);
 });
 it('the smith sells only Training Knife, Dagger, Short Sword, Sabre and Corsair Cutlass at the wiki prices',()=>{
  expect(I.meleeGear().filter((e:any)=>e.shop).map((e:any)=>[e.name,e.price])).toEqual([['Training Knife',500],['Dagger',150],['Short Sword',500],['Sabre',3000],['Corsair Cutlass',5000]]);
 });
 it('sells back at the wiki sell price',()=>{
  expect(I.smithSellPrice(by('Claymore'))).toBe(22000);
  expect(I.smithSellPrice(by('Claymore (FI)'))).toBe(22000);
  expect(I.smithSellPrice(by('Demon Sword'))).toBe(44000);
  expect(I.smithSellPrice(by('Demon Sword (DE)'))).toBe(0);
 });
 it('only Knights of the required level can equip them',()=>{
  expect(I.canEquip(by('Claymore'),{level:50,voc:'knight'})).toBe('');
  expect(I.canEquip(by('Claymore'),{level:49,voc:'knight'})).not.toBe('');
  expect(I.canEquip(by('Claymore'),{level:50,voc:'paladin'})).not.toBe('');
 });
 it('every weapon drops from a game monster with a low chance',()=>{
  for(const e of I.MELEE){const c=Object.values(e.drops) as number[];expect(c.length).toBeGreaterThan(0);for(const x of c)expect(x).toBeLessThanOrEqual(.05)}
  expect(I.rollShieldDrops('Azaroth, Arquidemônio',()=>0)).toEqual(expect.arrayContaining(['Oblivion Axe','Demon Sword (FI)']));
 });
});
