import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const scope:any={};runInNewContext(readFileSync('public/items.js','utf8'),scope);
const I=scope.LawlItems;
const fresh=()=>({...I.BOOTS.find((e:any)=>e.name==='Enchanted Boots')});

describe('Enchanted Boots charge',()=>{
 it('a newly obtained pair has 4 hours of charge',()=>{
  expect(I.chargeOf(fresh())).toBe(4*3600);
 });
 it('while worn regenerates +1 life and +2 mana every 2 seconds and drains the same time',()=>{
  const e=fresh(),r=I.bootsRegen({Botas:e},2);
  expect([r.hp,r.mp]).toEqual([1,2]);
  expect(I.chargeOf(e)).toBe(4*3600-2);
 });
 it('a pair in the backpack does not drain or regenerate',()=>{
  const e=fresh();expect(I.bootsRegen({},10)).toBeNull();expect(I.chargeOf(e)).toBe(4*3600);
 });
 it('stops regenerating when the charge runs out',()=>{
  const e={...fresh(),charge:1},r=I.bootsRegen({Botas:e},5);
  expect(r.emptied).toBe(true);expect([r.hp,r.mp]).toEqual([0.5,1]);
  expect(I.bootsRegen({Botas:e},2)).toBeNull();
 });
 it('Selene recharges a carried pair to full for 10.000 gold',()=>{
  const e={...fresh(),charge:0},pl={gold:12000,equip:{Botas:e},bag:[]};
  expect(I.rechargeBoots(pl,e).ok).toBe(true);
  expect([pl.gold,I.chargeOf(e)]).toEqual([2000,4*3600]);
 });
 it('no recharge without enough gold or when already full',()=>{
  const e={...fresh(),charge:100},pl={gold:9999,equip:{},bag:[e]};
  expect(I.rechargeBoots(pl,e).error).toBeTruthy();expect(pl.gold).toBe(9999);
  const f=fresh(),rich={gold:50000,equip:{Botas:f},bag:[]};
  expect(I.rechargeBoots(rich,f).error).toBeTruthy();expect(rich.gold).toBe(50000);
 });
 it('ordinary boots have no charge',()=>{
  expect(I.chargeOf(I.BOOTS.find((e:any)=>e.name==='Hasty Boots'))).toBeNull();
 });
});
