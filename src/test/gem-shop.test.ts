import { afterEach, describe, expect, it, vi } from "vitest";
import { createInfinitePayLink, infinitePayHandle, settleGemOrder } from "@/lib/gem-shop.server";
import { isPaidEnough } from "@/lib/gem-packs";

const db = vi.hoisted(() => ({ rpc: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: db.maybeSingle }) }) }),
    rpc: db.rpc,
  },
}));

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetAllMocks(); });

describe("InfinitePay gem purchases", () => {
  it("uses the owner's miniaibit tag when creating payment links", async () => {
    vi.stubEnv("INFINITEPAY_HANDLE", "miniaibit");
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: "https://checkout.infinitepay.io/payment" })));
    vi.stubGlobal("fetch", fetcher);
    expect(infinitePayHandle()).toBe("miniaibit");
    await createInfinitePayLink({ order_nsu: "order-1", items: [{ quantity: 1, price: 490 }] });
    const call = fetcher.mock.calls[0];
    expect(call).toBeDefined();
    if (!call) throw new Error("Payment request was not sent");
    expect(JSON.parse(call[1].body).handle).toBe("miniaibit");
  });

  it("rejects notices without an independently confirmed payment", async () => {
    vi.stubEnv("INFINITEPAY_HANDLE", "miniaibit");
    db.maybeSingle.mockResolvedValue({ data: { status: "pending", amount_cents: 490 } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, paid: false, amount: 490 }))));
    expect(await settleGemOrder({ orderId: "order-1", slug: "invoice", transactionNsu: "transaction" })).toBe("pending");
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("delivers gems only through the atomic credit function after confirmation", async () => {
    vi.stubEnv("INFINITEPAY_HANDLE", "miniaibit");
    db.maybeSingle.mockResolvedValue({ data: { status: "pending", amount_cents: 490 } });
    db.rpc.mockResolvedValue({ data: { status: "credited" }, error: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, paid: true, amount: 490, capture_method: "pix" }))));
    expect(await settleGemOrder({ orderId: "order-1", slug: "invoice", transactionNsu: "transaction" })).toBe("credited");
    expect(db.rpc).toHaveBeenCalledWith("lawl_gem_order_credit", {
      p_order: "order-1", p_paid_cents: 490, p_slug: "invoice", p_nsu: "transaction", p_method: "pix", p_receipt: "",
    });
  });

  it("does not grant gems again for a previously credited order", async () => {
    db.maybeSingle.mockResolvedValue({ data: { status: "credited", amount_cents: 490 } });
    expect(await settleGemOrder({ orderId: "order-1", slug: "invoice", transactionNsu: "transaction" })).toBe("credited");
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("rejects a payment below the recorded order price", () => {
    expect(isPaidEnough({ success: true, paid: true, amount: 489 }, 490)).toBe(false);
    expect(isPaidEnough({ success: true, paid: true, amount: 490 }, 490)).toBe(true);
  });
});