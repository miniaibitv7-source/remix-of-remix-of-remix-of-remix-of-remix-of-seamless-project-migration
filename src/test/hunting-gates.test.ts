import { describe, expect, it } from "vitest";
import { buildWorld, flood, PREMIUM_WALK } from "./world-harness";

const s = buildWorld(), M = s.maps[0];
const reach = flood(M, 30, 30, PREMIUM_WALK);

describe("hunting area entrances", () => {
  it("every gate of every hunting area is 3 SQM wide, framed by its border", () => {
    for (const Z of s.ZONES) {
      for (const y of [Z.y1, Z.y2]) expect([-1, 0, 1].map(k => M[y][Z.cx + k])).toEqual([0, 0, 0]);
      for (const x of [Z.x1, Z.x2]) expect([-1, 0, 1].map(k => M[Z.cy + k][x])).toEqual([0, 0, 0]);
      expect(M[Z.y1][Z.cx - 2]).not.toBe(0);
      expect(M[Z.y1][Z.cx + 2]).not.toBe(0);
    }
  });
  it("Lawl hunts start well south of the city houses", () => {
    const lawl = s.ZONES.filter((z: any) => z.city === "Lawl");
    expect(lawl).toHaveLength(12);
    const lowestHouse = Math.max(...s.HOUSES.slice(0, 22).map((r: number[]) => r[1]! + r[3]! - 1));
    for (const z of lawl) expect(z.y1 - lowestHouse).toBeGreaterThanOrEqual(10);
  });
  it("every hunting area stairs is reachable on foot from the Lawl temple", () => {
    for (const Z of s.ZONES) expect(reach(Z.cx, Z.cy)).toBe(true);
  });
});
