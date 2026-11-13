import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const scope = {} as { LawlGameMaster: { validate: (action: string, data: unknown) => unknown } };
runInNewContext(readFileSync("public/gamemaster.js", "utf8"), scope);
const gm = scope.LawlGameMaster;

describe("GM item creation", () => {
  it("accepts gear appended after the original 308 items (necklaces, backpacks, wiki shields)", () => {
    expect(() => gm.validate("item", { kind: "equip", index: 308, quantity: 1 })).not.toThrow();
    expect(() => gm.validate("item", { kind: "equip", index: 400, quantity: 1 })).not.toThrow();
  });
  it("still rejects negative item indexes", () => {
    expect(() => gm.validate("item", { kind: "equip", index: -1, quantity: 1 })).toThrow();
  });
});
