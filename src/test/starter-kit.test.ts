import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const scope:any={};runInNewContext(readFileSync('public/items.js','utf8'),scope);
const I=scope.LawlItems;
const names=(kit:any)=>Object.fromEntries(Object.entries(kit).map(([k,v]:any)=>[k,v.name]));

describe('starter kit',()=>{
 it('each vocation starts with the weakest level-1 gear of its vocation and the weakest backpack',()=>{
  const body={Capacete:'Chain Helmet',Armadura:'Chain Armor','Calças':'Chain Legs',Botas:'Leather Boots'};
  expect(names(I.starterKit('knight'))).toEqual({Arma:'Training Knife',Escudo:'Wooden Shield',Mochila:'Green Backpack',...body});
  expect(names(I.starterKit('paladin'))).toEqual({Arma:'Training Bow',Escudo:'Wooden Shield',Mochila:'Green Backpack',...body});
  expect(names(I.starterKit('sorcerer'))).toEqual({Arma:'Training Wand',Mochila:'Green Backpack',...body});
  expect(names(I.starterKit('druid'))).toEqual({Arma:'Training Wand',Mochila:'Green Backpack',...body});
 });
 it('gear added in a later update joins the kit when it is the weakest for its slot',()=>{
  const cap={name:'Leather Helmet',slot:'Capacete',voc:['knight'],lvl:1,atk:0,def:1,price:10,skill:{},res:{}};
  const kit=I.starterKit('knight',[...I.WIKI_GEAR,cap,{...cap,name:'Steel Helmet',def:5}]);
  expect(kit.Capacete.name).toBe('Leather Helmet');
 });
 it('never gives gear above level 1, retired gear or gear of another vocation',()=>{
  const kit=I.starterKit('sorcerer',[...I.WIKI_GEAR,{name:'Capacete de Aprendiz',slot:'Capacete',voc:['sorcerer'],lvl:1,tier:0,def:1}]);
  expect(kit.Capacete.name).toBe('Chain Helmet');expect(kit.Escudo).toBeUndefined();
 });
});

describe('backpack spaces',()=>{
 it('without a backpack the bag has 5 spaces; Green Backpack has 15',()=>{
  expect(I.bagCapacity({})).toBe(5);
  expect(I.bagCapacity({Mochila:{name:'Green Backpack'}})).toBe(15);
 });
 it('every gear piece and every potion or consumable stack takes one space',()=>{
  expect(I.bagUsed({bag:[{slot:'Arma'},{slot:'Escudo'}],hpPot:3,mpPot:0,cons:{arrow:100}})).toBe(4);
 });
 it('adding to a stack already held needs no new space',()=>{
  const pl={bag:[],hpPot:2,mpPot:0,cons:{arrow:5}};
  expect(I.bagNeed(pl,{hpPot:1,cons:{arrow:10}})).toBe(0);
  expect(I.bagNeed(pl,{mpPot:1,gear:2})).toBe(3);
 });
 it('older characters without any backpack get a Green Backpack only once',()=>{
  const pl:any={voc:'druid',equip:{},bag:[],depot:{items:[]}};
  expect(I.grantStarterBag(pl).name).toBe('Green Backpack');expect(pl.equip.Mochila.name).toBe('Green Backpack');
  delete pl.equip.Mochila;expect(I.grantStarterBag(pl)).toBeNull();expect(pl.equip.Mochila).toBeUndefined();
  const owns:any={voc:'knight',equip:{},bag:[{slot:'Mochila',name:'Red Backpack'}]};
  expect(I.grantStarterBag(owns)).toBeNull();expect(owns.equip.Mochila).toBeUndefined();
 });
});
