import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const scope:any={};runInNewContext(readFileSync('public/items.js','utf8'),scope);
const I=scope.LawlItems;
const g=()=>I.shieldGear();
const by=(n:string)=>g().find((e:any)=>e.name===n);

describe('wiki shields and spellbooks',()=>{
 it('adds 21 shields for Knight/Paladin and 14 spellbooks for Sorcerer/Druid, all in the Shield tab',()=>{
  const all=g();expect(all.length).toBe(35);
  expect(all.filter((e:any)=>e.voc.join()==='knight,paladin').length).toBe(21);
  expect(all.filter((e:any)=>e.voc.join()==='sorcerer,druid').length).toBe(14);
  for(const e of all)expect(I.gearCategory(e)).toBe('shield');
 });
 it('keeps the wiki stats: Dragon Shield def 26, level 50, +2 shielding, fire 2%',()=>{
  const d=by('Dragon Shield');expect([d.def,d.lvl]).toEqual([26,50]);
  expect(I.equipBonus({Escudo:d})).toEqual({skill:{shielding:2},res:{fire:2}});
  expect(I.equipBonus({Escudo:by('Oblivion Spellbook')})).toEqual({skill:{magic:5},res:{death:4,fire:3}});
 });
 it('the smith sells only Chain, Soldier, Viking and Gladiator at the wiki prices',()=>{
  expect(g().filter((e:any)=>e.shop).map((e:any)=>[e.name,e.price])).toEqual([['Chain Shield',30],['Soldier Shield',150],['Viking Shield',1500],['Gladiator Shield',3000]]);
 });
 it('sells back at the wiki sell price; older gear keeps half price',()=>{
  expect(I.smithSellPrice(by('Dragon Shield'))).toBe(22000);
  expect(I.smithSellPrice(by('Hell Shield'))).toBe(0);
  expect(I.smithSellPrice({name:'Escudo de Ferro',price:100})).toBe(50);
 });
 it('blocks equipping a shield of another vocation, except for the GM',()=>{
  expect(I.canEquip(by('Chain Shield'),{level:10,voc:'sorcerer'})).not.toBe('');
  expect(I.canEquip(by('Chain Shield'),{level:10,voc:'paladin'})).toBe('');
  expect(I.canEquip(by('Apprentice Spellbook'),{level:20,voc:'knight'})).not.toBe('');
  expect(I.canEquip(by('Apprentice Spellbook'),{level:20,voc:'druid'})).toBe('');
  expect(I.canEquip(by('Apprentice Spellbook'),{level:19,voc:'druid'})).not.toBe('');
  expect(I.canEquip(by('Apprentice Spellbook'),{level:1,voc:'knight'},true)).toBe('');
 });
 it('resistance cuts matching damage by its percentage',()=>{
  expect(I.resistHit(100,2)).toBe(98);
  expect(I.resistHit(100,0)).toBe(100);
  expect(I.resistHit(1,50)).toBe(1);
  expect(I.hitElement('Dragão')).toBe('fire');
  expect(I.hitElement('Rato')).toBe('phys');
 });
 it('bonuses come from the catalog, not from numbers in the save',()=>{
  expect(I.equipBonus({Escudo:{name:'Dragon Shield',skill:{shielding:99},res:{fire:99}}})).toEqual({skill:{shielding:2},res:{fire:2}});
 });
 it('every shield drops from at least one game monster with a low chance',()=>{
  for(const s of I.SHIELDS){const c=Object.values(s.drops) as number[];expect(c.length).toBeGreaterThan(0);for(const x of c)expect(x).toBeLessThanOrEqual(.05)}
  expect(I.rollShieldDrops('Dragão',()=>0)).toEqual(expect.arrayContaining(['Dragon Shield']));
  expect(I.rollShieldDrops('Dragão',()=>.99)).toEqual([]);
 });
});
