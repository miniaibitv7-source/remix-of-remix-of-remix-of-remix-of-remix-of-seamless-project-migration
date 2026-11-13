import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';

const scope:any={};runInNewContext(readFileSync('public/stances.js','utf8'),scope);
const S=scope.LawlStances;
describe('combat stances',()=>{
 it('full attack deals 30% more damage and takes 20% more',()=>{expect(S.dealt(100,'attack')).toBe(130);expect(S.taken(100,'attack')).toBe(120)});
 it('balanced keeps damage unchanged',()=>{expect(S.dealt(100,'balanced')).toBe(100);expect(S.taken(100,'balanced')).toBe(100)});
 it('full defense deals 30% less damage and takes 25% less',()=>{expect(S.dealt(100,'defense')).toBe(70);expect(S.taken(100,'defense')).toBe(75)});
 it('unknown or missing stance falls back to balanced',()=>{expect(S.normalize(undefined)).toBe('balanced');expect(S.normalize('hack')).toBe('balanced')});
 it('never reduces a hit below 1',()=>{expect(S.taken(1,'defense')).toBe(1)});
});
