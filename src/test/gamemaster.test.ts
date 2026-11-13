import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const scope = {} as { LawlGameMaster: { eligible: (status: unknown, player: unknown) => boolean; validate: (action: string, data: unknown) => unknown } };
runInNewContext(readFileSync("public/gamemaster.js", "utf8"), scope);
const gm = scope.LawlGameMaster;
describe("exclusive GameMaster", () => {
  it("enables powers for the authorized GameMaster", () => {
    expect(gm.eligible({ isGm: true }, { name: "GameMaster" })).toBe(true);
  });
  it("does not grant another account powers based on its character name", () => {
    expect(gm.eligible({ isGm: false }, { name: "GameMaster" })).toBe(false);
  });
  it("does not alter another character on the owner's account", () => {
    expect(gm.eligible({ isGm: true }, { name: "Knight" })).toBe(false);
  });
  it("does not trust a saved gm flag", () => {
    expect(gm.eligible(undefined, { name: "GameMaster", gm: true })).toBe(false);
  });
  it("lets the GameMaster create any potion from the catalog, up to 1000 at a time", () => {
    expect(() => gm.validate("item", { kind: "potion", potion: "mp5", quantity: 1000 })).not.toThrow();
    expect(() => gm.validate("item", { kind: "potion", potion: "hp5", quantity: 1 })).not.toThrow();
    expect(() => gm.validate("item", { kind: "potion", potion: "mp5", quantity: 1001 })).toThrow();
    expect(() => gm.validate("item", { kind: "potion", potion: "<x>", quantity: 1 })).toThrow();
  });
  it("lets the GameMaster create any rune from the catalog, up to 1000 at a time", () => {
    expect(() => gm.validate("item", { kind: "rune", rune: "rearthblast", quantity: 1000 })).not.toThrow();
    expect(() => gm.validate("item", { kind: "rune", rune: "rfield", quantity: 1 })).not.toThrow();
    expect(() => gm.validate("item", { kind: "rune", rune: "rfire", quantity: 1001 })).toThrow();
    expect(() => gm.validate("item", { kind: "rune", rune: "<x>", quantity: 1 })).toThrow();
  });
  it("rejects unauthorized action names", () => {
    expect(() => gm.validate("promote", {})).toThrow();
  });
  it("accepts level and skill grants within limits and rejects out-of-range ones", () => {
    const target = "11111111-1111-1111-1111-111111111111";
    expect(() => gm.validate("grant", { target, levels: 500, skill: "magic", amount: 200 })).not.toThrow();
    expect(() => gm.validate("grant", { target, levels: 501, skill: "magic", amount: 0 })).toThrow();
    expect(() => gm.validate("grant", { target, levels: 0, skill: "magic", amount: 201 })).toThrow();
  });
});
