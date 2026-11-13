import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const scope: any = {};
runInNewContext(readFileSync("public/items.js", "utf8"), scope);
const L = scope.LawlItems;

describe("Treinadora: tempo de treino", () => {
  it("1 hora custa 1.200.000 de ouro", () => {
    const p = { gold: 1_200_000, gems: 0, trainTime: 0 };
    expect(L.buyTraining(p, "t60g").ok).toBe(true);
    expect(p.gold).toBe(0);
    expect(p.trainTime).toBe(3600);
  });
  it("1 hora custa 60 gemas", () => {
    const p = { gold: 0, gems: 60, trainTime: 120 };
    expect(L.buyTraining(p, "t60d").ok).toBe(true);
    expect(p.gems).toBe(0);
    expect(p.trainTime).toBe(3720);
  });
  it("sem saldo suficiente não compra nem dá tempo", () => {
    const p = { gold: 1_199_999, gems: 59, trainTime: 0 };
    expect(L.buyTraining(p, "t60g")).toMatchObject({ ok: false, reason: "gold" });
    expect(L.buyTraining(p, "t60d")).toMatchObject({ ok: false, reason: "gems" });
    expect(p).toEqual({ gold: 1_199_999, gems: 59, trainTime: 0 });
  });
});
