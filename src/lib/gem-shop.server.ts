import { isPaidEnough } from "./gem-packs";

const API = "https://api.checkout.infinitepay.io";

export function infinitePayHandle(): string {
  const handle = (process.env["INFINITEPAY_HANDLE"] ?? "").trim().replace(/^\$/, "");
  if (!handle) throw new Error("Pagamento automático ainda não configurado.");
  return handle;
}

export async function createInfinitePayLink(body: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${API}/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle: infinitePayHandle(), ...body }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`InfinitePay link failed [${res.status}]: ${text}`);
    throw new Error(`Não foi possível criar o pagamento (${res.status}).`);
  }
  const url = (JSON.parse(text) as { url?: unknown }).url;
  if (typeof url !== "string" || !url.startsWith("https://")) {
    console.error(`InfinitePay link without url: ${text}`);
    throw new Error("Não foi possível criar o pagamento.");
  }
  return url;
}

export type SettleInput = { orderId: string; slug: string; transactionNsu: string; receiptUrl?: string | null | undefined };

/** Confirms the payment with InfinitePay and credits the order's character exactly once. */
export async function settleGemOrder(input: SettleInput): Promise<"credited" | "unassigned" | "pending" | "missing"> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order } = await supabaseAdmin.from("lawl_gem_orders").select("id,status,amount_cents").eq("id", input.orderId).maybeSingle();
  if (!order) return "missing";
  if (order.status !== "pending") return order.status as "credited" | "unassigned";
  const res = await fetch(`${API}/payment_check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle: infinitePayHandle(), order_nsu: input.orderId, transaction_nsu: input.transactionNsu, slug: input.slug }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`InfinitePay payment_check failed [${res.status}]: ${text}`);
    return "pending";
  }
  const check = JSON.parse(text) as { success?: unknown; paid?: unknown; amount?: unknown; paid_amount?: unknown; capture_method?: unknown };
  if (!isPaidEnough(check, order.amount_cents)) return "pending";
  const { data, error } = await supabaseAdmin.rpc("lawl_gem_order_credit", {
    p_order: input.orderId,
    p_paid_cents: check.amount as number,
    p_slug: input.slug,
    p_nsu: input.transactionNsu,
    p_method: typeof check.capture_method === "string" ? check.capture_method : "",
    p_receipt: input.receiptUrl ?? "",
  });
  if (error) {
    console.error("Gem credit failed:", error.message);
    throw new Error("Falha ao creditar as gemas.");
  }
  return ((data as { status?: string } | null)?.status as "credited" | "unassigned") ?? "credited";
}
