import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const scope:any={};runInNewContext(readFileSync('public/items.js','utf8'),scope);
const I=scope.LawlItems;
const by=(n:string)=>I.shieldGear().find((e:any)=>e.name===n);

describe('equipped shield bonuses',()=>{
 it('uses the catalog defense even when the saved copy says otherwise',()=>{
  expect(I.gearStat({...by('Dragon Shield'),def:999},'def')).toBe(26);
  expect(I.gearStat(by('Chain Shield'),'def')).toBe(12);
 });
 it('a Dragon Shield adds +2 Defesa skill and 2% fire resistance as soon as it is worn',()=>{
  expect(I.equipBonus({})).toEqual({skill:{},res:{}});
  expect(I.equipBonus({Escudo:by('Dragon Shield')})).toEqual({skill:{shielding:2},res:{fire:2}});
 });
 it('a Demon Spellbook adds +3 Magia and 6% fire resistance',()=>{
  expect(I.equipBonus({Escudo:by('Demon Spellbook')})).toEqual({skill:{magic:3},res:{fire:6}});
 });
 it('resistance lowers damage of that element: 100 fire damage with 6% becomes 94',()=>{
  expect(I.resistHit(100,6)).toBe(94);
  expect(I.resistHit(100,0)).toBe(100);
 });
});
