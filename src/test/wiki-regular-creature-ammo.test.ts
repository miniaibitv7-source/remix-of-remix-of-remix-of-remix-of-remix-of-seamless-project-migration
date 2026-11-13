import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const scope:any={};runInNewContext(readFileSync('public/items.js','utf8'),scope);
const I=scope.LawlItems;
const loot=(n:string)=>I.lootItem(n);

describe('wiki regular items and creature products',()=>{
 it('adds the 69 regular items (plus the Prison Key) and 86 creature products of the wiki',()=>{
  expect(I.LOOT_ITEMS.filter((x:any)=>x.cat==='regular').length).toBe(70);
  expect(I.LOOT_ITEMS.filter((x:any)=>x.cat==='creature').length).toBe(86);
 });
 it('Mercador prices from the wiki: Demon Horn 550, Dragon Claw 500, Warrior Token 500, Hero Token not sellable',()=>{
  expect([loot('Demon Horn').sell,loot('Dragon Claw').sell,loot('Warrior Token').sell,loot('Hero Token').sell]).toEqual([550,500,500,0]);
 });
 it('Demon Horn drops from Demônio; quest-only symbols have no drop',()=>{
  expect(I.rollLootDrops('Demônio',()=>0)).toContain('Demon Horn');
  expect(Object.keys(loot('Allure Symbol').drops)).toEqual([]);
  expect(I.rollLootDrops('Demônio',()=>0.99)).toEqual([]);
 });
});

describe('magic chests',()=>{
 it('9 chests, each opened by the Magic Key of the same tier',()=>{
  expect(I.CHESTS.length).toBe(9);
  for(const c of I.CHESTS){expect(c.key).toBe(c.name.replace('Chest','Key'));expect(loot(c.key)).toBeTruthy()}
 });
 it('Magic Chest Apex can give Fiery Helmet or gold, never gear missing from the game',()=>{
  const c=I.chestOf('Magic Chest Apex');expect(I.chestPool(c)).toContain('Fiery Helmet');
  expect(I.chestRoll(c,()=>0.1).gold).toBeGreaterThanOrEqual(c.min);
  const seq=[0.9,0];expect(I.chestRoll(c,()=>seq.shift()).gear).toBe(I.chestPool(c)[0]);
  for(const c2 of I.CHESTS)for(const n of I.chestPool(c2))expect(I.shieldByName(n)).toBeTruthy();
 });
});

describe('wiki ammunition',()=>{
 it('8 wiki ammo in the store with wiki attack as bonus',()=>{
  expect(I.ofCategory('ammo').map((x:any)=>[x.nm,x.bonus,x.lvl])).toEqual([['Arrow',9,1],['Hunting Arrow',11,10],['Bolt',10,20],['Explosive Arrow',4,25],['Heavy Bolt',11,50],['Flash Arrow',12,90],['Cursed Bolt',14,100],['Flare Bolt',5,150]]);
 });
 it('wiki price per unit × 100: Arrow 200, Cursed Bolt 6000',()=>{
  expect([I.byId('arrow').price,I.byId('cursedbolt').price]).toEqual([200,6000]);
 });
 it('arrows need a bow and bolts need a crossbow',()=>{
  const bow={Arma:{name:'Bow'}},xbow={Arma:{name:'Iron Crossbow'}};
  expect([I.ammoFits(I.byId('arrow'),bow),I.ammoFits(I.byId('arrow'),xbow)]).toEqual([true,false]);
  expect([I.ammoFits(I.byId('bolt'),xbow),I.ammoFits(I.byId('bolt'),bow),I.ammoFits(I.byId('bolt'),{})]).toEqual([true,false,false]);
 });
 it('older ammo stays usable but leaves the store',()=>{
  expect(I.byId('firearrow').retired).toBe(true);expect(I.ammoFits(I.byId('firearrow'),{Arma:{name:'Bow'}})).toBe(true);
 });
});

describe('wiki ammunition effects',()=>{
 it('Flash Arrow hits with energy, Cursed Bolt with death, Explosive Arrow and Flare Bolt with fire in an area',()=>{
  expect(['flasharrow','cursedbolt','explarrow','flarebolt'].map(id=>[I.byId(id).el,!!I.byId(id).burst])).toEqual([['energy',false],['death',false],['fire',true],['fire',true]]);
  expect(I.byId('arrow').el).toBeUndefined();
 });
 it('the ammo bonus share of the hit moves to the ammo element and the total stays the same',()=>{
  expect(I.ammoMix({phys:100},48,12,'energy')).toEqual({phys:75,energy:25});
  expect(I.ammoMix({phys:100},48,12,null)).toEqual({phys:100});
  expect(I.mixTotal(48,I.ammoMix({phys:100},48,12,'death'))).toBe(48);
 });
 it('Demônio drops 3 to 8 Cursed Bolts, Dragão drops Explosive Arrows, Orc drops Arrows',()=>{
  expect(I.rollAmmoDrops('Demônio',()=>0).map((x:any)=>[x.id,x.n])).toEqual([['cursedbolt',3]]);
  const hi=[0,0.999];expect(I.rollAmmoDrops('Demônio',()=>hi.shift()).map((x:any)=>x.n)).toEqual([8]);
  expect(I.rollAmmoDrops('Dragão',()=>0).map((x:any)=>x.id)).toEqual(['explarrow']);
  expect(I.rollAmmoDrops('Orc',()=>0).map((x:any)=>x.id)).toEqual(['arrow']);
  expect(I.rollAmmoDrops('Demônio',()=>0.99)).toEqual([]);
 });
 it('dropped ammo on the ground is recognised by its name',()=>{
  expect(I.ammoByName('Cursed Bolt').id).toBe('cursedbolt');expect(I.ammoByName('Demon Horn')).toBeNull();
 });
});
