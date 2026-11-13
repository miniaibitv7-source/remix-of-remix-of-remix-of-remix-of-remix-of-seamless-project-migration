import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const scope:any={};runInNewContext(readFileSync('public/items.js','utf8'),scope);
const I=scope.LawlItems;
const find=(n:string)=>I.WIKI_GEAR.find((e:any)=>e.name===n);

describe('wiki boots',()=>{
 it('adds the 14 wiki boots in the Botas slot, usable by every vocation',()=>{
  expect(I.bootsGear().length).toBe(14);
  for(const e of I.bootsGear()){expect(e.slot).toBe('Botas');expect(I.gearCategory(e)).toBe('boots');expect(e.voc.length).toBe(4)}
 });
 it('Dragon Boots: level 60, armor 2, fire 2% and +10 speed',()=>{
  const b=find('Dragon Boots');expect([b.lvl,b.def]).toEqual([60,2]);
  expect(I.equipBonus({Botas:b})).toEqual({skill:{},res:{fire:2},speed:10});
 });
 it('Oblivion Boots resist death 2% and fire 2% with +20 speed',()=>{
  expect(I.equipBonus({Botas:find('Oblivion Boots')})).toEqual({skill:{},res:{death:2,fire:2},speed:20});
 });
 it('Hasty Boots gives +30 speed and no armor',()=>{
  const b=find('Hasty Boots');expect(b.def).toBe(0);expect(I.equipBonus({Botas:b}).speed).toBe(30);
 });
 it('boots speed adds to the rest of the set',()=>{
  expect(I.equipBonus({Botas:find('Frost Boots'),Armadura:find('Holy Plate')}).speed).toBe(20);
 });
 it('Leather Boots is sold by the smith for 100 and bought back for 50; Iron Boots sells for 16500',()=>{
  const l=find('Leather Boots');expect([l.price,l.sell,l.shop]).toEqual([100,50,true]);
  expect(find('Iron Boots').sell).toBe(16500);expect(find('Iron Boots').shop).toBe(false);
 });
 it('level limit applies',()=>{
  expect(I.canEquip(find('Hell Boots'),{level:299,voc:'knight'})).not.toBe('');
  expect(I.canEquip(find('Hell Boots'),{level:300,voc:'druid'})).toBe('');
 });
 it('every boot but the quest-only Enchanted Boots drops from a game monster',()=>{
  for(const e of I.BOOTS)if(e.name!=='Enchanted Boots')expect(Object.keys(e.drops).length).toBeGreaterThan(0);
  expect(I.rollShieldDrops('Dragão',()=>0)).toContain('Dragon Boots');
 });
 it('Grooved Boots can come from the Magic Chest Master',()=>{
  expect(I.chestPool(I.chestOf('Magic Chest Master'))).toContain('Grooved Boots');
 });
});
