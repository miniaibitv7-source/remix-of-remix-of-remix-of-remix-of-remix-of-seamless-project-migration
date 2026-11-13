import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const scope: any = {};
runInNewContext(readFileSync('public/qrcode.js', 'utf8'), scope);
runInNewContext(readFileSync('public/pix.js', 'utf8'), scope);
const pix = scope.LawlPix;

describe('PIX gem payments', () => {
  it('sends every payment to the owner phone key 27999753036', () => {
    expect(pix.KEY).toBe('+5527999753036');
    expect(pix.payload({ amount: 4.9, txid: 'LAWL1' })).toContain('0014br.gov.bcb.pix0114+5527999753036');
  });
  it('charges the exact pack price in reais', () => {
    expect(pix.payload({ amount: 4.9, txid: 'A' })).toContain('54044.90');
    expect(pix.payload({ amount: 49.9, txid: 'A' })).toContain('540549.90');
    expect(() => pix.payload({ amount: 0, txid: 'A' })).toThrow();
  });
  it('uses the standard PIX checksum', () => {
    expect(pix.crc16('123456789')).toBe('29B1');
    const code = pix.payload({ amount: 9.9, txid: 'LAWLTEST', desc: '110 gemas Herói' });
    expect(code.slice(-4)).toBe(pix.crc16(code.slice(0, -4)));
  });
  it('uses the standard static txid so the receiving bank accepts it', () => {
    const code = pix.payload({ amount: 4.9, desc: 'Pedido LAWLABC123' });
    expect(code).toContain('62070503***');
    expect(code).toContain('0217Pedido LAWLABC123');
  });
  it('generates a different order code each time', () => {
    const a = pix.newTxid(1), b = pix.newTxid(1);
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThanOrEqual(25);
  });
});
