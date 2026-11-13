import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const game = readFileSync("public/reinos.html", "utf8");
const items: any = {};
runInNewContext(readFileSync("public/items.js", "utf8"), items);
const boots = (n: string) => items.LawlItems.BOOTS.find((e: any) => e.name === n);

function setup(equip: Record<string, unknown>) {
  const scope: any = { p: { level: 100, hasteUntil: 0, equip }, isGM: () => false, LawlItems: items.LawlItems };
  runInNewContext(game.slice(game.indexOf("function characterSpeed("), game.indexOf("function equipStat(")), scope);
  return scope;
}

describe("boots speed bonus (lawlmmorpg.com wiki)", () => {
  it("Hasty Boots adds +30 to the speed shown to the player", () => {
    expect(setup({}).playerSpeed()).toBe(200);
    expect(setup({ Botas: boots("Hasty Boots") }).playerSpeed()).toBe(230);
  });
  it("the walking step uses the same speed that is shown", () => {
    const s = setup({ Botas: boots("Dragon Boots") });
    expect(s.playerSpeed()).toBe(210);
    expect(s.playerStepMs(0)).toBe(Math.round(150000 / (2 * 210)));
  });
  it("boots without speed on the wiki (Iron Boots) do not change speed", () => {
    expect(setup({ Botas: boots("Iron Boots") }).playerSpeed()).toBe(200);
  });
});
