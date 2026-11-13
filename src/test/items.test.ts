import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const scope:any={};runInNewContext(readFileSync('public/items.js','utf8'),scope);
const I=scope.LawlItems;
const TIERS=[[1,'Aprendiz'],[10,'Bronze'],[20,'Ferro']];

describe('item catalog',()=>{
 it('has exactly the 18 categories from the screenshot, in order',()=>{
  expect(I.CATEGORIES.map((c:any)=>c.en)).toEqual(['Shield','Melee','Distance','Wands','Backpack','Helmet','Armor','Legs','Boots','Necklace','Ring','Regular','Creature Product','Ammunition','Rune','Blended','Mana Potion','Health Potion']);
 });
 it('sorts weapons by vocation: knight melee, paladin distance, mages wands',()=>{
  expect(I.gearCategory({slot:'Arma',voc:['knight']})).toBe('melee');
  expect(I.gearCategory({slot:'Arma',voc:['paladin']})).toBe('distance');
  expect(I.gearCategory({slot:'Arma',voc:['sorcerer']})).toBe('wands');
  expect(I.gearCategory({slot:'Arma',voc:['druid']})).toBe('wands');
  expect(I.gearCategory({slot:'Escudo',voc:['druid']})).toBe('shield');
 });
 it('creates one necklace and one backpack per tier and vocation',()=>{
  const g=I.extraGear(TIERS);expect(g.length).toBe(4*3*2);
  expect(g.filter((e:any)=>I.gearCategory(e)==='necklace').length).toBe(12);
  expect(g.filter((e:any)=>I.gearCategory(e)==='backpack').length).toBe(12);
 });
 it('every consumable belongs to one of the 18 categories',()=>{
  const ids=I.CATEGORIES.map((c:any)=>c.id);
  for(const c of I.CONSUMABLES)expect(ids).toContain(c.cat);
 });
 it('has the five wiki health potions with wiki prices and the existing healing balance',()=>{
  expect(I.ofCategory('health').map((c:any)=>({id:c.id,nm:c.nm,price:c.price,hp:c.hp}))).toEqual([
   {id:'hp',nm:'Small Health Potion',price:40,hp:85},
   {id:'hp2',nm:'Medium Health Potion',price:110,hp:160},
   {id:'hp3',nm:'Large Health Potion',price:220,hp:300},
   {id:'hp4',nm:'Ultra Health Potion',price:350,hp:500},
   {id:'hp5',nm:'Extreme Health Potion',price:500,hp:800},
  ]);
 });
 it('uses the wiki level boundaries for every health potion',()=>{
  const cases:[string,number][]=[['hp',0],['hp2',50],['hp3',85],['hp4',130],['hp5',200]];
  for(const [id,level] of cases){
   const c=I.byId(id);
   expect(I.canUse(c,{level,voc:'knight'})).toBe('');
   if(level>0)expect(I.canUse(c,{level:level-1,voc:'knight'})).not.toBe('');
  }
 });
 it('limits Medium to Knight and Paladin and the three strongest potions to Knight',()=>{
  expect(I.canUse(I.byId('hp2'),{level:50,voc:'paladin'})).toBe('');
  for(const id of ['hp2','hp3','hp4','hp5'])expect(I.canUse(I.byId(id),{level:500,voc:'sorcerer'})).not.toBe('');
  for(const id of ['hp3','hp4','hp5'])expect(I.canUse(I.byId(id),{level:500,voc:'paladin'})).not.toBe('');
 });
 it('has the five wiki mana potions with wiki names and prices',()=>{
  expect(I.ofCategory('mana').map((c:any)=>({id:c.id,nm:c.nm,price:c.price}))).toEqual([
   {id:'mp',nm:'Small Mana Potion',price:50},
   {id:'mp2',nm:'Medium Mana Potion',price:100},
   {id:'mp3',nm:'Large Mana Potion',price:150},
   {id:'mp4',nm:'Advanced Mana Potion',price:95},
   {id:'mp5',nm:'Ultra Mana Potion',price:445},
  ]);
 });
 it('uses the wiki level boundaries for every mana potion',()=>{
  const cases:[string,number,string][]=[['mp',0,'knight'],['mp2',50,'paladin'],['mp3',85,'druid'],['mp4',85,'knight'],['mp5',130,'sorcerer']];
  for(const [id,level,voc] of cases){
   const c=I.byId(id);
   expect(I.canUse(c,{level,voc})).toBe('');
   if(level>0)expect(I.canUse(c,{level:level-1,voc})).not.toBe('');
  }
 });
 it('limits mana potions to the wiki vocations',()=>{
  for(const id of ['mp2','mp3'])for(const voc of ['sorcerer','druid','paladin'])expect(I.canUse(I.byId(id),{level:500,voc})).toBe('');
  for(const id of ['mp2','mp3','mp5'])expect(I.canUse(I.byId(id),{level:500,voc:'knight'})).not.toBe('');
  for(const voc of ['sorcerer','druid','paladin'])expect(I.canUse(I.byId('mp4'),{level:500,voc})).not.toBe('');
  expect(I.canUse(I.byId('mp5'),{level:500,voc:'paladin'})).not.toBe('');
  for(const voc of ['knight','paladin','sorcerer','druid'])expect(I.canUse(I.byId('mp'),{level:1,voc})).toBe('');
 });
 it('potion buttons default to the original potions and accept any health or mana potion',()=>{
  expect(I.normalizePotSlots(undefined)).toEqual({hp:'hp',mp:'mp'});
  expect(I.normalizePotSlots({hp:'mp5',mp:'hp3'})).toEqual({hp:'mp5',mp:'hp3'});
  expect(I.normalizePotSlots({hp:'mix2',mp:'mix1'})).toEqual({hp:'hp',mp:'mp'});
  expect(I.normalizePotSlots({hp:'rfire',mp:'hack'})).toEqual({hp:'hp',mp:'mp'});
 });
 it('removed the three old mixed potions from the game and from saved backpacks',()=>{
  for(const id of ['mix1','mix2','mix3'])expect(I.byId(id)).toBeNull();
  expect(I.normalizeCons({mix1:5,mix2:1,mix3:9,mp5:2})).toEqual({mp5:2});
 });
 it('has the two wiki blended potions with wiki names, levels and prices, Paladin only',()=>{
  expect(I.ofCategory('blended').map((c:any)=>({nm:c.nm,lvl:c.lvl,price:c.price}))).toEqual([
   {nm:'Large Blended Potion',lvl:85,price:235},
   {nm:'Ultra Blended Potion',lvl:130,price:445},
  ]);
  for(const c of I.ofCategory('blended')){
   expect(c.hp).toBeGreaterThan(0);expect(c.mp).toBeGreaterThan(0);
   expect(I.canUse(c,{level:c.lvl,voc:'paladin'})).toBe('');
   expect(I.canUse(c,{level:c.lvl-1,voc:'paladin'})).not.toBe('');
   for(const voc of ['knight','sorcerer','druid'])expect(I.canUse(c,{level:500,voc})).not.toBe('');
  }
  expect(I.normalizePotSlots({hp:'bp1',mp:'bp2'})).toEqual({hp:'bp1',mp:'bp2'});
 });
 it('has the 13 wiki runes in wiki order with wiki levels and shop prices',()=>{
  expect(I.ofCategory('rune').map((c:any)=>[c.nm,c.lvl])).toEqual([
   ['Energy Blast',1],['Earth Blast',1],['Fire Blast',1],['Ice Blast',1],
   ['Energy Ball',25],['Earth Ball',25],['Fire Ball',25],['Ice Ball',25],
   ['Outbreak',30],['Spirit of Doom',45],['Life Healing',0],['Paralyze',60],['Magic Field',40]]);
  const price=(nm:string)=>I.ofCategory('rune').find((c:any)=>c.nm===nm).price;
  for(const nm of ['Energy Blast','Earth Blast','Fire Blast','Ice Blast'])expect(price(nm)).toBe(12);
  for(const nm of ['Energy Ball','Earth Ball','Fire Ball','Ice Ball'])expect(price(nm)).toBe(57);
  expect(price('Outbreak')).toBe(31);expect(price('Spirit of Doom')).toBe(135);
 });
 it('uses the wiki damage element of each rune',()=>{
  const el=(nm:string)=>I.ofCategory('rune').find((c:any)=>c.nm===nm).el;
  expect(['Energy Blast','Earth Blast','Fire Blast','Ice Blast'].map(el)).toEqual(['energy','earth','fire','ice']);
  expect(['Energy Ball','Earth Ball','Fire Ball','Ice Ball'].map(el)).toEqual(['energy','earth','fire','ice']);
  expect(el('Outbreak')).toBe('phys');expect(el('Spirit of Doom')).toBe('death');
 });
 it('limits Outbreak to mages and Spirit of Doom to mages and Paladin',()=>{
  const ob=I.byId('rblast'),sd=I.byId('rdeath');
  for(const voc of ['sorcerer','druid'])expect(I.canUse(ob,{level:30,voc})).toBe('');
  for(const voc of ['knight','paladin'])expect(I.canUse(ob,{level:500,voc})).not.toBe('');
  for(const voc of ['sorcerer','druid','paladin'])expect(I.canUse(sd,{level:45,voc})).toBe('');
  expect(I.canUse(sd,{level:500,voc:'knight'})).not.toBe('');
 });
 it('balls hit 3×3, Outbreak hits a bigger 5×5 area without corners, Magic Field covers 3×3',()=>{
  expect(I.runeCells(I.byId('rfire'),10,10).length).toBe(9);
  const ob=I.runeCells(I.byId('rblast'),10,10);
  expect(ob.length).toBe(21);
  expect(ob).not.toContainEqual([8,8]);expect(ob).toContainEqual([12,10]);
  expect(I.runeCells(I.byId('rfield'),10,10).length).toBe(9);
 });
 it('keeps old rune saves: the retired heal rune stays usable but leaves the shops',()=>{
  expect(I.normalizeCons({rheal2:3,rfire:2})).toEqual({rheal2:3,rfire:2});
  expect(I.ofCategory('rune').some((c:any)=>c.id==='rheal2')).toBe(false);
 });
 it('counts the chosen potion from the original stacks or the backpack',()=>{
  const pl={hpPot:4,mpPot:7,cons:{mp5:3}};
  expect(I.potionCount(I.byId('hp'),pl)).toBe(4);
  expect(I.potionCount(I.byId('mp'),pl)).toBe(7);
  expect(I.potionCount(I.byId('mp5'),pl)).toBe(3);
  expect(I.potionCount(I.byId('hp2'),pl)).toBe(0);
 });
 it('has two rune buttons that start empty and only keep real rune ids',()=>{
  expect(I.normalizeRuneSlots(undefined)).toEqual([null,null]);
  expect(I.normalizeRuneSlots(['rfire','rfield','rpara'])).toEqual(['rfire','rfield']);
  expect(I.normalizeRuneSlots(['hp','hack'])).toEqual([null,null]);
 });
 it('rune picker lists the 13 wiki runes and a retired rune only while the player still has it',()=>{
  expect(I.runeList({cons:{}}).length).toBe(13);
  expect(I.runeList({cons:{rheal2:2}}).map((c:any)=>c.id)).toContain('rheal2');
 });
 it('blocks ammo for non-paladins',()=>{
  expect(I.canUse(I.byId('arrow'),{level:50,voc:'knight'})).not.toBe('');
  expect(I.canUse(I.byId('arrow'),{level:1,voc:'paladin'})).toBe('');
 });
 it('rune power grows with level and magic level',()=>{
  const r=I.byId('rmissile');
  expect(I.runePower(r,1,0,.5)).toBe(15);
  expect(I.runePower(r,100,50,.5)).toBeGreaterThan(I.runePower(r,10,5,.5));
 });
 it('drops unknown, legacy and invalid saved counts',()=>{
  expect(I.normalizeCons({hp:5,hack:9,hp2:-1,mp3:2.7,rfire:'4'})).toEqual({mp3:2,rfire:4});
 });
});
