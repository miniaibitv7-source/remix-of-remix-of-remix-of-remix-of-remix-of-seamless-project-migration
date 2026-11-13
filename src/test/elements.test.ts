import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const scope:any={};runInNewContext(readFileSync('public/spells.js','utf8'),scope);
const S=scope.LawlSpells;

describe('monster elements from the wiki',()=>{
 it('Demônio takes 0% fire, 115% ice, 90% death and 104% physical (wiki Demon)',()=>{
  expect(['fire','ice','death','phys'].map(e=>S.resist('Demônio',e))).toEqual([0,1.15,.9,1.04]);
 });
 it('Vampiro resists physical (75%) and death (30%) but is weak to fire (110%)',()=>{
  expect(['phys','death','fire'].map(e=>S.resist('Vampiro',e))).toEqual([.75,.3,1.1]);
 });
 it('sea monsters have resistances too: Guardião do Farol is immune to fire',()=>{
  expect(S.resist('Guardião do Farol','fire')).toBe(0);expect(S.resist('Espectro das Marés','phys')).toBe(.7);
 });
 it('an enchanted hit splits by element: 85% fire + 20% physical against Dragão keeps only the physical part',()=>{
  expect(S.resistMix('Dragão',105,{fire:85,phys:20})).toBe(23);
  expect(S.resistMix('Demônio',100,{fire:100})).toBe(0);
  expect(S.resistMix('Rato',100,{phys:100})).toBe(100);
 });
});
