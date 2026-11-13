import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const scope:any={};runInNewContext(readFileSync('public/items.js','utf8'),scope);
const I=scope.LawlItems;
const find=(n:string)=>I.WIKI_GEAR.find((e:any)=>e.name===n);

describe('wiki helmets, armors and legs',()=>{
 it('adds the 49 helmets, 46 armors and 46 legs of the wiki in their slots and categories',()=>{
  expect([I.helmetGear().length,I.armorGear().length,I.legsGear().length]).toEqual([49,46,46]);
  for(const e of I.helmetGear()){expect(e.slot).toBe('Capacete');expect(I.gearCategory(e)).toBe('helmet')}
  for(const e of I.armorGear()){expect(e.slot).toBe('Armadura');expect(I.gearCategory(e)).toBe('armor')}
  for(const e of I.legsGear()){expect(e.slot).toBe('Calças');expect(I.gearCategory(e)).toBe('legs')}
 });
 it('Fiery Helmet: Knight only, level 450, armor 14, fire 6%, +2 melee and +3 shielding',()=>{
  const h=find('Fiery Helmet');expect([h.lvl,h.def,h.voc]).toEqual([450,14,['knight']]);
  expect(I.equipBonus({Capacete:h})).toEqual({skill:{sword:2,shielding:3},res:{fire:6}});
 });
 it('Holy Plate: Paladin only, armor 15, death 9%, +4 distance and +5 speed',()=>{
  const a=find('Holy Plate');expect([a.lvl,a.def,a.voc]).toEqual([450,15,['paladin']]);
  expect(I.equipBonus({Armadura:a})).toEqual({skill:{distance:4},res:{death:9},speed:5});
 });
 it('Luster Legs is for Sorcerer and Druid with a magic bonus',()=>{
  const l=find('Luster Legs');expect(l.voc).toEqual(['sorcerer','druid']);expect(l.skill.magic).toBeGreaterThan(0);
 });
 it('Oblivion Armor resists death 4% and fire 5%; full set bonuses add up',()=>{
  expect(find('Oblivion Armor').res).toEqual({death:4,fire:5});
  const b=I.equipBonus({Capacete:find('Fiery Helmet'),Armadura:find('Fiery Armor'),'Calças':find('Fiery Legs')});
  expect(b.skill).toEqual({sword:10,shielding:9});expect(b.res.fire).toBe(22);
 });
 it('vocation and level limits apply',()=>{
  const h=find('Fiery Helmet');
  expect(I.canEquip(h,{level:450,voc:'paladin'})).not.toBe('');
  expect(I.canEquip(h,{level:449,voc:'knight'})).not.toBe('');
  expect(I.canEquip(h,{level:450,voc:'knight'})).toBe('');
  expect(I.canEquip(find('Chain Armor'),{level:1,voc:'druid'})).toBe('');
 });
 it('smith prices from the wiki: Chain Helmet 150 (sells 40), Golden Armor 750, Iron Legs 500',()=>{
  expect([find('Chain Helmet').price,find('Chain Helmet').sell,find('Golden Armor').price,find('Iron Legs').price]).toEqual([150,40,750,500]);
  expect(find('Chain Helmet').shop).toBe(true);expect(find('Fiery Helmet').shop).toBe(false);
 });
 it('every piece can drop from a monster of the game',()=>{
  for(const e of [...I.HELMETS,...I.ARMORS,...I.LEGS])expect(Object.keys(e.drops).length).toBeGreaterThan(0);
 });
 it('worn pieces use the catalog armor value, not saved numbers',()=>{
  expect(I.gearStat({name:'Thunder Armor',def:999},'def')).toBe(20);
 });
});
