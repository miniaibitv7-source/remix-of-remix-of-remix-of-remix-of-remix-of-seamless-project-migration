import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const game = readFileSync("public/reinos.html", "utf8");
const a = game.indexOf("function stepAuto(");
const stepAutoSrc = game.slice(a, game.indexOf("(function mmLoop", a));

function arrive(npc: { id: string; x: number; y: number }) {
  const talked: string[] = [];
  const said: string[] = [];
  const scope = {
    p: { x: 1, y: 1, z: 0, dir: "south" }, autoPath: [[2, 1]], autoDest: [2, 1], autoAt: 0, move: [0, 0], modalKind: "",
    pendingTalk: npc.id, npcs: [npc], performance: { now: () => 10000 }, playerStepMs: () => 100,
    walkable: () => true, occupied: () => false, checkStairs: () => {}, renderUI: () => {}, save: () => {},
    say: (t: string) => said.push(t), dist: (q: { x: number; y: number }, r: { x: number; y: number }) => Math.max(Math.abs(q.x - r.x), Math.abs(q.y - r.y)),
    talkTo: (n: { id: string }) => talked.push(n.id),
  };
  runInNewContext(stepAutoSrc + ";stepAuto();", scope);
  return { scope, talked, said };
}

describe("tap an NPC to talk", () => {
  it("opens the conversation when the walk ends next to the NPC", () => {
    const r = arrive({ id: "potions", x: 3, y: 1 });
    expect(r.talked).toEqual(["potions"]);
    expect(r.scope.pendingTalk).toBeNull();
  });
  it("does not open the conversation if the walk ends away from the NPC", () => {
    const r = arrive({ id: "potions", x: 6, y: 1 });
    expect(r.talked).toEqual([]);
    expect(r.said).toContain("Não deu para chegar perto.");
  });
  it("cancels the pending conversation when the player moves manually", () => {
    const talked: string[] = [];
    const scope = { p: { x: 1, y: 1 }, autoPath: [[2, 1]], autoDest: [2, 1], move: [1, 0], modalKind: "", pendingTalk: "smith", talkTo: (n: { id: string }) => talked.push(n.id) };
    runInNewContext(stepAutoSrc + ";stepAuto();", scope);
    expect(scope.pendingTalk).toBeNull();
    expect(talked).toEqual([]);
  });
});
