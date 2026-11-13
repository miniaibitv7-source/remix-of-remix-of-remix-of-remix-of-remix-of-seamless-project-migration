import { describe, expect, it } from "vitest";
import { rememberGemCheckout, takeGemCheckout } from "@/lib/gem-checkout-return";

function store() {
  const values = new Map<string, string>();
  return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
}

describe("Same-tab gem checkout return", () => {
  it("resumes the purchasing character once after leaving for InfinitePay", () => {
    const storage = store();
    rememberGemCheckout(storage, { userId: "buyer", slot: 3, orderId: "order" });
    expect(takeGemCheckout(storage, "buyer")).toEqual({ userId: "buyer", slot: 3, orderId: "order" });
    expect(takeGemCheckout(storage, "buyer")).toBeNull();
  });
  it("does not resume another account's character", () => {
    const storage = store();
    rememberGemCheckout(storage, { userId: "buyer", slot: 3, orderId: "order" });
    expect(takeGemCheckout(storage, "other")).toBeNull();
    expect(takeGemCheckout(storage, "buyer")?.slot).toBe(3);
  });
});