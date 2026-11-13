import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const game = readFileSync("public/reinos.html", "utf8");
const itemScope: any = {};
runInNewContext(readFileSync("public/items.js", "utf8"), itemScope);
const LawlItems = itemScope.LawlItems;

function setup() {
  const scope: any = {
    LawlItems,
    p: { level: 200, voc: "knight", hp: 100, mp: 0, hpPot: 0, mpPot: 0, cons: {}, x: 0, y: 0 },
    maxHp: () => 5000,
    maxMp: () => 500,
    isGM: () => false,
    say: vi.fn(),
    pop: vi.fn(),
    save: vi.fn(),
    renderUI: vi.fn(),
    clock: 100,
    sNow: () => scope.clock,
  };
  const heal = game.indexOf("function healSelf(");
  runInNewContext(game.slice(heal, game.indexOf("function floorWalk(", heal)), scope);
  const potion = game.indexOf("function potion(");
  runInNewContext(game.slice(potion, game.indexOf("/* Itens de items.js", potion)), scope);
  const use = game.indexOf("function useItem(");
  runInNewContext(game.slice(use, game.indexOf("function autoHeal(", use)), scope);
  return scope;
}

describe("wiki health potions in gameplay", () => {
  it.each([
    ["hp", 85],
    ["hp2", 160],
    ["hp3", 300],
    ["hp4", 500],
    ["hp5", 800],
  ])("%s heals its catalogued amount and consumes exactly one", (id, healing) => {
    const s = setup();
    if (id === "hp") s.p.hpPot = 2;
    else s.p.cons[id] = 2;
    s.useItem(id);
    expect(s.p.hp).toBe(100 + healing);
    expect(id === "hp" ? s.p.hpPot : s.p.cons[id]).toBe(1);
    expect(s.save).toHaveBeenCalledTimes(1);
  });

  it("reports only the healing actually received and removes an empty stack", () => {
    const s = setup();
    s.maxHp = () => 200;
    s.p.hp = 150;
    s.p.cons.hp2 = 1;
    s.useItem("hp2");
    expect(s.p.hp).toBe(200);
    expect(s.pop).toHaveBeenCalledWith(0, 0, "+50", "#62c85d");
    expect(s.p.cons).not.toHaveProperty("hp2");
  });

  it("rejects a low-level character without changing health or inventory", () => {
    const s = setup();
    s.p.level = 49;
    s.p.cons.hp2 = 1;
    s.useItem("hp2");
    expect(s.p.hp).toBe(100);
    expect(s.p.cons.hp2).toBe(1);
    expect(s.save).not.toHaveBeenCalled();
  });

  it("rejects the wrong vocation without changing health or inventory", () => {
    const s = setup();
    s.p.voc = "sorcerer";
    s.p.cons.hp5 = 1;
    s.useItem("hp5");
    expect(s.p.hp).toBe(100);
    expect(s.p.cons.hp5).toBe(1);
    expect(s.save).not.toHaveBeenCalled();
  });

  it("does not consume or save when the basic potion is absent", () => {
    const s = setup();
    s.potion("hp");
    expect(s.p.hp).toBe(100);
    expect(s.p.hpPot).toBe(0);
    expect(s.save).not.toHaveBeenCalled();
  });
});

describe("potion delay (exhaust)", () => {
  it("waits one second between potions", () => {
    expect(LawlItems.POTION_DELAY).toBe(1);
  });

  it("blocks a second health potion within the delay without consuming it", () => {
    const s = setup();
    s.p.cons.hp2 = 3;
    s.useItem("hp2");
    s.clock += 0.5;
    s.useItem("hp2");
    expect(s.p.cons.hp2).toBe(2);
    expect(s.p.hp).toBe(260);
    s.clock += 0.5;
    s.useItem("hp2");
    expect(s.p.cons.hp2).toBe(1);
  });

  it("shares the delay between health and mana potions, including the original ones", () => {
    const s = setup();
    s.p.hpPot = 1;
    s.p.mpPot = 1;
    s.potion("hp");
    s.potion("mp");
    expect(s.p.hpPot).toBe(0);
    expect(s.p.mpPot).toBe(1);
    expect(s.p.mp).toBe(0);
    s.clock += 1;
    s.potion("mp");
    expect(s.p.mpPot).toBe(0);
  });

  it("does not start the delay when the potion could not be used", () => {
    const s = setup();
    s.p.level = 49;
    s.p.cons.hp2 = 1;
    s.p.hpPot = 1;
    s.useItem("hp2");
    s.potion("hp");
    expect(s.p.hpPot).toBe(0);
  });

  it("does not delay food", () => {
    const s = setup();
    s.p.cons.hp2 = 1;
    s.p.cons.bread = 1;
    s.useItem("hp2");
    s.useItem("bread");
    expect(s.p.cons).not.toHaveProperty("bread");
  });
});
