import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const scope:any={};runInNewContext(readFileSync('public/items.js','utf8'),scope);
const I=scope.LawlItems;
const html=readFileSync('public/reinos.html','utf8');

describe('removed tier equipment (Nv 1 Aprendiz to Nv 100 Lenda)',()=>{
 it('marks every tier piece, necklace and backpack as removed',()=>{
  for(const n of ['Espada de Aprendiz','Armadura de Bronze','Elmo de Ferro','Calças de Aço','Botas de Prata','Anel de Mithril','Broquel de Runas','Grimório de Dragão','Totem de Titã','Cajado de Abismo','Sandálias de Lenda'])
   expect(I.isRetired({name:n,slot:'Arma',tier:0})).toBe(true);
  for(const e of I.extraGear([[1,'Aprendiz'],[100,'Lenda']]))expect(I.isRetired(e)).toBe(true);
  expect(I.isRetired({name:'Colar de Lenda',slot:'Colar'})).toBe(true);
 });
 it('keeps every wiki shield and spellbook',()=>{
  for(const e of I.shieldGear())expect(I.isRetired(e)).toBe(false);
 });
 it('removes them from equipped, backpack and depot without touching shields, loot or potions',()=>{
  const p:any={equip:{Arma:{name:'Espada de Lenda',slot:'Arma',tier:10},Escudo:{name:'Dragon Shield',slot:'Escudo',tier:null}},
   bag:[{name:'Mochila de Bronze',slot:'Mochila',tier:1},{name:'Chain Shield',slot:'Escudo',tier:null}],
   depot:{items:[{name:'Anel de Ferro',slot:'Anel',tier:2}],loot:{'Teia':3}},loot:{'Teia':2},hpPot:5};
  expect(I.purgeRetired(p)).toBe(3);
  expect(Object.keys(p.equip)).toEqual(['Escudo']);
  expect(p.bag.map((e:any)=>e.name)).toEqual(['Chain Shield']);
  expect(p.depot.items).toEqual([]);
  expect([p.loot.Teia,p.depot.loot.Teia,p.hpPot]).toEqual([2,3,5]);
 });
 it('old GameMaster gifts keep resolving to the same shields; removed gear delivers nothing',()=>{
  const a=html.indexOf('const TIERS='),b=html.indexOf('\n',html.indexOf('const gearOn='));
  const ctx:any={LawlItems:I};runInNewContext(html.slice(a,b)+';this.equipment=equipment;this.gearOn=gearOn;',ctx);
  expect(ctx.equipment.length).toBe(308+88+35+144+143+75+23+49+46+46+14+5+11);
  expect(ctx.equipment[975].name).toBe('Crude Ring');expect(ctx.equipment[976].name).toBe('Old Ring');expect(ctx.equipment[986].name).toBe('Aggressive Ring');
  expect(ctx.equipment[816].name).toBe('Black Helmet');expect(ctx.equipment[865].name).toBe('Black Armor');expect(ctx.equipment[911].name).toBe('Black Legs');
  expect(ctx.equipment[718].name).toBe('Training Wand');expect(ctx.equipment[793].name).toBe('Green Backpack');expect(ctx.equipment[815].name).toBe('Oblivion Backpack');
  expect(ctx.equipment[396].name).toBe('Wooden Shield');expect(ctx.equipment[397].name).toBe('Chain Shield');
  expect(ctx.equipment[430].name).toBe('Oblivion Spellbook');expect(ctx.equipment[431].name).toBe('Training Knife');
  expect(ctx.gearOn(ctx.equipment[396])).toBe(true);
  for(let i=0;i<396;i++)expect(ctx.gearOn(ctx.equipment[i])).toBe(false);
  expect(html).toContain('if(k==="equip"&&gearOn(equipment[d.index])){');
 });
});
