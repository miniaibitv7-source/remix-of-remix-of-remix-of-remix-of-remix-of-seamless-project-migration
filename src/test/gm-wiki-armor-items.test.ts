import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const scope:any={};runInNewContext(readFileSync('public/items.js','utf8'),scope);
const html=readFileSync('public/reinos.html','utf8');
const slice=(from:string,to:string)=>{const a=html.indexOf(from);return html.slice(a,html.indexOf(to,a)+to.length)};

describe('GameMaster item list',()=>{
 it('has the wiki helmets, armors and legs as their own stages, all giftable',()=>{
  const a=html.indexOf('const TIERS='),b=html.indexOf('\n',html.indexOf('const gearOn='));
  const ctx:any={LawlItems:scope.LawlItems,monsters:[],BOSSES:[],lootPrices:{},LOOT_IC:{},LawlSeafaring:{monsters:[]},LawlMounts:{catalog:[]},
   vocations:{knight:{name:'Knight'},paladin:{name:'Paladin'},sorcerer:{name:'Sorcerer'},druid:{name:'Druid'}}};
  runInNewContext(html.slice(a,b)+';'+slice('const SLOT_ICON=',';')+slice('function gmItemStages(){','return st}')+';this.st=gmItemStages();this.equipment=equipment;',ctx);
  const stage=(l:string)=>ctx.st.find((g:any)=>g.label===l);
  for(const [l,slot,n] of [['⛑️ Capacetes','Capacete',49],['🥋 Armaduras','Armadura',46],['👖 Calças','Calças',46]] as const){
   const g=stage(l);expect(g.items.length).toBe(n);
   for(const it of g.items){expect(it.d.kind).toBe('equip');expect(ctx.equipment[it.d.index].slot).toBe(slot);expect(it.d.index).toBeLessThanOrEqual(999)}
  }
  expect(stage('⛑️ Capacetes').items.map((it:any)=>ctx.equipment[it.d.index].name)).toContain('Fiery Helmet');
 });
 it('has every amulet and ring as their own stages, all giftable',()=>{
  const a=html.indexOf('const TIERS='),b=html.indexOf('\n',html.indexOf('const gearOn='));
  const ctx:any={LawlItems:scope.LawlItems,monsters:[],BOSSES:[],lootPrices:{},LOOT_IC:{},LawlSeafaring:{monsters:[]},LawlMounts:{catalog:[]},vocations:{knight:{name:'Knight'},paladin:{name:'Paladin'},sorcerer:{name:'Sorcerer'},druid:{name:'Druid'}}};
  runInNewContext(html.slice(a,b)+';'+slice('const SLOT_ICON=',';')+slice('function gmItemStages(){','return st}')+';this.st=gmItemStages();this.equipment=equipment;',ctx);
  const names=(l:string,slot:string)=>ctx.st.find((g:any)=>g.label===l).items.map((it:any)=>{expect(it.d.kind).toBe('equip');expect(it.d.index).toBeLessThanOrEqual(999);expect(ctx.equipment[it.d.index].slot).toBe(slot);return ctx.equipment[it.d.index].name});
  expect(names('📿 Amuletos e colares','Colar')).toEqual(scope.LawlItems.AMULETS.map((e:any)=>e.name));
  expect(names('💍 Anéis','Anel')).toEqual(scope.LawlItems.RINGS.map((e:any)=>e.name));
 });
 it('has the wiki regular items, creature products and ammunition',()=>{
  const a=html.indexOf('const TIERS='),b=html.indexOf('\n',html.indexOf('const gearOn='));
  const ctx:any={LawlItems:scope.LawlItems,monsters:[],BOSSES:[],lootPrices:{},LOOT_IC:{},LawlSeafaring:{monsters:[]},LawlMounts:{catalog:[]},vocations:{knight:{name:'Knight'},paladin:{name:'Paladin'},sorcerer:{name:'Sorcerer'},druid:{name:'Druid'}}};
  runInNewContext(html.slice(a,b)+';'+slice('const SLOT_ICON=',';')+slice('function gmItemStages(){','return st}')+';this.st=gmItemStages();',ctx);
  const stage=(l:string)=>ctx.st.find((g:any)=>g.label===l);
  expect(stage('📦 Itens comuns (wiki)').items.length).toBe(70);
  expect(stage('🐾 Produtos de criatura (wiki)').items.length).toBe(86);
  expect(stage('🐾 Produtos de criatura (wiki)').items.find((it:any)=>it.d.name==='Demon Horn').d).toEqual({kind:'loot',name:'Demon Horn'});
  const ammo=stage('🏹 Munição').items;expect(ammo.length).toBe(8);
  for(const it of ammo){expect(it.d.kind).toBe('rune');expect(it.d.rune).toMatch(/^[a-z0-9]{1,16}$/)}
  for(const it of stage('📦 Itens comuns (wiki)').items)expect(it.d.name.length).toBeLessThanOrEqual(40);
 });
});
