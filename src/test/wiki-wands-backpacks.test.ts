import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const scope:any={};runInNewContext(readFileSync('public/items.js','utf8'),scope);
const sp:any={};runInNewContext(readFileSync('public/spells.js','utf8'),sp);
const I=scope.LawlItems;
const wand=(n:string)=>I.wandGear().find((e:any)=>e.name===n);
const bp=(n:string)=>I.backpackGear().find((e:any)=>e.name===n);

describe('wiki wands',()=>{
 it('adds the 75 wiki wands (20 base + 55 enchanted) for Sorcerer and Druid in the Varinhas category',()=>{
  const all=I.wandGear();expect(all.length).toBe(75);
  for(const e of all){expect(e.voc).toEqual(['sorcerer','druid']);expect(I.gearCategory(e)).toBe('wands');expect(e.slot).toBe('Arma')}
 });
 it('Demon Wand: level 130, 21 mana per shot, 150-180 fire damage, +3 magic',()=>{
  const d=wand('Demon Wand');expect(d.lvl).toBe(130);
  expect(I.wandShot({Arma:d})).toMatchObject({mp:21,min:150,max:180,el:'fire'});
  expect(I.equipBonus({Arma:d})).toEqual({skill:{magic:3},res:{}});
  expect(I.damageMix({Arma:d})).toEqual({fire:100});
 });
 it('Demon Wand (DE) shoots death and adds +6 magic only for death spells and runes',()=>{
  const d=wand('Demon Wand (DE)');expect(I.damageMix({Arma:d})).toEqual({death:100});
  expect(I.equipBonus({Arma:d}).elMagic).toEqual({death:6});
 });
 it('wand shots roll between min and max damage',()=>{
  const w=I.wandShot({Arma:{name:'Oblivion Wand'}});
  expect([I.wandRoll(w,0),I.wandRoll(w,1)]).toEqual([220,260]);
 });
 it('elemental magic bonus raises only spells of that element',()=>{
  const fire=sp.LawlSpells.SPELLS?.find?.((s:any)=>s.w==='exori gran flam')??{src:'ml',el:'fire',f:[2.8,16,4.4,28]};
  const energy={...fire,el:'energy'};
  const st={level:100,ml:50,mlEl:{fire:6}};
  expect(sp.LawlSpells.range(fire,st)[0]).toBeGreaterThan(sp.LawlSpells.range(energy,st)[0]);
 });
 it('smith sells Training Wand 500, Novice Wand 150, Misty Wand 500, Noble Wand 3000, Wand of Death 5000',()=>{
  expect(I.wandGear().filter((e:any)=>e.shop).map((e:any)=>[e.name,e.price])).toEqual([['Training Wand',500],['Novice Wand',150],['Misty Wand',500],['Noble Wand',3000],['Wand of Death',5000]]);
 });
});

describe('wiki backpacks',()=>{
 it('adds the 23 wiki backpacks for every vocation in the Mochila slot',()=>{
  const all=I.backpackGear();expect(all.length).toBe(23);
  for(const e of all){expect(e.slot).toBe('Mochila');expect(e.voc.length).toBe(4);expect(I.gearCategory(e)).toBe('backpack')}
 });
 it('slots from the wiki: Green 15, Demon 60, Oblivion 100',()=>{
  expect([bp('Green Backpack').slots,bp('Demon Backpack').slots,bp('Oblivion Backpack').slots]).toEqual([15,60,100]);
 });
 it('bag holds 5 items without a backpack and exactly the backpack slots with one',()=>{
  expect(I.bagCapacity({})).toBe(5);
  expect(I.bagCapacity({Mochila:{name:'Demon Backpack'}})).toBe(I.BACKPACKS.find((b:any)=>b.name==='Demon Backpack').slots);
 });
 it('sell prices from the wiki: Brown 100, Red 15000, White 20000',()=>{
  expect([bp('Brown Backpack').sell,bp('Red Backpack').sell,bp('White Backpack').sell]).toEqual([100,15000,20000]);
 });
});
