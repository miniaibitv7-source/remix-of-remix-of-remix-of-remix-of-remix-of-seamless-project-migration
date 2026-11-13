import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const scope:any={};runInNewContext(readFileSync('public/items.js','utf8'),scope);
const I=scope.LawlItems;
const by=(n:string)=>I.distanceGear().find((e:any)=>e.name===n);

describe('wiki distance weapons',()=>{
 it('adds the 143 wiki distance weapons for Paladin (33 base + 110 enchanted)',()=>{
  const all=I.distanceGear();expect(all.length).toBe(143);
  for(const e of all){expect(e.voc).toEqual(['paladin']);expect(I.gearCategory(e)).toBe('distance')}
 });
 it('Demon Bow: atk 50, level 130, +2 distance, +2 speed',()=>{
  const d=by('Demon Bow');expect([d.atk,d.lvl]).toEqual([50,130]);
  expect(I.equipBonus({Arma:d})).toEqual({skill:{distance:2},res:{},speed:2});
 });
 it('crossbows are two-handed: Oblivion Crossbow atk 60, +5 distance',()=>{
  const c=by('Oblivion Crossbow');expect([c.atk,c.lvl]).toEqual([60,500]);expect(I.isTwoHanded(c)).toBe(true);
  expect(I.isTwoHanded(by('Oblivion Bow'))).toBe(false);expect(I.equipBonus({Arma:c})).toEqual({skill:{distance:5},res:{}});
 });
 it('enchanted Demon Bow (FI) hits 85% fire + 20% physical',()=>{
  expect(I.damageMix({Arma:by('Demon Bow (FI)')})).toEqual({fire:85,phys:20});
 });
 it('all 143 match the GM "Armas de distância" stage filter (wiki, slot Arma, paladin) and none matches the melee stage',()=>{
  const all=I.distanceGear();
  expect(all.filter((e:any)=>e.wiki&&e.slot==='Arma'&&e.voc.includes('paladin')).length).toBe(143);
  expect(all.filter((e:any)=>e.voc.includes('knight')).length).toBe(0);
 });
 it('smith sells Training Bow 500, Bow 150, Stable Bow 500',()=>{
  expect(I.distanceGear().filter((e:any)=>e.shop).map((e:any)=>[e.name,e.price])).toEqual([['Training Bow',500],['Bow',150],['Stable Bow',500]]);
  expect(by('Bow').sell).toBe(40);
 });
});
